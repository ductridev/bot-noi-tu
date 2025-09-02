const PlayerData = require('../models/PlayerData');

/**
 * Fetches (or creates) a PlayerData document for the given user.
 * @param {string} userId 
 * @returns {Promise<import('../models/PlayerData').IPlayerData>}
 */
async function getPlayerData(userId) {
    const filter = { userId };
    const update = { $setOnInsert: { userId, coins: 0, gameStats: {} } };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const result = await PlayerData.findOneAndUpdate(filter, update, opts).lean();
    return result;
}

/**
 * Returns the current coin balance (creates doc if missing).
 * @param {string} userId 
 * @returns {Promise<number>}
 */
async function getCoins(userId) {
    const pd = await getPlayerData(userId);
    return pd.coins;
}

/**
 * Sum total coins of a user (now same as getCoins since it's global)
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getTotalCoins(userId) {
    return getCoins(userId);
}

/**
 * Adds (or subtracts) coins.  
 * @param {string} userId 
 * @param {number} amount  Positive to add, negative to deduct.
 * @returns {Promise<void>}
 */
async function changeCoins(userId, amount) {
    await PlayerData.findOneAndUpdate(
        { userId },
        { $inc: { coins: amount } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a play in a named game.
 * @param {string} userId 
 * @param {string} gameKey  Identifier for the game, e.g. 'wordChain'
 * @returns {Promise<void>}
 */
async function addGamePlayed(userId, gameKey) {
    const path = `gameStats.${gameKey}.played`;
    await PlayerData.findOneAndUpdate(
        { userId },
        { $inc: { [path]: 1 } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a win in a named game.
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<void>}
 */
async function addGameWin(userId, gameKey) {
    const inc = {
        [`gameStats.${gameKey}.played`]: 1,
        [`gameStats.${gameKey}.wins`]: 1
    };
    await PlayerData.findOneAndUpdate(
        { userId },
        { $inc: inc },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a loss in a named game.
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<void>}
 */
async function addGameLoss(userId, gameKey) {
    const inc = {
        [`gameStats.${gameKey}.played`]: 1,
        [`gameStats.${gameKey}.losses`]: 1
    };
    await PlayerData.findOneAndUpdate(
        { userId },
        { $inc: inc },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Fetches the game stats for a user in a specific game.
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<{ played: number; wins: number; losses: number }>}
 */
async function getGameStats(userId, gameKey) {
    const pd = await getPlayerData(userId);
    const stats = pd.gameStats?.[gameKey] || { played: 0, wins: 0, losses: 0 };
    return stats;
}

module.exports = {
    getPlayerData,
    getCoins,
    changeCoins,
    addGamePlayed,
    addGameWin,
    addGameLoss,
    getGameStats,
    getTotalCoins
};