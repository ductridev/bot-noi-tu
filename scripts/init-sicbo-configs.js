/**
 * Script to initialize default Sic Bo configurations
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SicBoConfig = require('../models/SicBoConfig');

async function initializeSicBoConfigs() {
    try {
        // Connect to MongoDB
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not set');
        }
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Default configurations with balanced multipliers
        const defaultConfigs = [
            { betType: 'Big', multiplier: 2 },
            { betType: 'Small', multiplier: 2 },
            { betType: 'SingleNumber', multipliers: [1, 2, 5] }, // 1 die, 2 dice, 3 dice
            { betType: 'SpecificDouble', multiplier: 8 },
            { betType: 'SpecificTriple', multiplier: 150 },
            { betType: 'AnyTriple', multiplier: 24 },
            { betType: 'TotalSum', multiplier: 6 }, // General multiplier, can be adjusted per sum
            { betType: 'DiceCombination', multiplier: 5 }
        ];

        console.log('Initializing Sic Bo configurations...');

        for (const config of defaultConfigs) {
            const result = await SicBoConfig.findOneAndUpdate(
                { betType: config.betType },
                config,
                { upsert: true, new: true }
            );
            console.log(`✅ ${config.betType}: ${config.multiplier || config.multipliers}`);
        }

        console.log('✅ All Sic Bo configurations initialized successfully!');
        
    } catch (error) {
        console.error('❌ Error initializing Sic Bo configs:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the initialization
initializeSicBoConfigs();
