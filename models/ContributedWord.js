const { Schema, model } = require('mongoose');

const ContributedWordSchema = new Schema({
    text: { type: String, required: true, lowercase: true, trim: true },
    language: { type: String, enum: ['vi', 'en'], required: true, index: true }
}, {
    timestamps: true
});

ContributedWordSchema.index({ text: 1, language: 1 }, { unique: true });

module.exports = model('ContributedWord', ContributedWordSchema);