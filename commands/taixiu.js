const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const SicBoSession = require('../models/SicBoSession');
const SicBoConfig = require('../models/SicBoConfig');
const GuildConfig = require('../models/GuildConfig');
const { getCoins, changeCoins } = require('../utils/player');
const { 
    rollDice, 
    calculatePayout, 
    formatDiceResult, 
    getBetTypeDisplayName,
    initializeDefaultConfigs 
} = require('../utils/sicbo');
const { startDiceAnimation, isAnimationActive } = require('../utils/dice-animation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taixiu')
        .setDescription('Chơi game Tài Xỉu (xúc xắc)')
        .setDescriptionLocalizations({
            'vi': 'Chơi game Tài Xỉu (xúc xắc)'
        }),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const userId = interaction.user.id;

        // Check if Sic Bo game is enabled first (quick check)
        if (process.env.ENABLE_SICBO !== 'true') {
            return interaction.reply({
                content: 'Trò chơi Tài Xỉu hiện đang bị tắt.',
                flags: 4096
            });
        }

        try {
            // Quick check for existing session
            const existingSession = await SicBoSession.findOne({ guildId, isActive: true });
            if (existingSession || isAnimationActive(guildId)) {
                return interaction.reply({
                    content: '🎲 Đã có một trò chơi Tài Xỉu đang diễn ra trên máy chủ này! Vui lòng đợi trò chơi kết thúc.',
                    flags: 4096
                });
            }

            // Get guild language preference for this channel
            const guildConfig = await GuildConfig.findOne({ guildId });
            const channelConfig = guildConfig?.channels?.find(ch => ch.channelId === channelId);
            const lang = channelConfig?.language || 'vi'; // Default to Vietnamese for taixiu command

            // Initialize default configs if needed
            await initializeDefaultConfigs();

            // Create embed with Vietnamese interface only
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🎲 Tài Xỉu - Trò chơi xúc xắc')
                .addFields(
                    { 
                        name: '💰 Tỷ lệ thắng', 
                        value: '• Tài/Xỉu, Lẻ/Chẵn: **2:1**\n• Tổng cụ thể: **6:1**', 
                        inline: false 
                    },
                    { 
                        name: '⏰ Thời gian', 
                        value: '30 giây để đặt cược', 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: 'Chọn loại cược và nhập số tiền!' 
                });

            // Create betting buttons with Vietnamese labels
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_big')
                        .setLabel('🔺 Tài (11-17)')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('sicbo_small')
                        .setLabel('🔻 Xỉu (4-10)')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('sicbo_odd')
                        .setLabel('🔵 Lẻ')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_even')
                        .setLabel('🟡 Chẵn')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Numbers 3-7
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_3')
                        .setLabel('3')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_4')
                        .setLabel('4')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_5')
                        .setLabel('5')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_6')
                        .setLabel('6')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_7')
                        .setLabel('7')
                        .setStyle(ButtonStyle.Primary)
                );

            // Numbers 8-12
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_8')
                        .setLabel('8')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_9')
                        .setLabel('9')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_10')
                        .setLabel('10')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_11')
                        .setLabel('11')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_12')
                        .setLabel('12')
                        .setStyle(ButtonStyle.Primary)
                );

            // Numbers 13-17
            const row4 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_13')
                        .setLabel('13')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_14')
                        .setLabel('14')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_15')
                        .setLabel('15')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_16')
                        .setLabel('16')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_17')
                        .setLabel('17')
                        .setStyle(ButtonStyle.Primary)
                );

            // Number 18
            const row5 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_total_18')
                        .setLabel('18')
                        .setStyle(ButtonStyle.Primary)
                );

            const response = await interaction.reply({
                embeds: [embed],
                components: [row1, row2, row3, row4, row5],
                fetchReply: true
            });

            // Look for existing session for this guild (active or inactive)
            let session = await SicBoSession.findOne({ guildId });
            
            if (session) {
                // Reuse existing session by resetting it
                session.channelId = channelId;
                session.messageId = response.id;
                session.isActive = true;
                session.bets.splice(0); // Clear the bets array properly
                await session.save();
                console.log(`Reusing existing session for guild ${guildId}`);
            } else {
                // Create a new session only if none exists
                session = new SicBoSession({
                    guildId,
                    channelId,
                    messageId: response.id,
                    isActive: true,
                    bets: []
                });
                await session.save();
                console.log(`Created new session for guild ${guildId}`);
            }

            // Start the 30-second betting timer with Vietnamese language
            await startDiceAnimation(interaction, guildId, channelId, 'vi', 30000);

        } catch (error) {
            console.error('Error starting Tài Xỉu game:', error);
            // Simple error handling - try to reply if not already replied
            if (!interaction.replied) {
                try {
                    await interaction.reply({
                        content: 'Có lỗi xảy ra khi bắt đầu trò chơi Tài Xỉu!',
                        flags: 4096
                    });
                } catch (replyError) {
                    console.error('Could not send error reply:', replyError);
                }
            }
        }
    },
};
