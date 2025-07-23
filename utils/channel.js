const GuildConfig = require('../models/GuildConfig');

/**
 * Set or update the channel for a specific language in a guild.
 * @param {string} guildId
 * @param {string} channelId
 * @param {'vi'|'en'} language
 * @returns {Promise<void>}
 */
const setChannel = async (guildId, channelId, language = 'vi') => {
    try {
        const config = await GuildConfig.findOne({ guildId });

        if (!config) {
            // If config doesn't exist, create it
            await GuildConfig.create({
                guildId,
                channels: [{ channelId, language }]
            });
        } else {
            const existingIndex = config.channels.findIndex(ch => ch.language === language);
            if (existingIndex !== -1) {
                // Update existing entry for the language
                config.channels[existingIndex].channelId = channelId;
            } else {
                // Add new entry
                config.channels.push({ channelId, language });
            }
            await config.save();
        }
    } catch (err) {
        console.error(`[setChannel] Failed to set channel for ${guildId} (${language}):`, err);
    }
};

/**
 * Get the saved channelId for a guild and language.
 * @param {string} guildId
 * @param {'vi'|'en'} language
 * @returns {Promise<string|null>}
 */
const getChannel = async (guildId, language = 'vi') => {
    const config = await GuildConfig.findOne({ guildId }).lean();
    const entry = config?.channels?.find(ch => ch.language === language);
    return entry?.channelId || null;
};

/**
 * Determine the language used in a given channelId.
 * @param {string} guildId
 * @param {string} channelId
 * @returns {Promise<'vi' | 'en' | null>}
 */
const getLanguageByChannel = async (guildId, channelId) => {
    const config = await GuildConfig.findOne({ guildId }).lean();
    const entry = config?.channels?.find(ch => ch.channelId === channelId);
    return entry?.language || null;
};

module.exports = {
    setChannel,
    getChannel,
    getLanguageByChannel
};
