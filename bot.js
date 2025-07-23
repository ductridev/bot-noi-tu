const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require('discord.js')
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
const { setChannel } = require('./utils/channel')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})

// global config
const START_COMMAND = '!start', STOP_COMMAND = '!stop', RESET_COMMAND = '!reset', PREFIX = '!';
let queryCount = 0

// We create a collection for commands
client.commands = new Collection()
const commandFiles = fs
    .readdirSync('./commands')
    .filter((file) => file.endsWith('.js'))

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.data.name, command)
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

    // 1) load channel config and language
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    const channelCfg = config?.channels?.find(c => c.channelId === message.channel.id);
    if (!channelCfg) return;
    const language = channelCfg.language;

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
            regex = new RegExp(`^${last} `, 'i');
        } else {
            // English: last letter ➞ first letter
            const lastChar = word.slice(-1);
            regex = new RegExp(`^${lastChar}`, 'i');
        }

        // filter by language
        const match = await DictionaryEntry.findOne({ text: { $regex: regex }, language }) ||
            await ContributedWord.findOne({ text: { $regex: regex }, language });

        if (!match) return false;
        return !usedWords.includes(match.text);
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

    const startGame = async (guildId, channelId) => {
        const word = await randomWord();
        await GameSession.findOneAndUpdate(
            { guildId, channelId, language },      // include language
            { running: true, words: [word], currentPlayer: {}, language },
            { upsert: true }
        );
        sendMessageToChannel(`Từ bắt đầu: **${word}**`, channelId);
    };

    const initWordData = async (guild, channel) => {
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
                return message.reply({ content: 'Bạn cần có quyền `MANAGE_GUILD` để dùng lệnh này', ephemeral: true });
            }
            // pass language when saving channel
            await setChannel(message.guildId, message.channel.id, language);
            return message.reply({
                content: `Đã chọn kênh **${message.channel.name}** làm kênh trò chơi (${language}).`,
                ephemeral: true
            });
        }
    }

    // load or init session with language
    let session = await GameSession.findOne({
        guildId: message.guild.id,
        channelId: message.channel.id,
        language
    });
    if (!session) {
        await initWordData(message.guild.id, message.channel.id);
        session = await GameSession.findOne({ guildId: message.guild.id, channelId: message.channel.id, language });
    }

    let isRunning = session?.running ?? false;

    if (message.content.toLowerCase() === START_COMMAND.toLowerCase()) {
        if (!isRunning) {
            sendMessageToChannel('Trò chơi đã bắt đầu!', message.channel.id);
            await startGame(message.guild.id, message.channel.id);
        } else {
            sendMessageToChannel('Trò chơi vẫn đang tiếp tục. Bạn có thể dùng `!stop`', message.channel.id);
        }
        return;
    } else if (['!stop', '!reset'].includes(message.content.toLowerCase())) {
        // if (!message.member.permissionsIn(message.channel.id).has(PermissionsBitField.Flags.ManageChannels)) {
        //     return message.reply({ content: 'Bạn không có quyền dùng lệnh này', ephemeral: true });
        // }

        if (isRunning) {
            sendMessageToChannel('Đã kết thúc lượt này! Lượt mới đã bắt đầu!', message.channel.id);
            await initWordData(message.guild.id, message.channel.id);
            // pass language here
            await stats.addRoundPlayedCount(language);
            await startGame(message.guild.id, message.channel.id);
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
            message.author.avatarURL()
        );
        return;
    }

    words.push(tu);
    session.words = words;
    session.currentPlayer = { id: message.author.id, name: message.author.displayName };
    await session.save();

    message.react('✅');
    // pass language
    await stats.addWordPlayedCount(language);
    await player.changeCoins(message.guild.id, message.author.id, 10);
    await updateRankingForUser(
        message.author.id, 0, 1, 1,
        message.guild.id,
        message.author.displayName,
        message.author.avatarURL()
    );

    console.log(`[${message.guild.name}][${message.channel.name}][#${words.length}] ${tu}`);

    const hasAnswer = await checkIfHaveAnswer(tu, session.words || []);

    if (!hasAnswer) {
        sendMessageToChannel(`${message.author.displayName} đã chiến thắng sau ${words.length - 1} lượt! Lượt mới đã bắt đầu!`, message.channel.id);
        await updateRankingForUser(
            message.author.id, 1, 0, 0,
            message.guild.id,
            message.author.displayName,
            message.author.avatarURL()
        );
        // pass language
        await stats.addRoundPlayedCount(language);
        await initWordData(message.guild.id, message.channel.id);
        await startGame(message.guild.id, message.channel.id);
        return;
    }

    // pass language
    await stats.addQuery(language);
});
// END LOGIC GAME

// The interactionCreate event directly here, as this is the heart of the robot.
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return
    const command = client.commands.get(interaction.commandName)
    if (!command) return

    // We log when a user makes a command
    try {
        await console.log(
            `[${interaction.guild.name}] ${interaction.user.username} used /${interaction.commandName}`
        )
        await command.execute(interaction, client)
        // But if there is a mistake, 
        // then we log that and send an error message only to the person (ephemeral: true)
    } catch (error) {
        console.error(error)
        return interaction.reply({
            content: "An error occurred while executing this command!",
            ephemeral: true,
            fetchReply: true
        })
    }
})

// The token of your robot to be inserted
client.login(process.env.BOT_TOKEN)
