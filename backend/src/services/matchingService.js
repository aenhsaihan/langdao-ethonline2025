const { v4: uuidv4 } = require("uuid");
const contractService = require("./contractService");

class MatchingService {
  constructor() {
    // In-memory storage (in production, use Redis)
    this.availableTutors = new Map(); // socketId -> tutor data
    this.studentRequests = new Map(); // requestId -> request data
    this.socketToUser = new Map(); // socketId -> user type and address
  }

  /**
   * Set tutor as available
   * @param {string} socketId - WebSocket connection ID
   * @param {Object} tutorData - Tutor information
   */
  async setTutorAvailable(socketId, tutorData) {
    try {
      // Validate tutor is registered on contract
      const tutorInfo = await contractService.getTutorInfo(tutorData.address);
      if (!tutorInfo.isRegistered) {
        throw new Error("Tutor not registered on contract");
      }

      // Check if tutor has an active session
      const activeSession = await contractService.getActiveSession(
        tutorData.address
      );
      if (activeSession) {
        throw new Error("Tutor already has an active session");
      }

      const tutor = {
        socketId,
        address: tutorData.address,
        languages: tutorData.languages, // Array of language IDs
        rates: tutorData.rates, // Object mapping language -> rate per second
        isAvailable: true,
        lastSeen: Date.now(),
        totalEarnings: tutorInfo.totalEarnings,
        sessionCount: tutorInfo.sessionCount,
      };

      this.availableTutors.set(socketId, tutor);
      this.socketToUser.set(socketId, {
        type: "tutor",
        address: tutorData.address,
      });

      console.log(`Tutor ${tutorData.address} is now available`);
    } catch (error) {
      console.error(`Failed to set tutor available: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set tutor as unavailable
   * @param {string} socketId - WebSocket connection ID
   */
  setTutorUnavailable(socketId) {
    this.availableTutors.delete(socketId);
    this.socketToUser.delete(socketId);
    console.log(`Tutor ${socketId} is now unavailable`);
  }

  /**
   * Find tutors that match student requirements
   * @param {Object} studentRequest - Student request data
   * @returns {Array} Array of matching tutors
   */
  async findMatchingTutors(studentRequest) {
    const { language, budgetPerSecond, studentAddress } = studentRequest;
    const matchingTutors = [];

    for (const [socketId, tutor] of this.availableTutors) {
      try {
        // Check if tutor teaches the requested language on contract
        const teachesLanguage = await contractService.getTutorLanguage(
          tutor.address,
          language
        );
        if (!teachesLanguage) {
          continue;
        }

        // Get tutor's rate from contract
        const tutorRate = await contractService.getTutorRate(
          tutor.address,
          language
        );
        if (parseInt(tutorRate) > parseInt(budgetPerSecond)) {
          continue;
        }

        // Check if student can afford this tutor
        const canAfford = await contractService.canAffordRate(
          studentAddress,
          tutor.address
        );
        if (!canAfford) {
          continue;
        }

        matchingTutors.push({
          socketId: tutor.socketId,
          address: tutor.address,
          rate: tutorRate,
          languages: tutor.languages,
          totalEarnings: tutor.totalEarnings,
          sessionCount: tutor.sessionCount,
        });
      } catch (error) {
        console.error(`Error checking tutor ${tutor.address}:`, error);
        continue;
      }
    }

    return matchingTutors;
  }

  /**
   * Create a new student request
   * @param {Object} requestData - Student request data
   * @returns {string} Request ID
   */
  createStudentRequest(requestData) {
    const requestId = uuidv4();
    const request = {
      id: requestId,
      studentAddress: requestData.studentAddress,
      language: requestData.language,
      budgetPerSecond: requestData.budgetPerSecond,
      timestamp: Date.now(),
      responses: [],
    };

    this.studentRequests.set(requestId, request);
    return requestId;
  }

  /**
   * Get student socket ID by request ID
   * @param {string} requestId - Request ID
   * @returns {string|null} Student socket ID
   */
  getStudentSocketId(requestId) {
    // In a real implementation, you'd store this mapping
    // For now, we'll need to track this differently
    return null; // TODO: Implement proper mapping
  }

  /**
   * Get tutor socket ID by address
   * @param {string} tutorAddress - Tutor wallet address
   * @returns {string|null} Tutor socket ID
   */
  getTutorSocketId(tutorAddress) {
    for (const [socketId, tutor] of this.availableTutors) {
      if (tutor.address.toLowerCase() === tutorAddress.toLowerCase()) {
        return socketId;
      }
    }
    return null;
  }

  /**
   * Handle user disconnection
   * @param {string} socketId - WebSocket connection ID
   */
  handleDisconnection(socketId) {
    const user = this.socketToUser.get(socketId);

    if (user && user.type === "tutor") {
      this.setTutorUnavailable(socketId);
    }

    // Clean up any pending requests
    this.socketToUser.delete(socketId);
  }

  /**
   * Get all available tutors (for debugging/admin)
   * @returns {Array} Array of available tutors
   */
  getAvailableTutors() {
    return Array.from(this.availableTutors.values());
  }

  /**
   * Get tutor by address
   * @param {string} address - Tutor wallet address
   * @returns {Object|null} Tutor data
   */
  getTutorByAddress(address) {
    for (const tutor of this.availableTutors.values()) {
      if (tutor.address.toLowerCase() === address.toLowerCase()) {
        return tutor;
      }
    }
    return null;
  }
}

module.exports = new MatchingService();
