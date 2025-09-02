/**
 * Dice Animation Utility for Sic Bo Game
 * Handles visual dice rolling animation and countdown
 */

const { AttachmentBuilder } = require('discord.js');
const path = require('path');

/**
 * Dice face emojis - Using custom Discord emojis
 */
const DICE_FACES = [
    '<:one_dice:1412321559007334514>',
    '<:two_dice:1412321646781403146>',
    '<:three_dice:1412321691379699774>',
    '<:four_dice:1412321725160362075>',
    '<:five_dice:1412321751253123124>',
    '<:six_dice:1412321778574819388>'
];

/**
 * Dice image file paths
 */
const DICE_IMAGE_PATHS = [
    path.join(__dirname, '../assets/img/dice-six-faces-one.png'),
    path.join(__dirname, '../assets/img/dice-six-faces-two.png'), 
    path.join(__dirname, '../assets/img/dice-six-faces-three.png'),
    path.join(__dirname, '../assets/img/dice-six-faces-four.png'),
    path.join(__dirname, '../assets/img/dice-six-faces-five.png'),
    path.join(__dirname, '../assets/img/dice-six-faces-six.png')
];

/**
 * Active animation intervals per guild
 */
const activeAnimations = new Map();

/**
 * Get random dice face (1-6)
 */
function getRandomDice() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Get dice display (Unicode emoji for text, filename for attachments)
 */
function getDiceDisplay(value, useImage = false) {
    if (useImage) {
        return `dice${value}.png`;
    }
    return DICE_FACES[value - 1];
}

/**
 * Create dice image attachments
 */
function createDiceAttachments(dice) {
    const attachments = [];
    dice.forEach((diceValue, index) => {
        const attachment = new AttachmentBuilder(DICE_IMAGE_PATHS[diceValue - 1], {
            name: `dice${index + 1}_${diceValue}.png`
        });
        attachments.push(attachment);
    });
    return attachments;
}

/**
 * Format time remaining
 */
function formatTimeRemaining(seconds) {
    return `⏰ ${seconds}s`;
}

/**
 * Create dice message content (without embed)
 */
function createDiceMessage(dice, timeRemaining, lang, betCount = 0) {
    const sum = dice.reduce((a, b) => a + b, 0);
    
    if (lang === 'en') {
        return `**Sic Bo - Rolling Dice...**\n\n⏰ **Time Remaining:** ${formatTimeRemaining(timeRemaining)}\n💰 **Active Bets:** ${betCount}\n🎯 **Current Sum:** ${sum}\n\n*Place your bets before time runs out!*`;
    } else {
        return `**Tài Xỉu - Đang tung xúc xắc...**\n\n⏰ **Thời gian còn lại:** ${formatTimeRemaining(timeRemaining)}\n💰 **Số cược hiện tại:** ${betCount}\n🎯 **Tổng hiện tại:** ${sum}\n\n*Đặt cược trước khi hết thời gian!*`;
    }
}

/**
 * Create dice-only message for maximum emoji size - using animated dice emoji
 */
function createDiceOnlyMessage(dice) {
    return `<a:dices:1412334669621366804> <a:dices:1412334669621366804> <a:dices:1412334669621366804>`;
}
function createDiceEmbed(dice, timeRemaining, lang, betCount = 0) {
    const embed = {
        color: 0x00AE86,
        title: lang === 'en' ? 'Sic Bo - Rolling Dice...' : 'Tài Xỉu - Đang tung xúc xắc...',
        fields: [
            {
                name: lang === 'en' ? 'Current Dice' : 'Xúc xắc hiện tại',
                value: `╔══════════════════════════════╗\n   ${getDiceDisplay(dice[0])}     ${getDiceDisplay(dice[1])}     ${getDiceDisplay(dice[2])}   \n╚══════════════════════════════╝`,
                inline: false
            },
            {
                name: lang === 'en' ? '⏰ Time Remaining' : '⏰ Thời gian còn lại',
                value: formatTimeRemaining(timeRemaining),
                inline: true
            },
            {
                name: lang === 'en' ? '💰 Active Bets' : '💰 Số cược hiện tại',
                value: betCount.toString(),
                inline: true
            }
        ],
        footer: {
            text: lang === 'en' 
                ? 'Place your bets before time runs out!' 
                : 'Đặt cược trước khi hết thời gian!'
        }
    };

    return embed;
}

