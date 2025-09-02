const channelLocks = new Map();

/**
 * Wait until the current lock (if any) is released, then acquire it.
 */
const withChannelLock = async (channelId, fn) => {
    while (channelLocks.has(channelId)) {
        await Promise.race([
            channelLocks.get(channelId),
            new Promise(resolve => setTimeout(resolve, 5000)) // max wait 5s
        ]);
    }

    let release;
    const lockPromise = new Promise(resolve => { release = resolve; });
    channelLocks.set(channelId, lockPromise);

    try {
        await fn();
    } finally {
        channelLocks.delete(channelId);
        release();
    }
};

module.exports = {
    channelLocks,
    withChannelLock,
};