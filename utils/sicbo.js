const SicBoConfig = require('../models/SicBoConfig');

/**
 * Roll three dice and return the results
 * @returns {number[]} Array of three dice values (1-6)
 */
function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

/**
 * Calculate the total sum of dice
 * @param {number[]} dice 
 * @returns {number}
 */
function calculateSum(dice) {
    return dice.reduce((sum, die) => sum + die, 0);
}

/**
 * Check if the dice roll is a triple (all three dice same value)
 * @param {number[]} dice 
 * @returns {boolean}
 */
function isTriple(dice) {
    return dice[0] === dice[1] && dice[1] === dice[2];
}

/**
 * Calculate payout for a bet
 * @param {object} bet - The bet object
 * @param {number[]} dice - The dice roll result
 * @returns {Promise<number>} - Payout amount (0 if lose)
 */
async function calculatePayout(bet, dice) {
    const { betType, value, amount } = bet;
    const sum = calculateSum(dice);
    
    // Get multiplier from config
    const config = await SicBoConfig.findOne({ betType }).lean();
    if (!config) return 0;

    switch (betType) {
        case 'big':
            // Win if sum is 11-17 and not triple
            if (sum >= 11 && sum <= 17 && !isTriple(dice) && config.multiplier) {
                return amount * config.multiplier;
            }
            break;
            
        case 'small':
            // Win if sum is 4-10 and not triple
            if (sum >= 4 && sum <= 10 && !isTriple(dice) && config.multiplier) {
                return amount * config.multiplier;
            }
            break;
            
        case 'odd':
            // Win if sum is odd
            if (sum % 2 === 1 && config.multiplier) {
                return amount * config.multiplier;
            }
            break;
            
        case 'even':
            // Win if sum is even
            if (sum % 2 === 0 && config.multiplier) {
                return amount * config.multiplier;
            }
            break;
            
        case 'total':
            // Win if sum matches exactly
            if (sum === value && config.multiplier) {
                return amount * config.multiplier;
            }
            break;
    }
    
    return 0; // Lost bet
}

/**
 * Initialize default Sic Bo configurations in database
 */
async function initializeDefaultConfigs() {
    const defaultConfigs = [
        { betType: 'big', multiplier: 2 },
        { betType: 'small', multiplier: 2 },
        { betType: 'odd', multiplier: 2 },
        { betType: 'even', multiplier: 2 },
        { betType: 'total', multiplier: 6 } // Default, varies by total value
    ];

    for (const config of defaultConfigs) {
        await SicBoConfig.findOneAndUpdate(
            { betType: config.betType },
            config,
            { upsert: true, new: true }
        );
    }
}

/**
 * Get formatted dice result string
 * @param {number[]} dice 
 * @returns {string}
 */
function formatDiceResult(dice) {
    const sum = calculateSum(dice);
    return `${dice[0]} + ${dice[1]} + ${dice[2]} = ${sum}`;
}

/**
 * Get bet type display name in Vietnamese/English
 * @param {string} betType 
 * @param {number} betDetails
 * @param {string} lang 
 * @returns {string}
 */
function getBetTypeDisplayName(betType, betDetails, lang = 'vi') {
    const names = {
        'big': { vi: 'Tài (11-17)', en: 'Big (11-17)' },
        'small': { vi: 'Xỉu (4-10)', en: 'Small (4-10)' },
        'odd': { vi: 'Lẻ', en: 'Odd' },
        'even': { vi: 'Chẵn', en: 'Even' },
        'total': { vi: 'Tổng điểm', en: 'Total Sum' }
    };
    
    return names[betType] ? names[betType][lang] : betType;
}

module.exports = {
    rollDice,
    calculateSum,
    isTriple,
    calculatePayout,
    initializeDefaultConfigs,
    formatDiceResult,
    getBetTypeDisplayName
};
