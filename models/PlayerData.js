const { Schema, model } = require('mongoose');

/**
 * @typedef {import('mongoose').Document & {
 *   guildId: string;
 *   userId: string;
 *   coins: number;
 *   gameStats: Record<string, {
 *     played: number;
 *     wins: number;
 *     losses: number;
 *   }>;
 * }} IPlayerData
 */

const GameStatSchema = new Schema({
    played: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
}, { _id: false });

const PlayerDataSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    coins: { type: Number, default: 0 },
    // dynamic map of per‐game stats, keyed by game name/identifier
    gameStats: {
        type: Map,
        of: GameStatSchema,
        default: {}
    }
}, {
    timestamps: true
});

// ensure one document per (guildId, userId)
PlayerDataSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('PlayerData', PlayerDataSchema);
