const redis = require('redis');

// Use the same Redis client as the main app
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('SessionService Redis error:', err));

// Initialize connection
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('SessionService failed to connect to Redis:', error);
  }
})();

/**
 * Store session mapping when a session starts
 * @param {string} sessionId - The session/request ID
 * @param {string} studentAddress - Student's wallet address
 * @param {string} tutorAddress - Tutor's wallet address
 * @param {number} languageId - Language ID
 */
async function storeSessionMapping(sessionId, studentAddress, tutorAddress, languageId) {
  try {
    const sessionData = {
      sessionId,
      studentAddress: studentAddress.toLowerCase(),
      tutorAddress: tutorAddress.toLowerCase(),
      languageId: languageId.toString(),
      startTime: Date.now().toString(),
    };

    await redisClient.hSet(`session:${sessionId}`, sessionData);
    await redisClient.expire(`session:${sessionId}`, 86400); // 24 hours TTL

    console.log(`✅ Session mapping stored: ${sessionId} -> ${tutorAddress}`);
    return { success: true };
  } catch (error) {
    console.error('Error storing session mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get session mapping
 * @param {string} sessionId - The session/request ID
 * @returns {Object} Session data including tutor address
 */
async function getSessionMapping(sessionId) {
  try {
    const sessionData = await redisClient.hGetAll(`session:${sessionId}`);
    
    if (!sessionData || Object.keys(sessionData).length === 0) {
      return { success: false, message: 'Session not found' };
    }

    return {
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        studentAddress: sessionData.studentAddress,
        tutorAddress: sessionData.tutorAddress,
        languageId: parseInt(sessionData.languageId),
        startTime: parseInt(sessionData.startTime),
      },
    };
  } catch (error) {
    console.error('Error getting session mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove session mapping
 * @param {string} sessionId - The session/request ID
 */
async function removeSessionMapping(sessionId) {
  try {
    await redisClient.del(`session:${sessionId}`);
    console.log(`✅ Session mapping removed: ${sessionId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing session mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('Error during sessionService cleanup:', error);
  }
}

module.exports = {
  storeSessionMapping,
  getSessionMapping,
  removeSessionMapping,
  cleanup,
};
