const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.abi = null;
    this.initialized = false;
    this.initializing = null;
    this.enableFallback = (process.env.ALLOW_CONTRACT_FALLBACK || 'true').toLowerCase() !== 'false';
    
    console.log('ContractService: Constructor called, enableFallback:', this.enableFallback);
  }

  async init() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
        const contractAddress = process.env.CONTRACT_ADDRESS;

        console.log('ContractService: Initializing...');
        console.log('RPC_URL:', rpcUrl);
        console.log('CONTRACT_ADDRESS:', contractAddress);

        if (!rpcUrl) {
          console.warn('ContractService: RPC_URL not set.');
          return;
        }
        if (!contractAddress) {
          console.warn('ContractService: CONTRACT_ADDRESS not set.');
          return;
        }

        // Test provider connection
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        try {
          const network = await this.provider.getNetwork();
          console.log('ContractService: Connected to network:', network.chainId);
        } catch (err) {
          console.warn('ContractService: Failed to connect to network:', err.message);
          this.provider = null;
          return;
        }

        // Try to load ABI from deployment artifact
        let abiPath = process.env.CONTRACT_ABI_PATH;
        if (!abiPath) {
          // Default to Hardhat deployment artifact
          abiPath = path.resolve(
            __dirname,
            '../../../webapp/packages/hardhat/deployments/localhost/LangDAO.json'
          );
        }

        console.log('ContractService: Looking for ABI at:', abiPath);

        if (fs.existsSync(abiPath)) {
          try {
            const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
            this.abi = artifact.abi;
            console.log('ContractService: ABI loaded successfully');
          } catch (err) {
            console.warn('ContractService: Failed to parse ABI file:', err.message);
          }
        } else {
          console.warn('ContractService: ABI file not found at:', abiPath);
          // Fallback to basic ABI for testing
          this.abi = [
            "function getTutor(address) view returns (string memory name, string[] memory languages, uint256 ratePerSecond, uint256 totalSessions, uint256 rating, bool isRegistered)",
            "function getStudent(address) view returns (string memory name, uint256 totalSessions, uint256 averageRating, bool isRegistered)",
            "function recordSession(address tutor, address student, uint256 duration, uint256 cost) external",
            "function endSession(address tutorAddress) external"
          ];
          console.log('ContractService: Using fallback ABI');
        }

        if (!this.abi) {
          console.warn('ContractService: No ABI available');
          return;
        }

        // Create contract instance
        this.contract = new ethers.Contract(contractAddress, this.abi, this.provider);

        // Optionally attach signer if PRIVATE_KEY is set
        const pk = process.env.PRIVATE_KEY;
        if (pk && pk !== 'your_private_key_here' && /^0x[0-9a-fA-F]{64}$/.test(pk)) {
          try {
            this.signer = new ethers.Wallet(pk, this.provider);
            this.contract = this.contract.connect(this.signer);
            console.log('ContractService: Signer attached for write operations');
          } catch (e) {
            console.warn('ContractService: Failed to attach signer:', e.message);
          }
        }

        console.log('ContractService: Initialized successfully');
        this.initialized = true;
      } catch (err) {
        console.warn('ContractService: Initialization failed:', err.message);
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  isContractAvailable() {
    return !!this.contract;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      provider: !!this.provider,
      contract: !!this.contract,
      signer: !!this.signer,
      mode: this.isContractAvailable() ? 'blockchain' : (this.enableFallback ? 'redis-only' : 'unavailable'),
    };
  }

  async getTutorInfo(address) {
    await this.init();

    if (this.contract) {
      try {
        console.log('ContractService: Calling getTutor for address:', address);
        
        // Try the contract call
        const tutorData = await this.contract.getTutor(address);
        
        console.log('ContractService: Got tutor data from contract:', tutorData);
        
        return {
          address,
          name: tutorData[0] || tutorData.name || `Tutor_${address.slice(-4)}`,
          languages: tutorData[1] || tutorData.languages || ['english'],
          ratePerSecond: String(tutorData[2] || tutorData.ratePerSecond || '0.001'),
          totalSessions: Number(tutorData[3] || tutorData.totalSessions || 0),
          rating: Number(tutorData[4] || tutorData.rating || 0),
          isRegistered: Boolean(tutorData[5] !== undefined ? tutorData[5] : tutorData.isRegistered !== undefined ? tutorData.isRegistered : true),
        };
      } catch (e) {
        console.warn('ContractService.getTutorInfo: Contract call failed:', e.message);
        if (!this.enableFallback) {
          throw new Error('Failed to fetch tutor information from contract');
        }
      }
    }

    // Fallback (mock) for dev/test
    if (this.enableFallback) {
      console.log('ContractService: Using mock data for tutor:', address);
      return {
        address,
        name: `MockTutor_${address?.slice?.(-4) || '0000'}`,
        languages: ['english', 'spanish'],
        ratePerSecond: '0.001',
        totalSessions: 5,
        rating: 4.5,
        isRegistered: true,
        mockData: true,
      };
    }

    throw new Error('Contract not available and fallback disabled');
  }

  async getStudentInfo(address) {
    await this.init();

    if (this.contract) {
      try {
        console.log('ContractService: Calling getStudent for address:', address);
        
        const studentData = await this.contract.getStudent(address);
        
        return {
          address,
          name: studentData[0] || studentData.name || `Student_${address.slice(-4)}`,
          totalSessions: Number(studentData[1] || studentData.totalSessions || 0),
          averageRating: Number(studentData[2] || studentData.averageRating || 0),
          isRegistered: Boolean(studentData[3] !== undefined ? studentData[3] : studentData.isRegistered !== undefined ? studentData.isRegistered : true),
        };
      } catch (e) {
        console.warn('ContractService.getStudentInfo: Contract call failed:', e.message);
        if (!this.enableFallback) {
          throw new Error('Failed to fetch student information from contract');
        }
      }
    }

    if (this.enableFallback) {
      console.log('ContractService: Using mock data for student:', address);
      return {
        address,
        name: `MockStudent_${address?.slice?.(-4) || '0000'}`,
        totalSessions: 3,
        averageRating: 4.2,
        isRegistered: true,
        mockData: true,
      };
    }

    throw new Error('Contract not available and fallback disabled');
  }

  async recordSession(tutorAddress, studentAddress, duration, cost) {
    await this.init();

    if (this.contract && this.signer) {
      try {
        console.log('ContractService: Recording session on blockchain');
        const tx = await this.contract.recordSession(tutorAddress, studentAddress, duration, cost);
        const receipt = await tx.wait();
        return { success: true, txHash: receipt?.hash };
      } catch (e) {
        console.warn('ContractService.recordSession: Failed:', e.message);
        if (!this.enableFallback) {
          throw new Error('Failed to record session on blockchain');
        }
      }
    }

    if (this.enableFallback) {
      console.log('ContractService: Mock session recording');
      return {
        success: true,
        mockData: true,
        message: 'Session would be recorded on-chain when signer/contract is available',
      };
    }

    throw new Error('Contract not available and fallback disabled');
  }
}

module.exports = new ContractService();
