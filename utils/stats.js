// stats.js
const BotStats = require('../models/BotStats');

/**
 * Get global stats document by language.
 * @param {'vi' | 'en'} language 
 * @returns {Promise<import('../models/BotStats').IBotStats>}
 */
const getGlobalStatsDoc = async (language = 'vi') => {
    let doc = await BotStats.findOne({ key: 'global', language });
    if (!doc) {
        doc = await BotStats.create({ key: 'global', language });
    }
    return doc;
};

/**
 * @param {'vi' | 'en'} language
 * @returns {Promise<number>}
 */
const getQuery = async (language = 'vi') => {
    const stats = await getGlobalStatsDoc(language);
    return stats.queryCount;
};

/**
 * @param {number} amount
 * @param {'vi' | 'en'} language
 */
const addQuery = async (language = 'vi', amount = 1) => {
    await BotStats.findOneAndUpdate(
        { key: 'global', language },
        {
            $setOnInsert: { key: 'global', language },
            $inc: { queryCount: amount }
        },
        {
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

/**
 * @param {'vi' | 'en'} language
 * @returns {Promise<number>}
 */
const getWordPlayedCount = async (language = 'vi') => {
    const stats = await getGlobalStatsDoc(language);
    return stats.wordPlayedCount;
};

/**
 * @param {number} amount
 * @param {'vi' | 'en'} language
 */
const addWordPlayedCount = async (language = 'vi', amount = 1) => {
    await BotStats.findOneAndUpdate(
        { key: 'global', language },
        {
            $setOnInsert: { key: 'global', language },
            $inc: { wordPlayedCount: amount }
        },
        {
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

/**
 * @param {'vi' | 'en'} language
 * @returns {Promise<number>}
 */
const getRoundPlayedCount = async (language = 'vi') => {
    const stats = await getGlobalStatsDoc(language);
    return stats.roundPlayedCount;
};

/**
 * @param {number} amount
 * @param {'vi' | 'en'} language
 */
const addRoundPlayedCount = async (language = 'vi', amount = 1) => {
    await BotStats.findOneAndUpdate(
        { key: 'global', language },
        {
            $setOnInsert: { key: 'global', language },
            $inc: { roundPlayedCount: amount }
        },
        {
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

module.exports = {
    getQuery,
    addQuery,
    getWordPlayedCount,
    addWordPlayedCount,
    getRoundPlayedCount,
    addRoundPlayedCount
};
