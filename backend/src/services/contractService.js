const { ethers } = require("ethers");

class ContractService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initializeProvider();
  }

  /**
   * Initialize the provider and contract connection
   */
  initializeProvider() {
    try {
      // Use environment variables for configuration
      const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!contractAddress) {
        console.warn("CONTRACT_ADDRESS not set in environment variables");
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Contract ABI from deployed LangDAO contract
      const contractABI = [
        {
          inputs: [
            { internalType: "address", name: "_owner", type: "address" },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [
            { internalType: "address", name: "_tutorAddress", type: "address" },
            { internalType: "uint256", name: "_language", type: "uint256" },
            { internalType: "address", name: "_token", type: "address" },
          ],
          name: "startSession",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "tutorAddress", type: "address" },
          ],
          name: "endSession",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "_targetLanguage",
              type: "uint256",
            },
            { internalType: "uint256", name: "_budgetPerSec", type: "uint256" },
          ],
          name: "registerStudent",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256[]",
              name: "_languages",
              type: "uint256[]",
            },
            {
              internalType: "uint256",
              name: "_ratePerSecond",
              type: "uint256",
            },
          ],
          name: "registerTutor",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_tutor", type: "address" },
          ],
          name: "getTutorInfo",
          outputs: [
            { internalType: "uint256", name: "totalEarnings", type: "uint256" },
            { internalType: "uint256", name: "sessionCount", type: "uint256" },
            { internalType: "bool", name: "isRegistered", type: "bool" },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_student", type: "address" },
          ],
          name: "getStudentInfo",
          outputs: [
            {
              internalType: "uint256",
              name: "targetLanguage",
              type: "uint256",
            },
            { internalType: "uint256", name: "budgetPerSec", type: "uint256" },
            { internalType: "bool", name: "isRegistered", type: "bool" },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "_studentAddress",
              type: "address",
            },
            { internalType: "address", name: "_tutorAddress", type: "address" },
          ],
          name: "canAffordRate",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "_studentAddress",
              type: "address",
            },
            { internalType: "address", name: "_tutorAddress", type: "address" },
            { internalType: "address", name: "_token", type: "address" },
          ],
          name: "hasSufficientBalance",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_tutor", type: "address" },
            { internalType: "uint256", name: "_language", type: "uint256" },
          ],
          name: "getTutorLanguage",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_tutor", type: "address" },
            { internalType: "uint256", name: "_language", type: "uint256" },
          ],
          name: "getTutorRate",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "student", type: "address" },
          ],
          name: "isStudying",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [{ internalType: "address", name: "tutor", type: "address" }],
          name: "activeSessions",
          outputs: [
            { internalType: "address", name: "student", type: "address" },
            { internalType: "address", name: "tutor", type: "address" },
            { internalType: "address", name: "token", type: "address" },
            { internalType: "uint256", name: "startTime", type: "uint256" },
            { internalType: "uint256", name: "endTime", type: "uint256" },
            { internalType: "uint256", name: "ratePerSecond", type: "uint256" },
            { internalType: "uint256", name: "totalPaid", type: "uint256" },
            { internalType: "uint256", name: "language", type: "uint256" },
            { internalType: "uint256", name: "id", type: "uint256" },
            { internalType: "bool", name: "isActive", type: "bool" },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
          ],
          name: "depositFunds",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
          ],
          name: "withdrawFunds",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { internalType: "uint256", name: "_budgetPerSec", type: "uint256" },
          ],
          name: "updateBudget",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { internalType: "uint256", name: "_language", type: "uint256" },
            {
              internalType: "uint256",
              name: "_ratePerSecond",
              type: "uint256",
            },
          ],
          name: "updateRate",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];

      this.contract = new ethers.Contract(
        contractAddress,
        contractABI,
        this.provider
      );
      console.log("Contract service initialized");
    } catch (error) {
      console.error("Failed to initialize contract service:", error);
    }
  }

  /**
   * Start a session between student and tutor
   * @param {Object} sessionData - Session data
   * @returns {Object} Transaction result
   */
  async startSession(sessionData) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      console.log("startSession called with:", sessionData);

      const { studentAddress, tutorAddress, language, tokenAddress } =
        sessionData;

      // Create a signer for the student (they need to sign the transaction)
      // In a real implementation, you'd get the private key from the frontend
      // For now, we'll return the transaction data for the frontend to sign

      const txData = {
        to: this.contract.target,
        data: this.contract.interface.encodeFunctionData("startSession", [
          tutorAddress,
          language,
          tokenAddress,
        ]),
      };

      return {
        success: true,
        transactionData: txData,
        message: "Transaction data prepared for signing",
      };
    } catch (error) {
      console.error("Failed to start session:", error);
      throw error;
    }
  }

  /**
   * End a session
   * @param {Object} sessionData - Session data
   * @returns {Object} Transaction result
   */
  async endSession(sessionData) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const { tutorAddress } = sessionData;

      const txData = {
        to: this.contract.target,
        data: this.contract.interface.encodeFunctionData("endSession", [
          tutorAddress,
        ]),
      };

      return {
        success: true,
        transactionData: txData,
        message: "End session transaction prepared",
      };
    } catch (error) {
      console.error("Failed to end session:", error);
      throw error;
    }
  }

  /**
   * Get tutor information from contract
   * @param {string} tutorAddress - Tutor wallet address
   * @returns {Object} Tutor information
   */
  async getTutorInfo(tutorAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const [totalEarnings, sessionCount, isRegistered] =
        await this.contract.getTutorInfo(tutorAddress);

      return {
        address: tutorAddress,
        totalEarnings: totalEarnings.toString(),
        sessionCount: sessionCount.toString(),
        isRegistered,
      };
    } catch (error) {
      console.error("Failed to get tutor info:", error);
      throw error;
    }
  }

  /**
   * Get student information from contract
   * @param {string} studentAddress - Student wallet address
   * @returns {Object} Student information
   */
  async getStudentInfo(studentAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const [targetLanguage, budgetPerSec, isRegistered] =
        await this.contract.getStudentInfo(studentAddress);

      return {
        address: studentAddress,
        targetLanguage: targetLanguage.toString(),
        budgetPerSec: budgetPerSec.toString(),
        isRegistered,
      };
    } catch (error) {
      console.error("Failed to get student info:", error);
      throw error;
    }
  }

  /**
   * Validate that a student can afford a tutor's rate
   * @param {string} studentAddress - Student wallet address
   * @param {string} tutorAddress - Tutor wallet address
   * @returns {boolean} Whether student can afford the rate
   */
  async canAffordRate(studentAddress, tutorAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      return await this.contract.canAffordRate(studentAddress, tutorAddress);
    } catch (error) {
      console.error("Failed to check affordability:", error);
      return false;
    }
  }

  /**
   * Check if a tutor teaches a specific language
   * @param {string} tutorAddress - Tutor wallet address
   * @param {number} language - Language ID
   * @returns {boolean} Whether tutor teaches the language
   */
  async getTutorLanguage(tutorAddress, language) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      return await this.contract.getTutorLanguage(tutorAddress, language);
    } catch (error) {
      console.error("Failed to check tutor language:", error);
      return false;
    }
  }

  /**
   * Get tutor's rate for a specific language
   * @param {string} tutorAddress - Tutor wallet address
   * @param {number} language - Language ID
   * @returns {string} Rate per second in wei
   */
  async getTutorRate(tutorAddress, language) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const rate = await this.contract.getTutorRate(tutorAddress, language);
      return rate.toString();
    } catch (error) {
      console.error("Failed to get tutor rate:", error);
      return "0";
    }
  }

  /**
   * Check if student is currently studying
   * @param {string} studentAddress - Student wallet address
   * @returns {boolean} Whether student is studying
   */
  async isStudying(studentAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      return await this.contract.isStudying(studentAddress);
    } catch (error) {
      console.error("Failed to check studying status:", error);
      return false;
    }
  }

  /**
   * Get active session for a tutor
   * @param {string} tutorAddress - Tutor wallet address
   * @returns {Object|null} Active session data or null
   */
  async getActiveSession(tutorAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const session = await this.contract.activeSessions(tutorAddress);

      // Check if session is active
      if (!session.isActive) {
        return null;
      }

      return {
        student: session.student,
        tutor: session.tutor,
        token: session.token,
        startTime: session.startTime.toString(),
        endTime: session.endTime.toString(),
        ratePerSecond: session.ratePerSecond.toString(),
        totalPaid: session.totalPaid.toString(),
        language: session.language.toString(),
        id: session.id.toString(),
        isActive: session.isActive,
      };
    } catch (error) {
      console.error("Failed to get active session:", error);
      return null;
    }
  }

  /**
   * Check if student has sufficient balance for a session
   * @param {string} studentAddress - Student wallet address
   * @param {string} tutorAddress - Tutor wallet address
   * @param {string} tokenAddress - Token contract address
   * @returns {boolean} Whether student has sufficient balance
   */
  async hasSufficientBalance(studentAddress, tutorAddress, tokenAddress) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      return await this.contract.hasSufficientBalance(
        studentAddress,
        tutorAddress,
        tokenAddress
      );
    } catch (error) {
      console.error("Failed to check sufficient balance:", error);
      return false;
    }
  }
}

module.exports = new ContractService();