/**
 * Create final result message (without embed)
 */
function createResultMessage(finalDice, sum, lang, betResults, gameOutcomes) {
    const diceDisplay = `${getDiceDisplay(finalDice[0])}\n${getDiceDisplay(finalDice[1])}\n${getDiceDisplay(finalDice[2])}`;
    
    if (lang === 'en') {
        let message = `**Sic Bo - Final Result!**\n\n${diceDisplay}\n\n🎯 **Final Sum:** ${sum}\n\n`;
        
        if (gameOutcomes) {
            message += `**Game Outcomes:**\n${gameOutcomes}\n\n`;
        }
        
        if (betResults) {
            message += `**Bet Results:**\n${betResults}`;
        } else {
            message += `*No bets were placed.*`;
        }
        
        return message;
    } else {
        let message = `**Tài Xỉu - Kết Quả Cuối Cùng!**\n\n${diceDisplay}\n\n🎯 **Tổng cuối cùng:** ${sum}\n\n`;
        
        if (gameOutcomes) {
            message += `**Kết quả game:**\n${gameOutcomes}\n\n`;
        }
        
        if (betResults) {
            message += `**Kết quả cược:**\n${betResults}`;
        } else {
            message += `*Không có cược nào được đặt.*`;
        }
        
        return message;
    }
}

/**
 * Create final result embed with comprehensive summary
 */
function createResultEmbed(finalDice, sum, lang, betResults, gameOutcomes) {
    const embed = {
        color: 0xFFD700,
        title: lang === 'en' ? 'Final Result!' : 'Kết quả cuối cùng!',
        description: lang === 'en' ? 
            `**Dice Results:** ${finalDice[0]} • ${finalDice[1]} • ${finalDice[2]} = **${sum}**\n\n*See dice images above*` :
            `**Kết quả xúc xắc:** ${finalDice[0]} • ${finalDice[1]} • ${finalDice[2]} = **${sum}**\n\n*Xem hình ảnh xúc xắc ở trên*`,
        fields: [
            {
                name: lang === 'en' ? '📊 Game Outcomes' : '📊 Kết quả trò chơi',
                value: gameOutcomes,
                inline: false
            }
        ]
    };

    if (betResults && betResults.length > 0) {
        embed.fields.push({
            name: lang === 'en' ? '� Player Results' : '� Tổng kết',
            value: betResults,
            inline: false
        });
    }

    return embed;
}

/**
 * Determine game outcomes (Big/Small, Odd/Even, etc.)
 */
function determineGameOutcomes(dice, sum, lang) {
    const outcomes = [];
    
    // Big/Small (Tài/Xỉu)
    const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
    if (isTriple) {
        outcomes.push(lang === 'en' ? 'Big/Small: Triple (Neither)' : 'Tài/Xỉu: Ba đồng (Không có)');
    } else if (sum >= 11 && sum <= 17) {
        outcomes.push(lang === 'en' ? 'Big/Small: **Big (Tài)**' : 'Tài/Xỉu: **Tài**');
    } else if (sum >= 4 && sum <= 10) {
        outcomes.push(lang === 'en' ? 'Big/Small: **Small (Xỉu)**' : 'Tài/Xỉu: **Xỉu**');
    }
    
    // Odd/Even (Chẵn/Lẻ)
    if (sum % 2 === 0) {
        outcomes.push(lang === 'en' ? 'Odd/Even: **Even (Chẵn)**' : 'Chẵn/Lẻ: **Chẵn**');
    } else {
        outcomes.push(lang === 'en' ? 'Odd/Even: **Odd (Lẻ)**' : 'Chẵn/Lẻ: **Lẻ**');
    }
    
    // Total sum
    outcomes.push(lang === 'en' ? `Total: **${sum}**` : `Tổng: **${sum}**`);
    
    return outcomes.join('\n');
}

/**
 * Start dice animation for a guild
 */
