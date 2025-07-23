const { Schema, model } = require('mongoose');

const GameSession = new Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    language: { type: String, enum: ['vi', 'en'], required: true },
    running: { type: Boolean, required: true },
    words: [{ type: String, required: true }],
    currentPlayer: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
    queryCount: { type: Number, default: 0, required: true },
    wordPlayed: { type: Number, default: 0, required: true },
    roundPlayed: { type: Number, default: 0, required: true }
});

GameSession.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model('GameSession', GameSession);