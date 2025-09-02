const SicBoSession = require('../models/SicBoSession');

/**
 * Clean up old inactive sessions (older than specified days)
 * This is an optional maintenance function
 * @param {number} daysOld - Remove sessions older than this many days (default: 7)
 * @returns {Promise<number>} Number of sessions removed
 */
async function cleanupOldSessions(daysOld = 7) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await SicBoSession.deleteMany({
            isActive: false,
            updatedAt: { $lt: cutoffDate }
        });
        
        console.log(`Cleaned up ${result.deletedCount} old inactive sessions (older than ${daysOld} days)`);
        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up old sessions:', error);
        return 0;
    }
}

/**
 * Get statistics about sessions in the database
 * @returns {Promise<object>} Session statistics
 */
async function getSessionStats() {
    try {
        const total = await SicBoSession.countDocuments();
        const active = await SicBoSession.countDocuments({ isActive: true });
        const inactive = await SicBoSession.countDocuments({ isActive: false });
        
        return {
            total,
            active,
            inactive
        };
    } catch (error) {
        console.error('Error getting session stats:', error);
        return { total: 0, active: 0, inactive: 0 };
    }
}

module.exports = {
    cleanupOldSessions,
    getSessionStats
};
