const PlayerData = require('../models/PlayerData');

/**
 * Fetches (or creates) a PlayerData document for the given guild & user.
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {Promise<import('../models/PlayerData').IPlayerData>}
 */
async function getPlayerData(guildId, userId) {
    const filter = { guildId, userId };
    const update = { $setOnInsert: { guildId, userId, coins: 0, gameStats: {} } };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    return PlayerData.findOneAndUpdate(filter, update, opts).lean();
}

/**
 * Returns the current coin balance (creates doc if missing).
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {Promise<number>}
 */
async function getCoins(guildId, userId) {
    const pd = await getPlayerData(guildId, userId);
    return pd.coins;
}

/**
 * Sum total coins of a user across all guilds
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getTotalCoins(userId) {
    const all = await PlayerData.find({ userId });
    return all.reduce((sum, entry) => sum + (entry.coins || 0), 0);
}

/**
 * Adds (or subtracts) coins.  
 * @param {string} guildId 
 * @param {string} userId 
 * @param {number} amount  Positive to add, negative to deduct.
 * @returns {Promise<void>}
 */
async function changeCoins(guildId, userId, amount) {
    await PlayerData.findOneAndUpdate(
        { guildId, userId },
        { $inc: { coins: amount } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a play in a named game.
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} gameKey  Identifier for the game, e.g. 'wordChain'
 * @returns {Promise<void>}
 */
async function addGamePlayed(guildId, userId, gameKey) {
    const path = `gameStats.${gameKey}.played`;
    await PlayerData.findOneAndUpdate(
        { guildId, userId },
        { $inc: { [path]: 1 } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a win in a named game.
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<void>}
 */
async function addGameWin(guildId, userId, gameKey) {
    const inc = {
        [`gameStats.${gameKey}.played`]: 1,
        [`gameStats.${gameKey}.wins`]: 1
    };
    await PlayerData.findOneAndUpdate(
        { guildId, userId },
        { $inc: inc },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Records a loss in a named game.
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<void>}
 */
async function addGameLoss(guildId, userId, gameKey) {
    const inc = {
        [`gameStats.${gameKey}.played`]: 1,
        [`gameStats.${gameKey}.losses`]: 1
    };
    await PlayerData.findOneAndUpdate(
        { guildId, userId },
        { $inc: inc },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Fetches the game stats for a user in a specific game.
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} gameKey 
 * @returns {Promise<{ played: number; wins: number; losses: number }>}
 */
async function getGameStats(guildId, userId, gameKey) {
    const pd = await getPlayerData(guildId, userId);
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