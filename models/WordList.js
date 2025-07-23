const { Schema, model } = require('mongoose');

const WordList = new Schema({
    name: {
        type: String,
        enum: ['dictionary', 'contribute', 'official', 'report', 'premium'],
        required: true
    },
    language: { type: String, enum: ['vi', 'en'], required: true },
    words: [{ type: String }]
});

WordList.index({ name: 1, language: 1 }, { unique: true });

module.exports = model('WordList', WordList);