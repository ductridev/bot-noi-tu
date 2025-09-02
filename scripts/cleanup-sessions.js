/**
 * Database maintenance script for SicBo sessions
 * Run this script periodically to clean up old inactive sessions
 * 
 * Usage:
 * node scripts/cleanup-sessions.js [days]
 * 
 * Examples:
 * node scripts/cleanup-sessions.js     # Clean sessions older than 7 days (default)
 * node scripts/cleanup-sessions.js 14  # Clean sessions older than 14 days
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { cleanupOldSessions, getSessionStats } = require('../utils/session-cleanup');

async function main() {
    try {
        // Connect to MongoDB
        const connectionString = process.env.MONGODB_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('MONGODB_CONNECTION_STRING environment variable is not set');
        }
        await mongoose.connect(connectionString);
        console.log('Connected to MongoDB');

        // Get current stats
        const statsBefore = await getSessionStats();
        console.log('Sessions before cleanup:', statsBefore);

        // Get days from command line argument, default to 7
        const daysOld = parseInt(process.argv[2]) || 7;
        
        // Clean up old sessions
        const removedCount = await cleanupOldSessions(daysOld);
        
        // Get stats after cleanup
        const statsAfter = await getSessionStats();
        console.log('Sessions after cleanup:', statsAfter);
        
        console.log(`\nCleanup completed successfully!`);
        console.log(`Removed ${removedCount} old sessions (older than ${daysOld} days)`);
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the script
main().catch(console.error);
