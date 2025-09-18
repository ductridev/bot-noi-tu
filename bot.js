const handleExit = async () => {
    process.exit();
};
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown:', err.message, err.stack);
});
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('SIGQUIT', handleExit);

const { Client, GatewayIntentBits, Collection, PermissionsBitField, MessageFlags } = require('discord.js')
const fs = require('fs')
require('dotenv').config()

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[OK] Connected to MongoDB'))
    .catch(err => console.error('[ERROR] MongoDB connection failed:', err));

const DictionaryEntry = require('./models/DictionaryEntry');
const ContributedWord = require('./models/ContributedWord');
const GuildConfig = require('./models/GuildConfig');
const GameSession = require('./models/GameSession');
const Ranking = require('./models/Ranking');
const BotStats = require('./models/BotStats');

const dictionary = require('./utils/dictionary');
const stats = require('./utils/stats')
const player = require('./utils/player')
const { setChannel } = require('./utils/channel');
const { withChannelLock } = require('./utils/lock');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})

// global config
const START_COMMAND = '!start', STOP_COMMAND = '!stop', RESET_COMMAND = '!reset', PREFIX = '!';

// We create a collection for commands
client.commands = new Collection()
const commandFiles = fs
    .readdirSync('./commands')
    .filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)

    // Conditionally load commands based on environment variables
    let shouldLoad = true;

    // Check Sic Bo commands
    if ((file === 'sicbo.js' || file === 'sicbo-config.js') && process.env.ENABLE_SICBO !== 'true') {
        shouldLoad = false;
        console.log(`[SKIP] Sic Bo command ${file} disabled by ENABLE_SICBO=false`);
    }

    // Check word suggestion command
    if (file === 'them-tu.js' && process.env.ENABLE_WORD_SUGGESTIONS !== 'true') {
        shouldLoad = false;
        console.log(`[SKIP] Word suggestions command ${file} disabled by ENABLE_WORD_SUGGESTIONS=false`);
    }

    if (shouldLoad) {
        client.commands.set(command.data.name, command)
        console.log(`[LOAD] Command ${command.data.name} loaded from ${file}`);
    }
}

// Events like ready.js (when the robot turns on), 
// or messageCreate.js (when a user/robot sends a message)
const eventFiles = fs
    .readdirSync('./events')
    .filter((file) => file.endsWith('.js'))

for (const file of eventFiles) {
    const event = require(`./events/${file}`)
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client))
    } else {
        client.on(event.name, (...args) => event.execute(...args, client))
    }
}

