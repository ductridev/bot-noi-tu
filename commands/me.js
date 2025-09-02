const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ranking = require('../models/Ranking');
const GuildConfig = require('../models/GuildConfig');
const { getCoins } = require('../utils/player');  // new import

/**
 * @param {String} userId 
 * @param {String} guildId 
 * @param {String} channelId 
 * @returns {Promise<Object|null>}
 */
const getDataOfUser = async (userId, guildId, channelId) => {
    // Find the language for this channel
    const config = await GuildConfig.findOne({ guildId }).lean();
    const channelConfig = config?.channels?.find(c => c.channelId === channelId);
    if (!channelConfig) return null;

    const ranking = await Ranking.findOne({
        guildId,
        channelId,
        language: channelConfig.language
    }).lean();

    if (!ranking || !ranking.players || ranking.players.length === 0) return null;

    const player = ranking.players.find(p => p.id === userId);
    return { player, language: channelConfig.language };
};

/**
 * @param {Object|null} dataUser 
 * @param {'vi'|'en'} lang
 * @returns {Array<Object>}
 */
const embedData = (dataUser, lang = 'vi') => {
    if (!dataUser || !dataUser.player) {
        return [{
            name: lang === 'en' ? 'Notice' : 'Thông báo',
            value: lang === 'en'
                ? 'You have not played the word-chain game in this channel!'
                : 'Bạn chưa chơi nối từ ở kênh này!'
        }];
    }

    const { win = 0, total = 0, true: correct = 0 } = dataUser.player;
    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(2) : '0.00';

    return [
        {
            name: lang === 'en' ? 'Wins' : 'Thắng',
            value: `\`${win}\``,
            inline: true
        },
        {
            name: lang === 'en' ? 'Correct Answers' : 'Đã trả lời đúng',
            value: `\`${correct}/${total} (${accuracy}%)\``,
            inline: true
        }
    ];
};

/**
 * Get total stats for a user across all guilds/channels for a specific language
 * @param {string} userId
 * @param {'vi'|'en'} language
 */
async function getTotalPlayerStats(userId, language) {
    const rankings = await Ranking.find({ language });

    let totalWin = 0;
    let totalCorrect = 0;
    let totalAnswers = 0;

    for (const rank of rankings) {
        const player = rank.players.find(p => p.id === userId);
        if (player) {
            totalWin += player.win || 0;
            totalCorrect += player.true || 0;
            totalAnswers += player.total || 0;
        }
    }

    return {
        win: totalWin,
        correct: totalCorrect,
        total: totalAnswers
    };
}

const meEmbed = async (interaction) => {
    const userId = interaction.member.user.id;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const result = await getDataOfUser(userId, guildId, channelId);
    const lang = result?.language || 'vi';

    const coins = await getCoins(guildId, userId);

    // 👇 Fetch total stats across all guilds/channels
    const globalStats = await getTotalPlayerStats(userId, lang);

    const accuracy = globalStats.total > 0
        ? ((globalStats.correct / globalStats.total) * 100).toFixed(2)
        : '0.00';

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(interaction.member.displayName)
        .setDescription(lang === 'en' ? 'Your Word-Chain Stats' : 'Hồ sơ nối từ')
        .setThumbnail(interaction.member.user.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg")
        .addFields(
            {
                name: lang === 'en' ? 'Coins' : 'Xu',
                value: `\`${coins}\``,
                inline: false
            },
            {
                name: lang === 'en' ? 'Total Wins' : 'Tổng số trận thắng',
                value: `\`${globalStats.win}\``,
                inline: true
            },
            {
                name: lang === 'en' ? 'Correct Answers' : 'Đã trả lời đúng',
                value: `\`${globalStats.correct}/${globalStats.total} (${accuracy}%)\``,
                inline: true
            }
        );

    return embed;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Xem thống kê nối từ của bạn'),
    async execute(interaction) {
        const embed = await meEmbed(interaction);
        await interaction.reply({ embeds: [embed] });
    }
};
