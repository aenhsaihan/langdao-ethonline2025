const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const sessionService = require('../services/sessionService');

// Import contract ABI from hardhat artifacts
const langDAOArtifact = require('../../../webapp/packages/hardhat/artifacts/contracts/LangDAO.sol/LangDAO.json');
const LANGDAO_ABI = langDAOArtifact.abi;
// Use deployed contract address from environment variable
const LANGDAO_ADDRESS = process.env.CONTRACT_ADDRESS || '0x4Fb5675e6baE48C95c1D4f1b154E3d5e8E36112C';

// Setup provider and wallet for backend transactions
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/3741fbd748fd416e8a866279e62ad5ef');
const backendWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Create contract instance
const langDAOContract = new ethers.Contract(LANGDAO_ADDRESS, LANGDAO_ABI, backendWallet);

// Store active sessions and their heartbeat status
const activeSessions = new Map();

/**
 * POST /api/webrtc-events
 * Receives events from the webRTC server
 */
router.post('/webrtc-events', async (req, res) => {
  try {
    const { type, sessionId, userRole, userAddress, timestamp, endedBy, reason } = req.body;

    console.log(`📡 WebRTC Event received:`, { type, sessionId, userRole, timestamp });

    switch (type) {
      case 'user-connected':
        handleUserConnected(sessionId, userRole, timestamp);
        break;

      case 'session-heartbeat':
        handleHeartbeat(sessionId, timestamp);
        break;

      case 'session-ended':
        await handleSessionEnded(sessionId, endedBy, userAddress, timestamp);
        break;

      case 'user-disconnected':
        await handleUserDisconnected(sessionId, userRole, reason, timestamp);
        break;

      default:
        console.log(`Unknown event type: ${type}`);
    }

    res.json({ success: true, message: 'Event processed' });
  } catch (error) {
    console.error('Error processing webRTC event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Handle user connection to webRTC session
 */
function handleUserConnected(sessionId, userRole, timestamp) {
  console.log(`✅ User connected: ${userRole} in session ${sessionId}`);

  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      startTime: timestamp,
      lastHeartbeat: timestamp,
      users: new Set(),
    });
  }

  activeSessions.get(sessionId).users.add(userRole);
}

/**
 * Handle heartbeat from webRTC session
 * This keeps the session alive and prevents automatic termination
 */
function handleHeartbeat(sessionId, timestamp) {
  console.log(`💓 Heartbeat for session ${sessionId}`);

  if (activeSessions.has(sessionId)) {
    activeSessions.get(sessionId).lastHeartbeat = timestamp;
  }
}

/**
 * Handle session ended by user clicking "End Call"
 * This should call endSession on the smart contract
 */
async function handleSessionEnded(sessionId, endedBy, userAddress, timestamp) {
  console.log(`🛑 Session ended by ${endedBy}: ${sessionId}`);

  try {
    // Get session mapping to find tutor address
    const sessionResult = await sessionService.getSessionMapping(sessionId);

    if (!sessionResult.success) {
      console.error(`Session mapping not found for ${sessionId}`);
      return;
    }

    const { tutorAddress, studentAddress } = sessionResult.session;
    console.log(`Session details: Student=${studentAddress}, Tutor=${tutorAddress}`);

    // Call endSession on the smart contract with tutor address
    console.log(`Calling endSession on smart contract for tutor: ${tutorAddress}`);

    const tx = await langDAOContract.endSession(tutorAddress);
    console.log(`Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Session ended on blockchain. Gas used: ${receipt.gasUsed.toString()}`);

    // Clean up local session data
    activeSessions.delete(sessionId);
    await sessionService.removeSessionMapping(sessionId);

  } catch (error) {
    console.error(`Error ending session on blockchain:`, error);
    throw error;
  }
}

/**
 * Handle user disconnection (connection lost, browser closed, etc.)
 * This should also call endSession after a grace period
 */
async function handleUserDisconnected(sessionId, userRole, reason, timestamp) {
  console.log(`⚠️ User disconnected: ${userRole} from session ${sessionId}. Reason: ${reason}`);

  const session = activeSessions.get(sessionId);
  if (!session) {
    console.log(`Session ${sessionId} not found in active sessions`);
    return;
  }

  // Remove user from session
  session.users.delete(userRole);

  // If all users have disconnected, end the session after a grace period
  if (session.users.size === 0) {
    console.log(`All users disconnected from session ${sessionId}. Ending session in 30 seconds...`);

    // Wait 30 seconds to see if anyone reconnects
    setTimeout(async () => {
      const currentSession = activeSessions.get(sessionId);
      if (currentSession && currentSession.users.size === 0) {
        console.log(`Grace period expired. Ending session ${sessionId} on blockchain...`);

        // TODO: Get tutor address from session data
        // For now, this is a placeholder
        // await handleSessionEnded(sessionId, 'system', tutorAddress, Date.now());
      }
    }, 30000);
  }
}

/**
 * Heartbeat monitor - checks for stale sessions
 * Runs every minute to check if any sessions haven't sent heartbeat in 2 minutes
 */
setInterval(() => {
  const now = Date.now();
  const HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes

  for (const [sessionId, session] of activeSessions.entries()) {
    const timeSinceLastHeartbeat = now - session.lastHeartbeat;

    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`⚠️ Session ${sessionId} has stale heartbeat (${Math.floor(timeSinceLastHeartbeat / 1000)}s). Ending session...`);

      // TODO: Get tutor address and end session
      // handleSessionEnded(sessionId, 'system', tutorAddress, now);
    }
  }
}, 60000); // Check every minute

module.exports = router;
