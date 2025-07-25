const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ranking = require('../models/Ranking');
const GuildConfig = require('../models/GuildConfig');

/**
 * 
 * @param {String} guildId 
 * @returns {Promise<Array>}
 */
const getRankOfServer = async (guildId, channelId, language = 'vi') => {
    const rankRecord = await Ranking.findOne({ guildId, channelId, language }).lean();
    if (!rankRecord || !Array.isArray(rankRecord.players)) return [];

    const sortedPlayers = [...rankRecord.players].sort((a, b) => {
        if (b.win !== a.win) return b.win - a.win;

        const aAccuracy = a.total === 0 ? 0 : a.true / a.total;
        const bAccuracy = b.total === 0 ? 0 : b.true / b.total;
        if (bAccuracy !== aAccuracy) return bAccuracy - aAccuracy;

        return b.true - a.true;
    });

    return sortedPlayers;
};

/**
 * 
 * @param {String} guildId 
 * @param {String} channelId
 * @param {String} language 
 * @returns {Promise<Array<Object>>}
 */
const embedData = async (guildId, channelId, language = 'vi') => {
    const t = {
        vi: {
            top: 'Top 10',
            win: 'Thắng',
            correct: 'Từ đúng',
            empty: 'Chưa có ai chơi nối từ ở server này.'
        },
        en: {
            top: 'Top 10',
            win: 'Win',
            correct: 'Correct words',
            empty: 'No one has played in this server yet.'
        }
    }[language];

    const rankOfServer = await getRankOfServer(guildId, channelId, language);

    if (rankOfServer.length === 0) {
        return [{ name: t.top, value: t.empty }];
    }

    let embedd = [
        { name: t.top, value: '', inline: true },
        { name: t.win, value: '', inline: true },
        { name: t.correct, value: '', inline: true }
    ];

    for (let i = 0; i < Math.min(rankOfServer.length, 10); i++) {
        const player = rankOfServer[i];
        const accuracy = player.total === 0 ? 0 : (player.true / player.total * 100).toFixed(2);
        embedd[0].value += `\`${i + 1}\` ${player.name}\n`;
        embedd[1].value += `\`${player.win}\`\n`;
        embedd[2].value += `\`${player.true}/${player.total} (${accuracy}%)\`\n`;
    }

    return embedd;
};

const rankEmbed = async (interaction) => {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const config = await GuildConfig.findOne({ guildId });
    const channelConfig = config?.channels?.find(c => c.channelId === channelId);
    const lang = channelConfig?.language === 'en' ? 'en' : 'vi';

    const fields = await embedData(guildId, channelId, lang);
    return new EmbedBuilder()
        .setColor(13250094)
        .setAuthor({
            name: lang === 'en' ? `Word Chain Leaderboard of ${interaction.guild.name}` : `BXH nối từ của ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .addFields(fields);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Xem bảng xếp hạng nối từ / View word chain leaderboard'),

    async execute(interaction, client) {
        const embed = await rankEmbed(interaction);
        await interaction.reply({
            embeds: [embed]
        });
    }
};