async function startDiceAnimation(interaction, guildId, channelId, lang = 'vi', duration = 45000) {
    // Clear any existing animation for this guild
    stopDiceAnimation(guildId);

    const animationData = {
        guildId,
        interaction,
        client: interaction.client,
        originalMessage: interaction.fetchReply ? await interaction.fetchReply() : null,
        lang,
        timeRemaining: Math.floor(duration / 1000),
        currentDice: [getRandomDice(), getRandomDice(), getRandomDice()],
        startTime: Date.now(),
        duration,
        lastBetCount: 0
    };

    // Initial messages - countdown and dice separately
    const SicBoSession = require('../models/SicBoSession');
    const session = await SicBoSession.findOne({ guildId, isActive: true });
    const betCount = session ? session.bets.length : 0;
    
    // Set initial bet count
    animationData.lastBetCount = betCount;
    
    // Calculate end timestamp for Discord countdown
    const endTimestamp = Math.floor((Date.now() + duration) / 1000);
    
    const countdownText = lang === 'vi' ? 
        `⏰ Kết thúc: <t:${endTimestamp}:R>\n🎯 Số lượng cược: **${betCount}**` :
        `⏰ Ends: <t:${endTimestamp}:R>\n🎯 Bets placed: **${betCount}**`;
    
    const diceText = createDiceOnlyMessage(animationData.currentDice);
    
    let countdownMessage, diceMessage;
    try {
        // Send countdown and dice as separate messages to the channel
        const channel = interaction.channel || interaction.guild?.channels.cache.get(channelId);
        if (!channel) {
            console.error('No channel found for dice animation. ChannelId:', channelId);
            return;
        }
        
        countdownMessage = await channel.send({
            content: countdownText
        });
        
        diceMessage = await channel.send({
            content: diceText
        });
    } catch (error) {
        console.error('Error sending initial dice animation:', error);
        return;
    }

    // Animation interval (check for bet count changes every 2 seconds)
    const animationInterval = setInterval(async () => {
        try {
            const elapsed = Date.now() - animationData.startTime;
            const remaining = Math.max(0, duration - elapsed);
            const remainingSeconds = Math.floor(remaining / 1000); // Convert to seconds

            if (remaining <= 0) {
                // Animation finished - resolve the game
                clearInterval(animationInterval);
                
                // Trigger game resolution immediately
                await autoResolveDiceAnimation(guildId);
                return;
            }

            // Get current bet count from session
            const SicBoSession = require('../models/SicBoSession');
            const session = await SicBoSession.findOne({ guildId, isActive: true });
            const currentBetCount = session ? session.bets.length : 0;

            // Only update countdown message if bet count has changed
            if (currentBetCount !== animationData.lastBetCount) {
                animationData.lastBetCount = currentBetCount;
                
                // Update countdown message with Discord auto-countdown
                const endTimestamp = Math.floor((Date.now() + remaining) / 1000);
                const countdownText = lang === 'vi' ? 
                    `⏰ Kết thúc: <t:${endTimestamp}:R>\n🎯 Số lượng cược: **${currentBetCount}**` :
                    `⏰ Ends: <t:${endTimestamp}:R>\n🎯 Bets placed: **${currentBetCount}**`;

                await animationData.countdownMessage.edit({
                    content: countdownText
                });
            }

            // Dice message doesn't need updating since we use animated emoji

        } catch (error) {
            console.error('Error in dice animation:', error);
            clearInterval(animationInterval);
            activeAnimations.delete(guildId);
        }
    }, 2000); // Check every 2 seconds instead of 500ms

    // Store animation data
    animationData.interval = animationInterval;
    animationData.countdownMessage = countdownMessage; // Store the countdown message
    animationData.diceMessage = diceMessage; // Store the dice message
    activeAnimations.set(guildId, animationData);

    // Note: Auto-resolution is now handled by the animation interval above
}

/**
 * Stop dice animation for a guild
 */
function stopDiceAnimation(guildId) {
    const animationData = activeAnimations.get(guildId);
    if (animationData && animationData.interval) {
        clearInterval(animationData.interval);
        activeAnimations.delete(guildId);
    }
}

