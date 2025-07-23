const { Schema, model } = require('mongoose');

const DictionaryEntrySchema = new Schema({
  text: { type: String, required: true, lowercase: true, trim: true },
  language: { type: String, enum: ['vi', 'en'], required: true, index: true },
  source: [{ type: String }]
}, {
  timestamps: true
});

DictionaryEntrySchema.index({ text: 1, language: 1 }, { unique: true });

module.exports = model('DictionaryEntry', DictionaryEntrySchema);