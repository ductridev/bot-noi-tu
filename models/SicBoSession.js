const { Schema, model } = require('mongoose');

/**
 * @typedef {import('mongoose').Document & {
 *   guildId: string;
 *   channelId: string;
 *   messageId: string;
 *   isActive: boolean;
 *   bets: Array<{
 *     userId: string;
 *     userName: string;
 *     betType: string;
 *     betDetails: any;
 *     amount: number;
 *     timestamp: Date;
 *   }>;
 *   createdAt: Date;
 * }} ISicBoSession
 */

const BetSchema = new Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    betType: { type: String, required: true },
    betDetails: { type: Schema.Types.Mixed }, // For storing specific numbers, sums, combinations
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const SicBoSessionSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    bets: [BetSchema]
}, {
    timestamps: true
});

// Ensure only one active session per guild
SicBoSessionSchema.index({ guildId: 1, isActive: 1 }, { 
    unique: true, 
    partialFilterExpression: { isActive: true } 
});

module.exports = model('SicBoSession', SicBoSessionSchema);
