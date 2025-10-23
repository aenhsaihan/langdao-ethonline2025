const contractService = require('./contractService');
const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_delay_on_failure: 100,
  socket: {
    connectTimeout: 60000,
    lazyConnect: true
  }
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('end', () => console.log('Redis connection ended'));

// Initialize connection
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connection initialized');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// Configuration
const TUTOR_AVAILABILITY_TTL = parseInt(process.env.TUTOR_AVAILABILITY_TTL || '300'); // 5 minutes in seconds
const REQUEST_TTL = parseInt(process.env.REQUEST_TTL || '60'); // 1 minute in seconds

/**
 * Set a tutor as available for matching
 */
async function setTutorAvailable(socketId, tutorData) {
  try {
    const { address, language, ratePerSecond } = tutorData;
    
    // Validate input
    if (!address || !language || typeof ratePerSecond === 'undefined') {
      return { success: false, error: 'Missing required fields' };
    }

    // Verify tutor exists on-chain
    const tutorInfo = await contractService.getTutorInfo(address);
    if (!tutorInfo || !tutorInfo.isRegistered) {
      return { success: false, error: 'Tutor not registered on-chain' };
    }

    // Check for active session
    const activeSession = await contractService.getActiveSession(address);
    if (activeSession && activeSession.isActive) {
      return { success: false, error: 'Tutor has an active session' };
    }

    // Verify tutor teaches the language
    const tutorLanguages = await contractService.getTutorLanguages(address);
    if (!tutorLanguages || !tutorLanguages.includes(language)) {
      return { success: false, error: 'Tutor does not teach this language' };
    }

    // Get tutor's rate from contract
    const contractRate = await contractService.getTutorRate(address);
    if (Number(ratePerSecond) !== Number(contractRate)) {
      return { success: false, error: 'Rate mismatch with contract' };
    }

    const tutor = {
      socketId,
      address: address.toLowerCase(),
      language,
      ratePerSecond: Number(ratePerSecond),
      timestamp: Date.now(),
      ...tutorInfo
    };

    // Store tutor data with TTL
    await redisClient.setEx(
      `tutor:${socketId}`,
      TUTOR_AVAILABILITY_TTL,
      JSON.stringify(tutor)
    );

    // Store socket-to-user mapping
    await redisClient.setEx(
      `user:${socketId}`,
      TUTOR_AVAILABILITY_TTL,
      JSON.stringify({ type: 'tutor', address: address.toLowerCase() })
    );

    // Add to language-specific set for efficient querying
    await redisClient.sAdd(`tutors:lang:${language}`, socketId);
    await redisClient.expire(`tutors:lang:${language}`, TUTOR_AVAILABILITY_TTL);
    
    return { success: true, tutor };
  } catch (error) {
    console.error('Error setting tutor availability:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Remove a tutor from availability
 */
async function removeTutorAvailable(socketId) {
  try {
    // Get tutor data before deletion
    const tutorData = await redisClient.get(`tutor:${socketId}`);
    
    if (tutorData) {
      const tutor = JSON.parse(tutorData);
      
      // Remove from language-specific set
      await redisClient.sRem(`tutors:lang:${tutor.language}`, socketId);
    }

    // Delete tutor data
    await redisClient.del(`tutor:${socketId}`);
    
    // Delete user mapping
    await redisClient.del(`user:${socketId}`);
    
    return true;
  } catch (error) {
    console.error('Error removing tutor availability:', error);
    return false;
  }
}

/**
 * Find tutors matching student criteria
 */
async function findMatchingTutors({ language, budgetPerSecond, studentAddress }) {
  try {
    if (!language || typeof budgetPerSecond === 'undefined') {
      return [];
    }

    const budget = Number(budgetPerSecond);
    if (!Number.isFinite(budget) || budget <= 0) {
      return [];
    }

    // Get all tutors for the requested language
    const tutorSocketIds = await redisClient.sMembers(`tutors:lang:${language}`);
    
    if (!tutorSocketIds || tutorSocketIds.length === 0) {
      return [];
    }

    const matchingTutors = [];
    
    // Fetch and filter tutors
    for (const socketId of tutorSocketIds) {
      const tutorData = await redisClient.get(`tutor:${socketId}`);
      
      if (!tutorData) {
        // Clean up stale reference
        await redisClient.sRem(`tutors:lang:${language}`, socketId);
        continue;
      }

      const tutor = JSON.parse(tutorData);
      
      // Check budget constraint
      if (tutor.ratePerSecond > budget) {
        continue;
      }
      
      // Verify student can afford this tutor
      const canAfford = await contractService.canAffordRate(studentAddress, tutor.address);
      if (!canAfford) {
        continue;
      }
      
      matchingTutors.push({
        socketId: tutor.socketId,
        address: tutor.address,
        language: tutor.language,
        ratePerSecond: tutor.ratePerSecond,
        name: tutor.name || 'Unknown'
      });
    }

    return matchingTutors;
  } catch (error) {
    console.error('Error finding matching tutors:', error);
    return [];
  }
}

/**
 * Get all available tutors
 */
async function getAvailableTutors() {
  try {
    // Get all tutor keys
    const tutorKeys = await redisClient.keys('tutor:*');
    
    if (!tutorKeys || tutorKeys.length === 0) {
      return [];
    }

    const tutors = [];
    
    for (const key of tutorKeys) {
      const tutorData = await redisClient.get(key);
      
      if (tutorData) {
        const tutor = JSON.parse(tutorData);
        tutors.push({
          socketId: tutor.socketId,
          address: tutor.address,
          language: tutor.language,
          ratePerSecond: tutor.ratePerSecond,
          name: tutor.name || 'Unknown',
          timestamp: tutor.timestamp
        });
      }
    }

    return tutors;
  } catch (error) {
    console.error('Error getting available tutors:', error);
    return [];
  }
}

/**
 * Store a student request
 */
async function storeStudentRequest(requestId, requestData) {
  try {
    const request = {
      ...requestData,
      timestamp: Date.now()
    };
    
    await redisClient.setEx(
      `request:${requestId}`,
      REQUEST_TTL,
      JSON.stringify(request)
    );
    
    return true;
  } catch (error) {
    console.error('Error storing student request:', error);
    return false;
  }
}

/**
 * Get a student request
 */
async function getStudentRequest(requestId) {
  try {
    const requestData = await redisClient.get(`request:${requestId}`);
    
    if (!requestData) {
      return null;
    }
    
    return JSON.parse(requestData);
  } catch (error) {
    console.error('Error getting student request:', error);
    return null;
  }
}

/**
 * Remove a student request
 */
async function removeStudentRequest(requestId) {
  try {
    const result = await redisClient.del(`request:${requestId}`);
    return result > 0;
  } catch (error) {
    console.error('Error removing student request:', error);
    return false;
  }
}

/**
 * Get a specific tutor by address
 */
async function getTutorByAddress(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    // Get all tutor keys
    const tutorKeys = await redisClient.keys('tutor:*');
    
    for (const key of tutorKeys) {
      const tutorData = await redisClient.get(key);
      
      if (tutorData) {
        const tutor = JSON.parse(tutorData);
        if (tutor.address === normalizedAddress) {
          return {
            socketId: tutor.socketId,
            address: tutor.address,
            language: tutor.language,
            ratePerSecond: tutor.ratePerSecond,
            name: tutor.name || 'Unknown',
            timestamp: tutor.timestamp
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tutor by address:', error);
    return null;
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  setTutorAvailable,
  removeTutorAvailable,
  findMatchingTutors,
  getAvailableTutors,
  getTutorByAddress,
  storeStudentRequest,
  getStudentRequest,
  removeStudentRequest,
  cleanup
};