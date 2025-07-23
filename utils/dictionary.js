const WordList = require('../models/WordList');

const DICTIONARY_NAME = 'official';
const REPORT_NAME = 'report';

/**
 * Check if a word exists in the official dictionary for a specific language.
 * @param {String} word
 * @param {'vi' | 'en'} language
 * @returns {Promise<Boolean>}
 */
const checkWordIfInDictionary = async (word, language = 'vi') => {
    const entry = await WordList.findOne({ name: DICTIONARY_NAME, language });
    return entry?.words.includes(word.toLowerCase()) || false;
};

/**
 * Count the number of words in the dictionary (excluding reported ones) for a specific language.
 * @param {'vi' | 'en'} language
 * @returns {Promise<Number>}
 */
const countWordInDictionary = async (language = 'vi') => {
    const [dic, report] = await Promise.all([
        WordList.findOne({ name: DICTIONARY_NAME, language }),
        WordList.findOne({ name: REPORT_NAME, language })
    ]);

    const dicWords = dic?.words || [];
    const reportWords = new Set(report?.words || []);
    return dicWords.filter(word => !reportWords.has(word)).length;
};

/**
 * Get the list of reported words for a specific language.
 * @param {'vi' | 'en'} language
 * @returns {Promise<String[]>}
 */
const getReportWords = async (language = 'vi') => {
    const report = await WordList.findOne({ name: REPORT_NAME, language });
    return report?.words || [];
};

/**
 * Check if a word exists in the report list for a specific language.
 * @param {String} word
 * @param {'vi' | 'en'} language
 * @returns {Promise<Boolean>}
 */
const checkWordIfInReportDictionary = async (word, language = 'vi') => {
    const report = await WordList.findOne({ name: REPORT_NAME, language });
    return report?.words.includes(word.toLowerCase()) || false;
};

/**
 * Add a word to the report list for a specific language.
 * @param {String} word
 * @param {'vi' | 'en'} language
 * @returns {Promise<void>}
 */
const addWordToReportList = async (word, language = 'vi') => {
    const lowercase = word.toLowerCase();
    await WordList.findOneAndUpdate(
        { name: REPORT_NAME, language },
        { $addToSet: { words: lowercase } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

module.exports = {
    checkWordIfInDictionary,
    countWordInDictionary,
    getReportWords,
    checkWordIfInReportDictionary,
    addWordToReportList
};
