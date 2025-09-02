const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SicBoConfig = require('../models/SicBoConfig');
const { getBetTypeDisplayName } = require('../utils/sicbo');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicbo-config')
        .setDescription('View or modify Sic Bo bet multipliers (Admin only) / Xem hoặc chỉnh sửa hệ số cược Tài Xỉu')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current multipliers / Xem hệ số hiện tại')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a multiplier / Đặt hệ số')
                .addStringOption(option =>
                    option.setName('bet_type')
                        .setDescription('Bet type / Loại cược')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Big/Tài', value: 'Big' },
                            { name: 'Small/Xỉu', value: 'Small' },
                            { name: 'Specific Double/Đôi cụ thể', value: 'SpecificDouble' },
                            { name: 'Specific Triple/Ba cụ thể', value: 'SpecificTriple' },
                            { name: 'Any Triple/Ba bất kỳ', value: 'AnyTriple' },
                            { name: 'Total Sum/Tổng điểm', value: 'TotalSum' },
                            { name: 'Dice Combination/Tổ hợp', value: 'DiceCombination' }
                        )
                )
                .addNumberOption(option =>
                    option.setName('multiplier')
                        .setDescription('New multiplier value / Giá trị hệ số mới')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if Sic Bo game is enabled
        if (process.env.ENABLE_SICBO !== 'true') {
            return interaction.reply({
                content: 'Sic Bo game is currently disabled.',
                eflags: MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const subcommand = interaction.options.getSubcommand();

        // Get language config
        const cfg = await GuildConfig.findOne({ guildId }).lean();
        const channelCfg = cfg?.channels?.find(c => c.channelId === channelId);
        const lang = channelCfg?.language || 'vi';

        try {
            if (subcommand === 'view') {
                await viewConfigurations(interaction, lang);
            } else if (subcommand === 'set') {
                await setConfiguration(interaction, lang);
            }
        } catch (error) {
            console.error('Error in sicbo-config command:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing configurations.\n❌ Đã xảy ra lỗi khi quản lý cấu hình.',
                eflags: MessageFlags.Ephemeral
            });
        }
    }
};

async function viewConfigurations(interaction, lang) {
    const configs = await SicBoConfig.find({}).lean();
    
    if (configs.length === 0) {
        return interaction.reply({
            content: lang === 'en' 
                ? '❌ No configurations found. Run the initialization script first.'
                : '❌ Không tìm thấy cấu hình. Hãy chạy script khởi tạo trước.',
            eflags: MessageFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(lang === 'en' ? '🎲 Sic Bo Multiplier Configurations' : '🎲 Cấu hình hệ số Tài Xỉu')
        .setDescription(lang === 'en' ? 'Current bet type multipliers:' : 'Hệ số cược hiện tại:');

    for (const config of configs) {
        const displayName = getBetTypeDisplayName(config.betType, lang);
        let value;
        
        if (config.multipliers) {
            value = `${config.multipliers.join('x, ')}x (1, 2, 3 dice)`;
        } else {
            value = `${config.multiplier}x`;
        }
        
        embed.addFields([{
            name: displayName,
            value: value,
            inline: true
        }]);
    }

    await interaction.reply({ embeds: [embed], eflags: MessageFlags.Ephemeral });
}

async function setConfiguration(interaction, lang) {
    const betType = interaction.options.getString('bet_type');
    const multiplier = interaction.options.getNumber('multiplier');

    // Special handling for SingleNumber which uses multipliers array
    if (betType === 'SingleNumber') {
        return interaction.reply({
            content: lang === 'en' 
                ? '❌ SingleNumber multipliers cannot be changed via this command. Contact the developer.'
                : '❌ Không thể thay đổi hệ số Số đơn qua lệnh này. Liên hệ nhà phát triển.',
            eflags: MessageFlags.Ephemeral
        });
    }

    const result = await SicBoConfig.findOneAndUpdate(
        { betType },
        { multiplier },
        { upsert: true, new: true }
    );

    const displayName = getBetTypeDisplayName(betType, lang);
    
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(lang === 'en' ? '✅ Configuration Updated' : '✅ Cấu hình đã cập nhật')
        .setDescription(
            lang === 'en' 
                ? `**${displayName}** multiplier set to **${multiplier}x**`
                : `Hệ số **${displayName}** đã được đặt thành **${multiplier}x**`
        );

    await interaction.reply({ embeds: [embed], eflags: MessageFlags.Ephemeral });
}