/**
 * Auto-resolve dice animation and show final results
 */
async function autoResolveDiceAnimation(guildId) {
    const animationData = activeAnimations.get(guildId);
    if (!animationData) {
        console.log(`No animation data found for guild ${guildId}, possibly already resolved`);
        return;
    }

    try {
        // Get the data we need before stopping animation
        const { diceMessage, countdownMessage, lang } = animationData;
        
        // Remove betting buttons first (while we still have animation data)
        await removeBettingButtons(guildId, lang);
        
        // Now stop animation
        stopDiceAnimation(guildId);

        // Import required modules
        const SicBoSession = require('../models/SicBoSession');
        const { rollDice, calculatePayout } = require('./sicbo');
        const { changeCoins } = require('./player');

        // Get session
        const session = await SicBoSession.findOne({ guildId, isActive: true });
        if (!session || session.bets.length === 0) {
            // No bets, just show final dice
            const finalDice = rollDice();
            const sum = finalDice.reduce((a, b) => a + b, 0);
            
            console.log(`No bets found for guild ${guildId}, showing final result only`);
            
            // Update dice message with final result
            try {
                const finalDiceMessage = createDiceOnlyMessage(finalDice);
                await diceMessage.edit({ content: finalDiceMessage });
            } catch (err) {
                console.error('Error updating dice message:', err);
            }

            // Create simple game info message and update countdown message
            try {
                const gameOutcomes = determineGameOutcomes(finalDice, sum, lang);
                const gameInfoMessage = createGameInfoMessage(sum, lang, null, gameOutcomes);
                await countdownMessage.edit({
                    content: gameInfoMessage
                });
            } catch (err) {
                console.error('Error updating countdown message:', err);
                
                // Fallback: send a new message if editing fails
                try {
                    const channel = countdownMessage.channel;
                    const gameOutcomes = determineGameOutcomes(finalDice, sum, lang);
                    const gameInfoMessage = createGameInfoMessage(sum, lang, null, gameOutcomes);
                    await channel.send({
                        content: `**${lang === 'vi' ? 'Kết quả trò chơi' : 'Game Result'}**\n\n${gameInfoMessage}`
                    });
                } catch (fallbackErr) {
                    console.error('Error sending fallback message:', fallbackErr);
                }
            }

            // Mark session as inactive
            if (session) {
                await session.updateOne({ isActive: false });
            }
            return;
        }

        // Roll final dice
        const finalDice = rollDice();
        const sum = finalDice.reduce((a, b) => a + b, 0);

        // Calculate payouts
        const results = [];
        let totalWinnings = 0;
        const playerSummaries = new Map(); // Group by player

        console.log(`Processing ${session.bets.length} bets for guild ${guildId}`);

        for (const bet of session.bets) {
            try {
                // Add safety check for bet data
                if (!bet || typeof bet !== 'object') {
                    console.warn('Invalid bet object:', bet);
                    continue;
                }

                // Ensure bet has required properties
                if (!bet.betType) {
                    console.warn('Bet missing betType:', bet);
                    continue;
                }

                console.log(`Processing bet: ${bet.betType} by ${bet.userName} for ${bet.amount}`);

                const payout = await calculatePayout(bet, finalDice);
                const isWin = payout > 0;
                
                // Ensure numeric values are valid
                const betAmount = bet.amount || 0;
                const betPayout = payout || 0;
                
                const result = {
                    ...bet,
                    payout: betPayout,
                    isWin,
                    netGain: isWin ? betPayout - betAmount : -betAmount
                };
                
                results.push(result);
                
                if (isWin) {
                    await changeCoins(bet.userId, betPayout);
                    totalWinnings += betPayout;
                }
                
                // Group by player for summary
                if (!playerSummaries.has(bet.userId)) {
                    playerSummaries.set(bet.userId, {
                        userName: bet.userName || 'Unknown',
                        bets: [],
                        totalBet: 0,
                        totalWon: 0,
                        netResult: 0
                    });
                }
                
                const playerData = playerSummaries.get(bet.userId);
                playerData.bets.push(result);
                playerData.totalBet += betAmount;
                playerData.totalWon += betPayout;
                playerData.netResult += result.netGain;
            } catch (betError) {
                console.error('Error processing bet:', bet, betError);
                // Continue with other bets
            }
        }

        // Determine game outcomes
        const gameOutcomes = determineGameOutcomes(finalDice, sum, lang);

        // Format comprehensive player results
        const betResults = formatComprehensiveResults(playerSummaries, lang);

        console.log(`Game resolved for guild ${guildId}: ${finalDice.join(', ')} = ${sum}, ${playerSummaries.size} players`);

        // Update dice message with final result
        try {
            const finalDiceMessage = createDiceOnlyMessage(finalDice);
            await diceMessage.edit({ content: finalDiceMessage });
        } catch (err) {
            console.error('Error updating dice message:', err);
        }

        // Create game info message and update countdown message
        try {
            const gameInfoMessage = createGameInfoMessage(sum, lang, betResults, gameOutcomes);
            await countdownMessage.edit({
                content: gameInfoMessage
            });
        } catch (err) {
            console.error('Error updating countdown message:', err);
            
            // Fallback: send a new message if editing fails
            try {
                const channel = countdownMessage.channel;
                const gameInfoMessage = createGameInfoMessage(sum, lang, betResults, gameOutcomes);
                await channel.send({
                    content: `**${lang === 'vi' ? 'Kết quả trò chơi' : 'Game Result'}**\n\n${gameInfoMessage}`
                });
            } catch (fallbackErr) {
                console.error('Error sending fallback message:', fallbackErr);
            }
        }

        // Mark session as inactive
        await session.updateOne({ isActive: false });

    } catch (error) {
        console.error('Error auto-resolving dice animation:', error);
    }
}

