const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { getCoins, getTotalCoins } = require('../utils/player');

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

        // 2) fetch total coin balance across all guilds
        const coins = await getTotalCoins(userId);

        // 3) build embed
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(lang === 'en' ? 'Your Balance' : 'Số xu của bạn')
            .setDescription(
                lang === 'en'
                    ? `You have **${coins}** coins across all servers.`
                    : `Bạn có **${coins}** xu ở tất cả các máy chủ.`
            )
            .setThumbnail(interaction.user.avatarURL() || "https://raw.githubusercontent.com/ductridev/multi-distube-bots/refs/heads/master/assets/img/bot-avatar-1.jpg")
            .setTimestamp();

        // reply ephemerally
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
