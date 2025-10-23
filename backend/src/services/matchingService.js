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
async function setTutorAvailable(address, language, ratePerSecond) {
  try {
    console.log(`Setting tutor ${address} available for ${language} at ${ratePerSecond} per second`);
    
    // Try to get tutor info from contract, fall back to mock data
    let tutorInfo;
    try {
      tutorInfo = await contractService.getTutorInfo(address);
      console.log('✅ Got tutor info from contract:', tutorInfo);
    } catch (error) {
      console.log('⚠️ Contract not available, using mock tutor data');
      tutorInfo = {
        address: address,
        name: `Tutor_${address.slice(-4)}`,
        languages: [language],
        ratePerSecond: ratePerSecond.toString(),
        isRegistered: true,
        mockData: true
      };
    }

    // Store in Redis
    const tutorData = {
      address,
      language,
      ratePerSecond: ratePerSecond.toString(),
      isAvailable: true,
      lastSeen: new Date().toISOString(),
      contractData: JSON.stringify(tutorInfo),
      socketId: null
    };

    await redisClient.hSet(`tutor:${address}`, {
  address,
  language,
  ratePerSecond: String(ratePerSecond),
  isAvailable: 'true',
  lastSeen: new Date().toISOString(),
  contractData: JSON.stringify(tutorInfo),
  socketId: ''
});
    await redisClient.sAdd('available_tutors', address);
    await redisClient.sAdd(`tutors:${language}`, address);

    // Set TTL for availability
    await redisClient.expire(`tutor:${address}`, TUTOR_AVAILABILITY_TTL);

    console.log(`✅ Tutor ${address} set as available`);
    return { success: true, tutor: tutorData };
  } catch (error) {
    console.error('Error setting tutor availability:', error);
    throw error;
  }
}

/**
 * Remove a tutor from availability
 */
async function removeTutorAvailable(address) {
  try {
    console.log(`Removing tutor ${address} from availability`);
    
    // Get tutor data to know which language sets to remove from
    const tutorData = await redisClient.hGetAll(`tutor:${address}`);
    
    if (tutorData && tutorData.language) {
      await redisClient.sRem(`tutors:${tutorData.language}`, address);
    }
    
    await redisClient.sRem('available_tutors', address);
    await redisClient.del(`tutor:${address}`);
    
    console.log(`✅ Tutor ${address} removed from availability`);
    return { success: true };
  } catch (error) {
    console.error('Error removing tutor availability:', error);
    throw error;
  }
}

/**
 * Find tutors matching student criteria
 */
async function findMatchingTutors({ language, budgetPerSecond, studentAddress }) {
  try {
    console.log(`Finding tutors for language: ${language}, budget: ${budgetPerSecond}`);
    
    // Get tutors for the specific language
    const tutorAddresses = await redisClient.sMembers(`tutors:${language}`);
    
    if (!tutorAddresses || tutorAddresses.length === 0) {
      return { success: true, tutors: [], message: `No tutors available for ${language}` };
    }
    
    const matchingTutors = [];
    
    for (const address of tutorAddresses) {
      const tutorData = await redisClient.hGetAll(`tutor:${address}`);
      
      if (tutorData && tutorData.isAvailable === 'true') {
        const tutorRate = parseFloat(tutorData.ratePerSecond);
        const studentBudget = parseFloat(budgetPerSecond);
        
        if (tutorRate <= studentBudget) {
          matchingTutors.push({
            address,
            language: tutorData.language,
            ratePerSecond: tutorData.ratePerSecond,
            lastSeen: tutorData.lastSeen,
            contractData: tutorData.contractData ? JSON.parse(tutorData.contractData) : null
          });
        }
      }
    }
    
    // Sort by rate (lowest first)
    matchingTutors.sort((a, b) => parseFloat(a.ratePerSecond) - parseFloat(b.ratePerSecond));
    
    console.log(`✅ Found ${matchingTutors.length} matching tutors`);
    return { success: true, tutors: matchingTutors };
  } catch (error) {
    console.error('Error finding matching tutors:', error);
    throw error;
  }
}

/**
 * Get all available tutors
 */
async function getAvailableTutors() {
  try {
    const tutorAddresses = await redisClient.sMembers('available_tutors');
    
    if (!tutorAddresses || tutorAddresses.length === 0) {
      return { success: true, tutors: [], message: 'No tutors currently available' };
    }
    
    const tutors = [];
    
    for (const address of tutorAddresses) {
      const tutorData = await redisClient.hGetAll(`tutor:${address}`);
      
      if (tutorData && tutorData.isAvailable === 'true') {
        tutors.push({
          address,
          language: tutorData.language,
          ratePerSecond: tutorData.ratePerSecond,
          lastSeen: tutorData.lastSeen,
          contractData: tutorData.contractData ? JSON.parse(tutorData.contractData) : null
        });
      }
    }
    
    console.log(`✅ Retrieved ${tutors.length} available tutors`);
    return { success: true, tutors };
  } catch (error) {
    console.error('Error getting available tutors:', error);
    throw error;
  }
}

/**
 * Store a student request
 */
async function storeStudentRequest(requestId, requestData) {
  try {
    const requestWithTimestamp = {
      ...requestData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    
    await redisClient.hSet(`request:${requestId}`, requestWithTimestamp);
    await redisClient.expire(`request:${requestId}`, REQUEST_TTL);
    
    console.log(`✅ Stored student request ${requestId}`);
    return { success: true };
  } catch (error) {
    console.error('Error storing student request:', error);
    throw error;
  }
}

/**
 * Get a student request
 */
async function getStudentRequest(requestId) {
  try {
    const requestData = await redisClient.hGetAll(`request:${requestId}`);
    
    if (!requestData || Object.keys(requestData).length === 0) {
      return { success: false, message: 'Request not found or expired' };
    }
    
    return { success: true, request: requestData };
  } catch (error) {
    console.error('Error getting student request:', error);
    throw error;
  }
}

/**
 * Remove a student request
 */
async function removeStudentRequest(requestId) {
  try {
    await redisClient.del(`request:${requestId}`);
    console.log(`✅ Removed student request ${requestId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing student request:', error);
    throw error;
  }
}

/**
 * Get a specific tutor by address
 */
async function getTutorByAddress(address) {
  try {
    const tutorData = await redisClient.hGetAll(`tutor:${address}`);
    
    if (!tutorData || Object.keys(tutorData).length === 0) {
      return { success: false, message: 'Tutor not found' };
    }
    
    return {
      success: true,
      tutor: {
        address,
        language: tutorData.language,
        ratePerSecond: tutorData.ratePerSecond,
        isAvailable: tutorData.isAvailable === 'true',
        lastSeen: tutorData.lastSeen,
        contractData: tutorData.contractData ? JSON.parse(tutorData.contractData) : null
      }
    };
  } catch (error) {
    console.error('Error getting tutor by address:', error);
    throw error;
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
  try {
    console.log('Cleaning up matching service...');
    await redisClient.quit();
    console.log('✅ Matching service cleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
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
  cleanup,
  redisClient
};