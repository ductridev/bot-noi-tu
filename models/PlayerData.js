const { Schema, model } = require('mongoose');

/**
 * @typedef {Object & {
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
    userId: { type: String, required: true, unique: true, index: true },
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

module.exports = model('PlayerData', PlayerDataSchema);
