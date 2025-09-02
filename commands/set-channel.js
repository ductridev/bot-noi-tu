const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

const t = {
    vi: {
        description: 'Cài đặt kênh chơi nối từ',
        channelOption: 'Kênh chơi nối từ',
        noPermission: 'Bạn cần có quyền Admin để thực hiện thao tác này!',
        noView: 'Tôi không có quyền xem kênh này!',
        noSend: 'Tôi không có quyền gửi tin nhắn ở kênh này!',
        noReact: 'Tôi không có quyền thả cảm xúc vào tin nhắn ở kênh này!',
        success: (channelName, guildName, lang) =>
            `Bạn đã chọn kênh **${channelName}** làm kênh chơi nối từ ${lang} của máy chủ **${guildName}**!`
    },
    en: {
        description: 'Set the channel used for word chain game',
        channelOption: 'Game channel',
        noPermission: 'You need Admin permission to perform this action!',
        noView: 'I do not have permission to view this channel!',
        noSend: 'I do not have permission to send messages in this channel!',
        noReact: 'I do not have permission to add reactions in this channel!',
        success: (channelName, guildName, lang) =>
            `You have selected **${channelName}** as the game channel ${lang} for **${guildName}**!`
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-channel')
        .setDescription('Set the game channel / Cài đặt kênh chơi nối từ')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Game channel / Kênh chơi nối từ')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Language for this game channel')
                .addChoices(
                    { name: 'Tiếng Việt', value: 'vi' },
                    { name: 'Tiếng Anh', value: 'en' }
                )
                .setRequired(true)
        ),

    async execute(interaction) {
        const lang = interaction.locale?.startsWith('en') ? 'en' : 'vi';
        const locale = t[lang];

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: locale.noPermission,
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const selectedLang = interaction.options.getString('language');

        const botPermissions = interaction.guild.members.me.permissionsIn(channel);

        if (!botPermissions.has(PermissionsBitField.Flags.ViewChannel)) {
            return interaction.reply({
                content: locale.noView,
                ephemeral: true
            });
        }

        if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
            return interaction.reply({
                content: locale.noSend,
                ephemeral: true
            });
        }

        if (!botPermissions.has(PermissionsBitField.Flags.AddReactions)) {
            return interaction.reply({
                content: locale.noReact,
                ephemeral: true
            });
        }

        // Update or insert this channel-language pair in GuildConfig
        const config = await GuildConfig.findOne({ guildId: interaction.guildId });

        if (!config) {
            await GuildConfig.create({
                guildId: interaction.guildId,
                channels: [{ channelId: channel.id, language: selectedLang }]
            });
        } else {
            const existingIndex = config.channels.findIndex(c => c.language === selectedLang);
            if (existingIndex !== -1) {
                config.channels[existingIndex].channelId = channel.id;
            } else {
                config.channels.push({ channelId: channel.id, language: selectedLang });
            }
            await config.save();
        }

        await interaction.reply({
            content: locale.success(channel.name, interaction.guild.name, selectedLang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'),
            flags: [4096]
        });
    }
};
