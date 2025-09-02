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
        .setName('sicbo')
        .setDescription('Start a Sic Bo dice betting game'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const userId = interaction.user.id;

        // Check if Sic Bo game is enabled first (quick check)
        if (process.env.ENABLE_SICBO !== 'true') {
            return interaction.reply({
                content: 'Sic Bo game is currently disabled.',
                flags: 4096
            });
        }

        try {
            // Quick check for existing session
            const existingSession = await SicBoSession.findOne({ guildId, isActive: true });
            if (existingSession || isAnimationActive(guildId)) {
                return interaction.reply({
                    content: '🎲 There is already an active Sic Bo game in this server! Please wait for it to finish.',
                    flags: 4096
                });
            }

            // Get guild language preference for this channel
            const guildConfig = await GuildConfig.findOne({ guildId });
            const channelConfig = guildConfig?.channels?.find(ch => ch.channelId === channelId);
            const lang = channelConfig?.language || 'en'; // Default to English for sicbo command

            // Initialize default configs if needed
            await initializeDefaultConfigs();

            // Create embed with English interface only
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🎲 Sic Bo - Dice Betting Game')
                .setDescription(
                    '**How to play:**\n' +
                    '• **Big** (11-17): High total, except triples\n' +
                    '• **Small** (4-10): Low total, except triples\n' +
                    '• **Odd**: Total is odd number\n' +
                    '• **Even**: Total is even number\n' +
                    '• **Total**: Guess exact sum (3-18)'
                )
                .addFields(
                    { 
                        name: '💰 Payout Rates', 
                        value: '• Big/Small, Odd/Even: **2:1**\n• Specific Total: **6:1**', 
                        inline: false 
                    },
                    { 
                        name: '⏰ Time', 
                        value: '30 seconds to place bets', 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: 'Choose bet type and enter amount!' 
                });

            // Create betting buttons with English labels only
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sicbo_big')
                        .setLabel('🔺 Big')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('sicbo_small')
                        .setLabel('🔻 Small')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('sicbo_odd')
                        .setLabel('🔵 Odd')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sicbo_even')
                        .setLabel('⚪ Even')
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

            // Create a new SicBo session for this guild
            const session = new SicBoSession({
                guildId,
                channelId,
                messageId: response.id,
                isActive: true,
                bets: []
            });
            await session.save();

            // Start the 30-second betting timer with English language
            await startDiceAnimation(interaction, guildId, channelId, 'en', 30000);

        } catch (error) {
            console.error('Error starting Sic Bo game:', error);
            // Simple error handling - try to reply if not already replied
            if (!interaction.replied) {
                try {
                    await interaction.reply({
                        content: 'An error occurred while starting the Sic Bo game!',
                        flags: 4096
                    });
                } catch (replyError) {
                    console.error('Could not send error reply:', replyError);
                }
            }
        }
    },
};
