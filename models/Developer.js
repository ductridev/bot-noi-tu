const { Schema, model } = require('mongoose');

const DeveloperSchema = new Schema({
    userId: { type: String, required: true, unique: true }
});

module.exports = model('Developer', DeveloperSchema);
