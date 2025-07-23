const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { getCoins } = require('../utils/player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance / Kiểm tra số xu của bạn'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const userId = interaction.user.id;

        // 1) determine language from this channel's config
        const cfg = await GuildConfig.findOne({ guildId }).lean();
        const channelCfg = cfg?.channels?.find(c => c.channelId === channelId);
        const lang = channelCfg?.language || 'vi';

        // 2) fetch coin balance
        const coins = await getCoins(guildId, userId);

        // 3) build embed
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(lang === 'en' ? 'Your Balance' : 'Số xu của bạn')
            .setDescription(
                lang === 'en'
                    ? `You have **${coins}** coins.`
                    : `Bạn có **${coins}** xu.`
            )
            .setThumbnail(interaction.user.avatarURL())
            .setTimestamp();

        // reply ephemerally
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
