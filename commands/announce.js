const { SlashCommandBuilder, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const Developer = require('../models/Developer');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to all configured game channels (devs only)')
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('The message to announce')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('language')
                .setDescription('Only send to channels with this language')
                .addChoices(
                    { name: 'Vietnamese', value: 'vi' },
                    { name: 'English', value: 'en' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        const authorId = interaction.user.id;
        const isDev = await Developer.exists({ userId: authorId });
        if (!isDev) {
            return interaction.reply({
                content: '🚫 Bạn không có quyền làm điều này.',
                flags: MessageFlags.Ephemeral
            });
        }

        const message = interaction.options.getString('message');
        const filterLanguage = interaction.options.getString('language');

        const embed = new EmbedBuilder()
            .setTitle('📢 Announcement')
            .setDescription(message)
            .setColor(0xFF9900)
            .setFooter({ text: `Được gửi bởi ${interaction.user.tag}` })
            .setTimestamp();

        let totalSent = 0;

        const configs = await GuildConfig.find();

        for (const cfg of configs) {
            for (const ch of cfg.channels) {
                if (filterLanguage && ch.language !== filterLanguage) continue;

                try {
                    const guild = await interaction.client.guilds.fetch(cfg.guildId).catch(() => null);
                    if (!guild) continue;

                    const channel = await guild.channels.fetch(ch.channelId).catch(() => null);
                    if (!channel || channel.type !== ChannelType.GuildText) continue;

                    await channel.send({ embeds: [embed] });
                    totalSent++;
                } catch (err) {
                    console.error(`Failed to send message to ${ch.channelId} in ${cfg.guildId}`, err);
                }
            }
        }

        return interaction.reply({
            content: `✅ Đã gửi thông báo đến **${totalSent}** kênh${filterLanguage ? ` (language: ${filterLanguage})` : ''}.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
