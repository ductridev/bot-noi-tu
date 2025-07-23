const { Schema, model } = require('mongoose');

const GuildConfig = new Schema({
    guildId: { type: String, required: true },
    channels: [{
        channelId: { type: String, required: true },
        language: { type: String, enum: ['vi', 'en'], required: true }
    }]
});

GuildConfig.index({ guildId: 1 });
GuildConfig.index({ 'channels.channelId': 1 });

module.exports = model('GuildConfig', GuildConfig);