/**
 * Manually resolve dice animation (for button trigger)
 */
async function resolveDiceAnimation(guildId) {
    await autoResolveDiceAnimation(guildId);
}

/**
 * Format bet results for display
 */
function formatBetResults(results, lang) {
    if (!results || results.length === 0) {
        return lang === 'en' ? 'No bets placed' : 'Không có cược nào';
    }

    return results.slice(0, 10).map(result => {
        const status = result.isWin ? (lang === 'en' ? '✅ WIN' : '✅ THẮNG') : (lang === 'en' ? '❌ LOSE' : '❌ THUA');
        const gain = result.netGain > 0 ? `+${result.netGain}` : result.netGain.toString();
        
        return `${status} **${result.userName}**: ${gain} coins`;
    }).join('\n') + (results.length > 10 ? `\n${lang === 'en' ? '... and more' : '... và thêm nữa'}` : '');
}

/**
 * Format comprehensive player results for final summary
 */
function formatComprehensiveResults(playerSummaries, lang) {
    if (playerSummaries.size === 0) {
        return lang === 'vi' ? 
            'Không có ai đặt cược trong ván này.' : 
            'No bets were placed in this round.';
    }

    const results = [];
    for (const [userId, playerData] of playerSummaries) {
        const betDescriptions = playerData.bets.map(bet => {
            // Add safety checks for bet data
            const betType = bet.betType || 'unknown';
            const betDetails = bet.betDetails;
            const betDesc = getBetDescription(betType, betDetails, lang);
            const amount = bet.amount || 0;
            const payout = bet.payout || 0;
            
            const outcome = bet.isWin ? 
                (lang === 'vi' ? `✅ Thắng: ${payout.toLocaleString()}` : `✅ Won: ${payout.toLocaleString()}`) :
                (lang === 'vi' ? `❌ Thua` : `❌ Lost`);
            return `${betDesc} (${amount.toLocaleString()}) - ${outcome}`;
        }).join('\n  ');

        const netResult = (playerData.netResult || 0) >= 0 ? 
            `+${(playerData.netResult || 0).toLocaleString()}` : 
            `${(playerData.netResult || 0).toLocaleString()}`;
        
        const netColor = (playerData.netResult || 0) >= 0 ? '🟢' : '🔴';

        const playerSummary = lang === 'vi' ? 
            `**<@${userId}>** (${playerData.userName})\n  ${betDescriptions}\n  ${netColor} **Kết quả: ${netResult} xu**` :
            `**<@${userId}>** (${playerData.userName})\n  ${betDescriptions}\n  ${netColor} **Net result: ${netResult} coins**`;
        
        results.push(playerSummary);
    }

    return results.join('\n\n');
}

