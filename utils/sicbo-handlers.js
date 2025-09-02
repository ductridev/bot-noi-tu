const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    EmbedBuilder, 
    MessageFlags
} = require('discord.js');

const SicBoSession = require('../models/SicBoSession');
const GuildConfig = require('../models/GuildConfig');
const { getCoins, changeCoins } = require('../utils/player');
const { 
    rollDice, 
    calculatePayout, 
    formatDiceResult, 
    getBetTypeDisplayName 
} = require('../utils/sicbo');
const { resolveDiceAnimation, stopDiceAnimation } = require('../utils/dice-animation');

/**
 * Handle Sic Bo button interactions
 */
async function handleSicBoButton(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const customId = interaction.customId;

    try {
        // Check if there's an active session
        const session = await SicBoSession.findOne({ guildId, isActive: true });
        if (!session) {
            return interaction.reply({
                content: '❌ No active Sic Bo game found.\n❌ Không tìm thấy trò chơi Tài Xỉu đang hoạt động.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Get language config
        const cfg = await GuildConfig.findOne({ guildId }).lean();
        const channelCfg = cfg?.channels?.find(c => c.channelId === interaction.channelId);
        const lang = channelCfg?.language || 'vi';

        // Handle resolve button - trigger immediate resolution
        if (customId === 'sicbo_resolve') {
            if (session.bets.length === 0) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ No bets placed yet! Place some bets first.'
                        : '❌ Chưa có cược nào! Hãy đặt cược trước.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Trigger immediate resolution via animation system
            await resolveDiceAnimation(guildId);
            await interaction.deferUpdate(); // Acknowledge the button press
            return;
        }

        // Handle cancel button
        if (customId === 'sicbo_cancel') {
            // Stop animation
            stopDiceAnimation(guildId);
            
            await session.updateOne({ isActive: false });
            
            // Refund all bets
            for (const bet of session.bets) {
                await changeCoins(bet.userId, bet.amount);
            }

            const cancelEmbed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle(lang === 'en' ? '❌ Game Cancelled' : '❌ Trò chơi đã hủy')
                .setDescription(
                    lang === 'en' 
                        ? 'All bets have been refunded. Animation stopped.'
                        : 'Tất cả cược đã được hoàn trả. Hoạt ảnh đã dừng.'
                );

            await interaction.update({
                embeds: [cancelEmbed],
                components: []
            });
            return;
        }

        // Handle bet type buttons - show modal
        const betTypeMap = {
            'sicbo_big': 'big',
            'sicbo_small': 'small',
            'sicbo_odd': 'odd',
            'sicbo_even': 'even'
        };

        let betType = betTypeMap[customId];
        let specificNumber = null;

        // Handle specific number buttons (sicbo_total_3 to sicbo_total_18)
        if (customId.startsWith('sicbo_total_')) {
            const numberStr = customId.replace('sicbo_total_', '');
            const number = parseInt(numberStr);
            if (number >= 3 && number <= 18) {
                betType = 'total';
                specificNumber = number;
            }
        }

        if (betType) {
            await showBetModal(interaction, betType, lang, specificNumber);
        }

    } catch (error) {
        console.error('Error handling Sic Bo button:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your bet.\n❌ Đã xảy ra lỗi khi xử lý cược của bạn.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Show betting modal for specific bet type
 */
async function showBetModal(interaction, betType, lang, specificNumber) {
    const modal = new ModalBuilder()
        .setCustomId(`sicbo_modal_${betType}${specificNumber ? `_${specificNumber}` : ''}`)
        .setTitle(lang === 'en' ? `Place ${getBetTypeDisplayName(betType, 'en')} Bet` : `Đặt cược ${getBetTypeDisplayName(betType, 'vi')}`);

    // Amount input (always required)
    const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel(lang === 'en' ? 'Bet Amount (coins)' : 'Số tiền cược (xu)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(lang === 'en' ? 'Enter amount...' : 'Nhập số tiền...')
        .setRequired(true);

    const amountRow = new ActionRowBuilder().addComponents(amountInput);

    // Build modal based on bet type
    if (betType === 'total') {
        // For total bets, only show amount input since number is determined by button
        if (specificNumber) {
            // Update modal title to show the specific number
            modal.setTitle(lang === 'en' ? `Bet on Total ${specificNumber}` : `Đặt cược Tổng ${specificNumber}`);
        }
        modal.addComponents(amountRow);
    } else {
        modal.addComponents(amountRow);
    }

    await interaction.showModal(modal);
}

/**
 * Handle Sic Bo modal submissions
 */
async function handleSicBoModal(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const userName = interaction.user.displayName;
    
    // Parse bet type and specific number from customId
    let betType = interaction.customId.replace('sicbo_modal_', '');
    let specificNumber = null;
    
    // Check if this is a specific number bet (e.g., "total_5")
    if (betType.startsWith('total_')) {
        const parts = betType.split('_');
        if (parts.length === 2) {
            betType = 'total';
            specificNumber = parseInt(parts[1]);
        }
    }

    try {
        // Check if there's an active session
        const session = await SicBoSession.findOne({ guildId, isActive: true });
        if (!session) {
            return interaction.reply({
                content: '❌ No active Sic Bo game found.\n❌ Không tìm thấy trò chơi Tài Xỉu đang hoạt động.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Get language config
        const cfg = await GuildConfig.findOne({ guildId }).lean();
        const channelCfg = cfg?.channels?.find(c => c.channelId === interaction.channelId);
        const lang = channelCfg?.language || 'vi';

        // Parse inputs
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));
        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({
                content: lang === 'en' 
                    ? '❌ Invalid bet amount! Please enter a positive number.'
                    : '❌ Số tiền cược không hợp lệ! Vui lòng nhập số dương.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Parse bet details
        let betDetails;
        let totalBetAmount = amount;

        if (betType === 'total') {
            let sum;
            if (specificNumber) {
                // Use the specific number from the button
                sum = specificNumber;
            } else {
                // This should not happen with the new button system, but keep as fallback
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid total bet! Please use the number buttons.'
                        : '❌ Cược tổng không hợp lệ! Vui lòng sử dụng nút số.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (isNaN(sum) || sum < 3 || sum > 18) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid sum! Please enter a sum between 3-18.'
                        : '❌ Tổng không hợp lệ! Vui lòng nhập tổng từ 3-18.',
                    flags: MessageFlags.Ephemeral
                });
            }
            betDetails = sum;
        } else if (betType === 'SingleNumber') {
            const numbersInput = interaction.fields.getTextInputValue('numbers');
            const numbers = numbersInput.split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 6);
            if (numbers.length === 0) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid numbers! Please enter numbers between 1-6.'
                        : '❌ Số không hợp lệ! Vui lòng nhập số từ 1-6.',
                    flags: MessageFlags.Ephemeral
                });
            }
            betDetails = numbers;
            totalBetAmount = numbers.length * amount; // Each number is a separate bet
        } else if (betType === 'SpecificDouble' || betType === 'SpecificTriple') {
            const number = parseInt(interaction.fields.getTextInputValue('number'));
            if (isNaN(number) || number < 1 || number > 6) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid number! Please enter a number between 1-6.'
                        : '❌ Số không hợp lệ! Vui lòng nhập số từ 1-6.',
                    flags: MessageFlags.Ephemeral
                });
            }
            betDetails = number;
        } else if (betType === 'TotalSum') {
            const sum = parseInt(interaction.fields.getTextInputValue('sum'));
            if (isNaN(sum) || sum < 4 || sum > 17) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid sum! Please enter a sum between 4-17.'
                        : '❌ Tổng không hợp lệ! Vui lòng nhập tổng từ 4-17.',
                    flags: MessageFlags.Ephemeral
                });
            }
            betDetails = sum;
        } else if (betType === 'DiceCombination') {
            const comboInput = interaction.fields.getTextInputValue('combination');
            const numbers = comboInput.split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 6);
            if (numbers.length !== 2 || numbers[0] === numbers[1]) {
                return interaction.reply({
                    content: lang === 'en' 
                        ? '❌ Invalid combination! Please enter two different numbers (1-6).'
                        : '❌ Tổ hợp không hợp lệ! Vui lòng nhập hai số khác nhau (1-6).',
                    flags: MessageFlags.Ephemeral
                });
            }
            betDetails = numbers.sort(); // Sort to ensure consistency
        }

        // Check player's balance
        const playerCoins = await getCoins(userId);
        if (playerCoins < totalBetAmount) {
            return interaction.reply({
                content: lang === 'en' 
                    ? `❌ Insufficient coins! You need ${totalBetAmount} coins but only have ${playerCoins}.`
                    : `❌ Không đủ xu! Bạn cần ${totalBetAmount} xu nhưng chỉ có ${playerCoins}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Deduct coins
        await changeCoins(userId, -totalBetAmount);

        // Add bet to session
        const bet = {
            userId,
            userName,
            betType,
            betDetails,
            amount: totalBetAmount,
            timestamp: new Date()
        };

        await session.updateOne({ $push: { bets: bet } });

        // Confirm bet
        let confirmMessage;
        if (betType === 'total') {
            confirmMessage = lang === 'en' 
                ? `✅ Bet placed! **Total Sum: ${betDetails}** - ${totalBetAmount} coins`
                : `✅ Đã đặt cược! **Tổng điểm: ${betDetails}** - ${totalBetAmount} xu`;
        } else {
            confirmMessage = lang === 'en' 
                ? `✅ Bet placed! **${getBetTypeDisplayName(betType, betDetails, 'en')}** - ${totalBetAmount} coins`
                : `✅ Đã đặt cược! **${getBetTypeDisplayName(betType, betDetails, 'vi')}** - ${totalBetAmount} xu`;
        }

        await interaction.reply({
            content: confirmMessage,
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error('Error handling Sic Bo modal:', error);
        await interaction.reply({
            content: '❌ An error occurred while placing your bet.\n❌ Đã xảy ra lỗi khi đặt cược.',
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = {
    handleSicBoButton,
    handleSicBoModal
};
