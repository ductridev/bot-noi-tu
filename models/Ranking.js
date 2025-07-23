const { Schema, model } = require('mongoose');

const Ranking = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  language: { type: String, enum: ['vi', 'en'], required: true },
  players: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    win: { type: Number, required: true },
    total: { type: Number, required: true },
    true: { type: Number, required: true }
  }]
});

Ranking.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model('Ranking', Ranking);