function getBetDescription(betType, value, lang) {
    // Add safety check for undefined betType
    if (!betType || typeof betType !== 'string') {
        console.warn('Invalid betType in getBetDescription:', betType);
        return lang === 'vi' ? 'Cược không xác định' : 'Unknown bet';
    }

    const descriptions = {
        vi: {
            big: 'Tài', 
            small: 'Xỉu', 
            odd: 'Lẻ', 
            even: 'Chẵn',
            total: value ? `Tổng ${value}` : 'Tổng'
        },
        en: {
            big: 'Big', 
            small: 'Small', 
            odd: 'Odd', 
            even: 'Even',
            total: value ? `Total ${value}` : 'Total'
        }
    };
    
    const langData = descriptions[lang] || descriptions['vi'];
    
    // Handle total bets with number suffix (e.g., total_4, total_16)
    if (betType.startsWith('total_')) {
        const totalValue = betType.split('_')[1];
        return lang === 'vi' ? `Tổng ${totalValue}` : `Total ${totalValue}`;
    }
    
    // Return description or fallback to betType with value
    return langData[betType] || (value ? `${betType} ${value}` : betType);
}function getNumberCategory(sum) {
    if (sum >= 4 && sum <= 10) return 'small';
    if (sum >= 11 && sum <= 17) return 'big';
    return 'extreme'; // 3 or 18
}

/**
 * Create game info message (without dice)
 */
function createGameInfoMessage(sum, lang, betResults, gameOutcomes) {
    const langContent = lang === 'vi' ? {
        title: 'Kết quả cuối cùng!',
        finalSum: 'Tổng điểm cuối cùng:',
        outcomes: 'Kết quả:',
        results: 'Chi tiết cược:'
    } : {
        title: 'Final Result!',
        finalSum: 'Final Sum:',
        outcomes: 'Outcomes:',
        results: 'Bet Results:'
    };

    let message = `${langContent.title}\n\n🎯 **${langContent.finalSum}** ${sum}\n\n`;
    
    if (gameOutcomes) {
        message += `🎯 **${langContent.outcomes}**\n${gameOutcomes}\n\n`;
    }
    
    if (betResults) {
        message += `📊 **${langContent.results}**\n${betResults}`;
    }

    return message;
}

/**
 * Remove betting buttons on the original game message
 */
async function removeBettingButtons(guildId, lang) {
    try {
        // Get animation data to access client
        const animationData = activeAnimations.get(guildId);
        if (!animationData) {
            console.log(`No animation data found for guild ${guildId}`);
            return;
        }

        // Get session to find the original message
        const SicBoSession = require('../models/SicBoSession');
        const session = await SicBoSession.findOne({ guildId });
        
        if (!session || !session.messageId || !session.channelId) {
            console.log(`No session or message info found for guild ${guildId}`);
            return;
        }

        const client = animationData.client;
        if (!client || !client.channels) {
            console.log('Bot client not available');
            return;
        }

        const channel = await client.channels.fetch(session.channelId).catch(() => null);
        if (!channel) {
            console.log(`Channel ${session.channelId} not found`);
            return;
        }

        const message = await channel.messages.fetch(session.messageId).catch(() => null);
        if (!message) {
            console.log(`Message ${session.messageId} not found`);
            return;
        }

        // Remove all components (buttons) completely
        await message.edit({
            embeds: message.embeds,
            components: []
        });

        console.log(`Removed betting buttons for guild ${guildId}`);
    } catch (error) {
        console.error('Error removing betting buttons:', error);
    }
}

/**
 * Check if animation is active for guild
 */
function isAnimationActive(guildId) {
    return activeAnimations.has(guildId);
}

module.exports = {
    startDiceAnimation,
    stopDiceAnimation,
    resolveDiceAnimation,
    isAnimationActive,
    getDiceDisplay,
    getRandomDice,
    createDiceAttachments
};
