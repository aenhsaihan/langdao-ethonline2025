const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const sessionService = require('../services/sessionService');
const contractService = require('../services/contractService');

/**
 * WebRTC signaling routes for peer-to-peer video sessions
 */

// Store active rooms and their participants
const activeRooms = new Map();

/**
 * Create or join a WebRTC room
 */
router.post('/room/join', async (req, res) => {
  try {
    const { roomId, userId, userType } = req.body;

    if (!roomId || !userId || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roomId, userId, userType'
      });
    }

    if (!['tutor', 'student'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'userType must be either "tutor" or "student"'
      });
    }

    // Get or create room
    let room = activeRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        participants: [],
        createdAt: new Date().toISOString(),
        status: 'waiting'
      };
      activeRooms.set(roomId, room);
    }

    // Check if user already in room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      return res.json({
        success: true,
        room,
        message: 'Already in room'
      });
    }

    // Add participant
    room.participants.push({
      userId,
      userType,
      joinedAt: new Date().toISOString(),
      status: 'connected'
    });

    // Update room status
    if (room.participants.length === 2) {
      room.status = 'active';
    }

    res.json({
      success: true,
      room,
      message: 'Successfully joined room'
    });

  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Leave a WebRTC room
 */
router.post('/room/leave', async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roomId, userId'
      });
    }

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Remove participant
    room.participants = room.participants.filter(p => p.userId !== userId);

    // Update room status
    if (room.participants.length === 0) {
      activeRooms.delete(roomId);
    } else if (room.participants.length === 1) {
      room.status = 'waiting';
    }

    res.json({
      success: true,
      message: 'Successfully left room',
      room: room.participants.length > 0 ? room : null
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get room information
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.json({
      success: true,
      room
    });

  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get all active rooms
 */
router.get('/rooms', async (req, res) => {
  try {
    const rooms = Array.from(activeRooms.values());
    
    res.json({
      success: true,
      rooms,
      total: rooms.length
    });

  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * WebRTC signaling endpoint for offer/answer/ice-candidate exchange
 */
router.post('/signal', async (req, res) => {
  try {
    const { roomId, type, data, from, to } = req.body;

    if (!roomId || !type || !from) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roomId, type, from'
      });
    }

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // In a real implementation, you would use WebSockets to send this to the other peer
    // For now, we'll just acknowledge the signal
    res.json({
      success: true,
      message: 'Signal received',
      signal: {
        roomId,
        type,
        data,
        from,
        to,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error handling signal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * CRITICAL: WebRTC Events Endpoint
 * This endpoint receives events from the WebRTC server when sessions start/end
 */
router.post('/webrtc-events', async (req, res) => {
  try {
    const { type, sessionId, userRole, userAddress, endedBy, timestamp } = req.body;

    console.log('📡 WebRTC Event received:', { type, sessionId, userRole, userAddress, endedBy });

    // Acknowledge receipt immediately
    res.json({ success: true, message: 'Event processed' });

    // Process different event types
    switch (type) {
      case 'user-connected':
        console.log(`✅ User connected: ${userRole} in session ${sessionId}`);
        break;

      case 'session-heartbeat':
        console.log(`💓 Heartbeat: session ${sessionId} (${userRole})`);
        break;

      case 'user-disconnected':
        console.log(`👋 User disconnected: ${userRole} from session ${sessionId}`);
        break;

      case 'session-ended':
        console.log(`🛑 Session ended by ${endedBy}: ${sessionId}`);
        await handleSessionEnd(sessionId, endedBy, userAddress);
        break;

      default:
        console.log(`⚠️ Unknown event type: ${type}`);
    }

  } catch (error) {
    console.error('❌ Error processing WebRTC event:', error);
    // Don't throw - we already sent response
  }
});

/**
 * Handle session end - trigger blockchain transaction
 */
async function handleSessionEnd(sessionId, endedBy, userAddress) {
  try {
    console.log(`🔍 Looking up session mapping for: ${sessionId}`);
    
    // Get session data from Redis
    const sessionResult = await sessionService.getSessionMapping(sessionId);
    
    if (!sessionResult.success || !sessionResult.session) {
      console.error(`❌ Session mapping not found for: ${sessionId}`);
      console.log('💡 Tip: Session mapping should be created when matching is accepted');
      return;
    }

    const { studentAddress, tutorAddress, languageId } = sessionResult.session;
    console.log(`📋 Session details: Student=${studentAddress}, Tutor=${tutorAddress}, Language=${languageId}`);

    // Initialize contract service
    await contractService.init();
    
    if (!contractService.isContractAvailable()) {
      console.error('❌ Smart contract not available');
      return;
    }

    // Call endSession on the smart contract
    console.log(`🔗 Calling endSession on smart contract for tutor: ${tutorAddress}`);
    
    const contract = contractService.contract;
    const signer = contractService.signer;

    if (!signer) {
      console.error('❌ No signer available for transaction');
      return;
    }

    console.log(`🔑 Using backend wallet: ${await signer.getAddress()}`);

    // Execute the transaction
    const tx = await contract.endSession(tutorAddress);
    console.log(`📝 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Session ended on blockchain. Gas used: ${receipt.gasUsed.toString()}`);

    // Emit event to frontend via Socket.IO (if available)
    if (global.io) {
      global.io.emit('webrtc:session-completed', {
        sessionId,
        tutorAddress,
        studentAddress,
        transactionHash: tx.hash,
        timestamp: Date.now()
      });
      console.log('📡 Emitted webrtc:session-completed event to frontend');
    }

    // Clean up session mapping
    await sessionService.removeSessionMapping(sessionId);
    console.log(`🧹 Session cleanup completed for ${sessionId}`);

  } catch (error) {
    console.error('❌ Error handling session end:', error);
    console.error('Error details:', error.message);
    if (error.reason) console.error('Contract error reason:', error.reason);
  }
}

/**
 * Debug endpoint to check WebRTC backend configuration
 */
router.get('/webrtc-debug', async (req, res) => {
  try {
    await contractService.init();
    
    const status = contractService.getStatus();
    let walletAddress = null;
    let walletBalance = null;

    if (contractService.signer) {
      try {
        walletAddress = await contractService.signer.getAddress();
        const balance = await contractService.provider.getBalance(walletAddress);
        walletBalance = ethers.formatEther(balance);
      } catch (e) {
        console.error('Error getting wallet info:', e);
      }
    }

    res.json({
      success: true,
      contractService: status,
      wallet: {
        address: walletAddress,
        balance: walletBalance,
        hasPrivateKey: !!process.env.PRIVATE_KEY
      },
      environment: {
        rpcUrl: process.env.RPC_URL,
        contractAddress: process.env.CONTRACT_ADDRESS,
        backendUrl: process.env.BACKEND_URL
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test endpoint to manually trigger session end
 */
router.post('/webrtc-test-end', async (req, res) => {
  try {
    const { sessionId, tutorAddress } = req.body;

    if (!sessionId || !tutorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or tutorAddress'
      });
    }

    console.log(`🧪 Test: Manually ending session ${sessionId} for tutor ${tutorAddress}`);

    await handleSessionEnd(sessionId, 'manual-test', tutorAddress);

    res.json({
      success: true,
      message: 'Session end triggered'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
