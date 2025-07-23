const { Schema, model } = require('mongoose');

/**
 * @typedef {import('mongoose').Document & {
 *   key: string;
 *   queryCount: number;
 *   wordPlayedCount: number;
 *   roundPlayedCount: number;
 * }} IBotStats
 */

const BotStatsSchema = new Schema({
    key: { type: String, default: 'global', index: true },
    language: { type: String, enum: ['vi', 'en'], default: 'vi', index: true },
    queryCount: { type: Number, default: 0 },
    wordPlayedCount: { type: Number, default: 0 },
    roundPlayedCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

BotStatsSchema.index({ key: 1, language: 1 }, { unique: true });

module.exports = model('BotStats', BotStatsSchema);
