const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ranking = require('../models/Ranking');
const WordList = require('../models/WordList');
const BotStats = require('../models/BotStats');

async function getStats() {
    let playerCount = 0;
    let queryCount = 0;
    let wordPlayed = 0;
    let roundPlayed = 0;
    let dictionaryCount = 0;

    try {
        // Count total players from Ranking
        const rankings = await Ranking.find({});
        for (const rank of rankings) {
            playerCount += rank.players?.length || 0;
        }

        // Fetch global stats from BotStats
        const stats = await BotStats.findOne({ key: 'global' });
        if (stats) {
            queryCount = stats.queryCount || 0;
            wordPlayed = stats.wordPlayedCount || 0;
            roundPlayed = stats.roundPlayedCount || 0;
        }

        // Count dictionary words
        const dict = await WordList.findOne({ name: 'dictionary' });
        dictionaryCount = dict?.words?.length || 0;

    } catch (err) {
        console.error('[stats] Error aggregating stats:', err);
    }

    return { playerCount, queryCount, wordPlayed, roundPlayed, dictionaryCount };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Xem các thống kê của BOT'),

    async execute(interaction, client) {
        const {
            playerCount,
            queryCount,
            wordPlayed,
            roundPlayed,
            dictionaryCount
        } = await getStats();

        const embed = new EmbedBuilder()
            .setColor(13250094)
            .addFields(
                {
                    name: 'Tổng số server đang sử dụng',
                    value: `${client.guilds.cache.size} servers`,
                    inline: true
                },
                {
                    name: 'Tổng số người đã chơi',
                    value: `${playerCount}`,
                    inline: true
                },
                {
                    name: 'Tổng số từ đã nối',
                    value: `${wordPlayed}`,
                    inline: true
                },
                {
                    name: 'Tổng số vòng đã diễn ra',
                    value: `${roundPlayed}`,
                    inline: true
                },
                {
                    name: 'Tổng số truy vấn dữ liệu',
                    value: `${queryCount}`,
                    inline: true
                },
                {
                    name: 'Tổng số từ trong ngân hàng từ',
                    value: `${dictionaryCount}`,
                    inline: true
                }
            );

        await interaction.reply({
            embeds: [embed],
            flags: [4096]
        });
    }
};