// LOGIC GAME
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Check if word chain game is enabled
    if (process.env.ENABLE_WORD_CHAIN !== 'true') return;

    await withChannelLock(message.channel.id, async () => {
        // 1) load channel config and language
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        const channelCfg = config?.channels?.find(c => c.channelId === message.channel.id);
        if (!channelCfg) return;
        const language = channelCfg.language;

        if (language === "en") {
            // Not allow if only have 1 character
            if (message.content.length < 2) return;
        }

        const checkDict = async (word) => {
            const lc = word.toLowerCase().trim();
            // Vietnamese must be exactly two tokens; English exactly one
            const parts = lc.split(/\s+/).filter(Boolean);
            if (language === 'vi') {
                if (parts.length !== 2) return false;
            } else { // 'en'
                if (parts.length !== 1) return false;
            }

            // pass language to getReportWords
            const blacklist = (await dictionary.getReportWords(language)).map(w => w.toLowerCase().trim());

            if (blacklist.includes(lc)) return false;

            // filter by language
            const exists =
                await DictionaryEntry.exists({ text: lc, language }) ||
                await ContributedWord.exists({ text: lc, language });

            return !!exists;
        };

        const sendMessageToChannel = (msg, channel_id) => {
            const ch = client.channels.cache.get(channel_id);
            if (ch) ch.send({ content: msg, flags: [4096] });
        };

        const sendAutoDeleteMessageToChannel = (msg, channel_id, seconds = 3) => {
            const ch = client.channels.cache.get(channel_id);
            if (ch) ch.send({ content: msg, flags: [4096] })
                .then(m => setTimeout(() => m.delete().catch(() => { }), 1000 * seconds));
        };

        const checkIfHaveAnswer = async (word, usedWords = []) => {
            let regex;
            if (language === 'vi') {
                // Vietnamese: last word ➞ first word
                const parts = word.split(' ');
                const last = parts[parts.length - 1];
                // Only match 2-word entries
                regex = new RegExp(`^${last} [^\s]+$`, 'i');
            } else {
                // English: last letter ➞ first letter
                const lastChar = word.slice(-1);
                regex = new RegExp(`^${lastChar}`, 'i');
            }

            // filter by language and ensure only 2-word entries for Vietnamese
            let match;
            if (language === 'vi') {
                match = await DictionaryEntry.findOne({ text: { $regex: regex }, language }) ||
                    await ContributedWord.findOne({ text: { $regex: regex }, language });
                // If no valid 2-word entry left, return a special value
                if (!match) return null;
                return !usedWords.includes(match.text);
            } else {
                match = await DictionaryEntry.findOne({ text: { $regex: regex }, language }) ||
                    await ContributedWord.findOne({ text: { $regex: regex }, language });
                if (!match) return false;
                return !usedWords.includes(match.text);
            }
        };

        const randomWord = async () => {
            const blacklist = (await dictionary.getReportWords(language)).map(w => w.toLowerCase().trim());

            // For Vietnamese pick two-word entries; for English pick single words
            const filter = {
                text: { $nin: blacklist },
                language
            };

            if (language === 'vi') {
                filter.text.$regex = /^\w+ \w+$/i;
            } else {
                filter.text.$regex = /^\w+$/i;
            }

            const count = await DictionaryEntry.countDocuments(filter);

            let attempt = 0;
            while (attempt < 10) {
                const rand = Math.floor(Math.random() * count);
                const [word] = await DictionaryEntry.find(filter).skip(rand).limit(1);

                if (!word) continue;

                const has = await checkIfHaveAnswer(word.text);
                if (has) return word.text;

                attempt++;
            }

            return await randomWord();
        };

        const startGame = async (guildId, channelId, language) => {
            const word = await randomWord();
            await GameSession.findOneAndUpdate(
                { guildId, channelId, language },      // include language
                {
                    running: true,
                    words: [word],
                    currentPlayer: {},
                    playerStats: [],
                    language
                },
                { upsert: true }
            );
            sendMessageToChannel(`Từ bắt đầu: **${word}**`, channelId);
        };

        const initWordData = async (guild, channel, language) => {
            await GameSession.findOneAndUpdate(
                { guildId: guild, channelId: channel, language },   // include language
                { running: false, currentPlayer: {}, words: [], language },
                { upsert: true }
            );
        };

        const updateRankingForUser = async (userId, newWin, newTrue, newTotal, guildId, name, avatar) => {
            // include channelId & language in your filter
            const rank = await Ranking.findOne({
                guildId,
                channelId: message.channel.id,
                language
            });
            if (!rank) {
                const newRank = new Ranking({
                    guildId,
                    channelId: message.channel.id,
                    language,
                    players: [{ id: userId, name, avatar, win: newWin, total: newTotal, true: newTrue }]
                });
                await newRank.save();
                return;
            }

            let player = rank.players.find(p => p.id === userId);
            if (!player) {
                player = { id: userId, name, avatar, win: newWin, total: newTotal, true: newTrue };
                rank.players.push(player);
            } else {
                player.win += newWin;
                player.true += newTrue;
                player.total += newTotal;
                player.name = name;
                player.avatar = avatar;
            }

            await rank.save();
        };

        // ensure this channel is registered
        const configEntry = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!configEntry?.channels?.some(c => c.channelId === message.channel.id)) return;

        // Handle prefix commands
        if (message.content.startsWith(PREFIX)) {
            const arg = message.content.trim().split(/\s+/)[1];
            if (arg === 'set') {
                if (!message.member.permissionsIn(message.channel.id).has(PermissionsBitField.Flags.ManageGuild)) {
                    return message.reply({ content: 'Bạn cần có quyền `MANAGE_GUILD` để dùng lệnh này', flags: MessageFlags.Ephemeral });
                }
                // pass language when saving channel
                await setChannel(message.guildId, message.channel.id, language);
                return message.reply({
                    content: `Đã chọn kênh **${message.channel.name}** làm kênh trò chơi (${language}).`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (message.content.toLowerCase().includes('bot') && ["ngu", "óc", "cặc", "lợn", "chó"].find(w => message.content.toLowerCase().includes(w))) {
            const messages = [
                "mày mới ngu thì có đó nhóc ác",
                "mày mới là con lợn đấy nhóc ác",
                "mày mới là con chó đấy nhóc ác",
                "phải sao ạ? phải chịuuuuuu"
            ]
            sendMessageToChannel(`<@${message.author.id}> ${messages[Math.floor(Math.random() * messages.length)]}`, message.channel.id);
            return;
        }

        // load or init session with language
        let session = await GameSession.findOne({
            guildId: message.guild.id,
            channelId: message.channel.id,
            language
        });
        if (!session) {
            await initWordData(message.guild.id, message.channel.id, language);
            session = await GameSession.findOne({ guildId: message.guild.id, channelId: message.channel.id, language });
        }

        let isRunning = session?.running ?? false;

        if (message.content.toLowerCase() === START_COMMAND.toLowerCase()) {
            if (!isRunning) {
                sendMessageToChannel('Trò chơi đã bắt đầu!', message.channel.id);
                await startGame(message.guild.id, message.channel.id, language);
            } else {
                sendMessageToChannel('Trò chơi vẫn đang tiếp tục. Bạn có thể dùng `!stop`', message.channel.id);
            }
            return;
        } else if (['!stop', '!reset'].includes(message.content.toLowerCase())) {

            if (isRunning) {
                sendMessageToChannel('Đã kết thúc lượt này! Lượt mới đã bắt đầu!', message.channel.id);
                await initWordData(message.guild.id, message.channel.id, language);
                // pass language here
                await stats.addRoundPlayedCount(language);
                await startGame(message.guild.id, message.channel.id, language);
            } else {
                sendMessageToChannel('Trò chơi chưa bắt đầu. Bạn có thể dùng `!start`', message.channel.id);
            }
            return;
        }

        if (!isRunning) return;

        let tu = message.content.trim().toLowerCase();
        const args1 = tu.split(/\s+/).filter(Boolean);
        tu = args1.join(' ');

        const words = session.words || [];
        const lastPlayerId = session.currentPlayer?.id;

        if (language === 'vi') {
            if (args1.length !== 2) return;
        } else {  // language === 'en'
            if (args1.length !== 1) return;
        }

        if (words.length > 0 && message.author.id === lastPlayerId) {
            message.react('❌');
            sendAutoDeleteMessageToChannel('Bạn đã trả lời lượt trước rồi, hãy đợi đối thủ!', message.channel.id);
            return;
        }

        const lastWord = words[words.length - 1];
        if (lastWord) {
            if (language === 'vi') {
                // Vietnamese: last word ➞ first word
                const expected = lastWord.split(/\s+/).pop();
                if (args1[0] !== expected) {
                    message.react('❌');
                    sendAutoDeleteMessageToChannel(
                        `Từ này không bắt đầu với tiếng \`${expected}\``,
                        message.channel.id
                    );
                    return;
                }
            } else {
                // English: last letter ➞ first letter
                const expectedChar = lastWord.slice(-1);
                if (args1[0].charAt(0) !== expectedChar) {
                    message.react('❌');
                    sendAutoDeleteMessageToChannel(
                        `Word must start with \`${expectedChar}\``,
                        message.channel.id
                    );
                    return;
                }
            }
        }

        if (words.includes(tu)) {
            message.react('❌');
            sendAutoDeleteMessageToChannel('Từ này đã được sử dụng!', message.channel.id);
            return;
        }

        if (!(await checkDict(tu))) {
            message.react('❌');
            await updateRankingForUser(
                message.author.id, 0, 0, 1,
                message.guild.id,
                message.author.displayName,
                message.author.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
            );
            return;
        }

        words.push(tu);

        message.react('✅');
        // pass language
        await stats.addWordPlayedCount(language);
        await updateRankingForUser(
            message.author.id, 0, 1, 1,
            message.guild.id,
            message.author.displayName,
            message.author.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
        );

        session.words = words;
        session.currentPlayer = { id: message.author.id, name: message.author.displayName };
        session.markModified('words');
        session.markModified('currentPlayer');

        if (language === 'en') {
            // Ensure playerStats is initialized
            if (!session.playerStats) {
                session.playerStats = [];
            }

            let stat = session.playerStats.find(p => p.id === message.author.id);
            if (!stat) {
                stat = {
                    id: message.author.id,
                    name: message.member.displayName,
                    correctCount: 1
                };
                session.playerStats.push(stat);
            } else {
                stat.correctCount += 1;
            }

            session.markModified('playerStats');

            // Check win condition
            if (stat.correctCount >= 50) {
                sendMessageToChannel(`${message.author.tag} đã chiến thắng sau khi trả lời đúng 50 từ tiếng Anh và nhận được 100 xu! Lượt mới đã bắt đầu!`, message.channel.id);

                await updateRankingForUser(
                    message.author.id, 1, 0, 0,
                    message.guild.id,
                    message.author.displayName,
                    message.author.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
                );

                await stats.addRoundPlayedCount(language);
                await initWordData(message.guild.id, message.channel.id, language);
                await startGame(message.guild.id, message.channel.id, language);
                await player.changeCoins(message.author.id, 100);
                return;
            }
        }

        await session.save();

        const hasAnswer = await checkIfHaveAnswer(tu, words || []);

        // For Vietnamese, if no valid 2-word entry left, restart the game
        if ((language === 'vi' && hasAnswer === null) || (language !== 'vi' && !hasAnswer)) {
            sendMessageToChannel(`${message.author.tag} đã chiến thắng sau ${words.length - 1} lượt và nhận được 100 xu! Lượt mới đã bắt đầu!`, message.channel.id);
            await updateRankingForUser(
                message.author.id, 1, 0, 0,
                message.guild.id,
                message.author.displayName,
                message.author.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg"
            );
            // pass language
            await stats.addRoundPlayedCount(language);
            await initWordData(message.guild.id, message.channel.id, language);
            await startGame(message.guild.id, message.channel.id, language);
            await player.changeCoins(message.author.id, 100);
            return;
        }

        // Increase 10 coins if not end yet
        await player.changeCoins(message.author.id, 10);

        // pass language
        await stats.addQuery(language);
    });
});
// END LOGIC GAME

// The interactionCreate event directly here, as this is the heart of the robot.
client.on('interactionCreate', async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName)
        if (!command) return

        // We log when a user makes a command
        try {
            if (interaction.guild) {
                await console.log(
                    `[${interaction.guild.name}] ${interaction.user.username} used /${interaction.commandName}`
                )
            }
            await command.execute(interaction, client)
        } catch (error) {
            console.error(error)
            return interaction.reply({
                content: "An error occurred while executing this command!",
                flags: 4096,
                withResponse: true
            })
        }
    }
    // Handle Sic Bo button interactions
    else if (interaction.isButton() && interaction.customId.startsWith('sicbo_')) {
        try {
            const { handleSicBoButton } = require('./utils/sicbo-handlers');
            await handleSicBoButton(interaction);
        } catch (error) {
            console.error('Error handling Sic Bo button:', error);
        }
    }
    // Handle Sic Bo modal submissions
    else if (interaction.isModalSubmit() && interaction.customId.startsWith('sicbo_modal_')) {
        try {
            const { handleSicBoModal } = require('./utils/sicbo-handlers');
            await handleSicBoModal(interaction);
        } catch (error) {
            console.error('Error handling Sic Bo modal:', error);
        }
    }
})

// The token of your robot to be inserted
client.login(process.env.BOT_TOKEN)
