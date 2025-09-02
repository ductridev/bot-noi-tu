const { Schema, model } = require('mongoose');

/**
 * @typedef {import('mongoose').Document & {
 *   betType: string;
 *   multiplier?: number;
 *   multipliers?: number[];
 * }} ISicBoConfig
 */

const SicBoConfigSchema = new Schema({
    betType: { 
        type: String, 
        required: true, 
        unique: true,
        enum: [
            'Big', 'Small', 'SingleNumber', 'SpecificDouble', 
            'SpecificTriple', 'AnyTriple', 'TotalSum', 'DiceCombination'
        ]
    },
    multiplier: { type: Number }, // For most bet types
    multipliers: [{ type: Number }] // For SingleNumber (1, 2, 5 dice appearances)
}, {
    timestamps: true
});

module.exports = model('SicBoConfig', SicBoConfigSchema);
