const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Store session heartbeats: { sessionId: { participants: {wallet1: lastPing, wallet2: lastPing}, startTime, active } }
const sessions = {};

// Initialize blockchain connection
let provider, wallet, controller;

async function initializeBlockchain() {
    try {
        provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
        wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0x' + '1'.repeat(64), provider);
        
        // SessionEscrow contract ABI (minimal for stopSession)
        const contractABI = [
            "event SessionStarted(uint256 indexed sessionId, address indexed starter)",
  "event SessionStopped(uint256 indexed sessionId, address calledBy)",
  "function stopSession(uint256 sessionId) external",
  "function startSession(uint256 sessionId) external",
  "function active(uint256) view returns (bool)"];
        
        controller = new ethers.Contract(
            process.env.CONTRACT_ADDRESS || "0x4aF84Ba94008Ab8CCcbaA24ACF2c5739aE9514D7",
            contractABI,
            wallet
        );
        controller.on("SessionStarted", (sessionId, starter, event) => {
  const id = sessionId.toString();
  if (!sessions[id]) {
    sessions[id] = { participants: {}, startTime: Date.now(), active: true };
    console.log(`🎬 [on-chain] SessionStarted detected: ${id} by ${starter}`);
  }
});
controller.on("SessionStopped", (sessionId, calledBy) => {
  const id = sessionId.toString();
  if (sessions[id]) {
    sessions[id].active = false;
    console.log(`🔴 [on-chain] SessionStopped detected: ${id} by ${calledBy}`);
  }
});
        
        console.log('✅ Blockchain connection initialized');
        console.log(`📍 Wallet: ${wallet.address}`);
        console.log(`📍 Contract: ${process.env.CONTRACT_ADDRESS}`);
    } catch (error) {
        console.error('❌ Failed to initialize blockchain:', error.message);
    }
}

// Initialize on startup
initializeBlockchain();

// Heartbeat endpoint - receives pings from frontend
app.post('/ping', async (req, res) => {
  try {
    const { sessionId, wallet, timestamp, signature } = req.body;
    if (!sessionId || !wallet || !signature || !timestamp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Reject old messages (prevent replay)
    const nowS = Math.floor(Date.now() / 1000);
    if (Math.abs(nowS - timestamp) > 60) {
      return res.status(400).json({ error: 'timestamp out of range' });
    }

    // verify signature: message format "sessionId:timestamp"
    const msg = `${sessionId}:${timestamp}`;
    const recovered = ethers.verifyMessage(msg, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ error: 'invalid signature' });
    }

    // existing logic to create or update sessions
    const now = Date.now();
    if (!sessions[sessionId]) {
      sessions[sessionId] = { participants: {}, startTime: now, active: true };
      console.log(`🎯 New session created by ping: ${sessionId}`);
    }
    sessions[sessionId].participants[wallet.toLowerCase()] = { lastPing: now };
    console.log(`💓 Verified ping from ${wallet} for session ${sessionId}`);
    return res.json({ status: 'ok' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal' });
  }
});


// Explicit disconnect endpoint
app.post('/disconnect', async (req, res) => {
    try {
        const { sessionId, wallet, reason } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }

        console.log(`🔌 Disconnect received for session ${sessionId} from ${wallet || 'unknown'}, reason: ${reason || 'not specified'}`);
        
        await handleSessionStop(sessionId, `Manual disconnect: ${reason || 'user left'}`);
        
        res.json({ status: 'ok', message: 'Disconnect processed' });
        
    } catch (error) {
        console.error('❌ Error handling disconnect:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to handle session stopping
async function handleSessionStop(sessionId, reason) {
    try {
        if (!sessions[sessionId] || !sessions[sessionId].active) {
            console.log(`⚠️ Session ${sessionId} already stopped or doesn't exist`);
            return;
        }

        console.log(`🛑 Stopping session ${sessionId} - Reason: ${reason}`);

        // Mark session as inactive
        sessions[sessionId].active = false;

        // Call smart contract to stop session
        if (controller && process.env.CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
            const tx = await controller.stopSession(sessionId);
            await tx.wait();
            console.log(`✅ Smart contract stopSession() called for ${sessionId}, tx: ${tx.hash}`);
        } else {
            console.log(`⚠️ Smart contract not configured, skipping on-chain call for ${sessionId}`);
        }

        // Clean up session data after a delay
        setTimeout(() => {
            delete sessions[sessionId];
            console.log(`🧹 Cleaned up session data for ${sessionId}`);
        }, 30000); // Keep for 30 seconds for any final requests

    } catch (error) {
        console.error(`❌ Error stopping session ${sessionId}:`, error);
    }
}

// Monitor for disconnected sessions (heartbeat timeout)
setInterval(async () => {
    const now = Date.now();
    const timeoutThreshold = 10000; // 10 seconds

    for (const [sessionId, sessionData] of Object.entries(sessions)) {
        if (!sessionData.active) continue;

        const participants = Object.entries(sessionData.participants);
        let disconnectedUsers = [];

        // Check each participant's last ping
        for (const [wallet, userData] of participants) {
            if (now - userData.lastPing > timeoutThreshold) {
                disconnectedUsers.push(`${wallet} (${userData.userType})`);
            }
        }

        // If any participant is disconnected, stop the session
        if (disconnectedUsers.length > 0) {
            const reason = `Heartbeat timeout: ${disconnectedUsers.join(', ')} missed heartbeats`;
            await handleSessionStop(sessionId, reason);
        }
    }
}, 5000); // Check every 5 seconds

// Health check endpoint
app.get('/health', (req, res) => {
    const activeSessions = Object.keys(sessions).filter(id => sessions[id].active).length;
    res.json({
        status: 'ok',
        activeSessions: activeSessions,
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Get session info endpoint
app.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions[sessionId];
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
        sessionId,
        active: session.active,
        startTime: session.startTime,
        participants: Object.keys(session.participants),
        participantDetails: session.participants
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Handle session join
    socket.on('join-session', (data) => {
        const { sessionId, wallet, userType } = data;
        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.wallet = wallet;
        socket.userType = userType;
        
        console.log(`👥 ${wallet} (${userType}) joined session ${sessionId} via WebSocket`);
        
        // Notify other participants
        socket.to(sessionId).emit('participant-joined', {
            wallet,
            userType,
            timestamp: Date.now()
        });
    });
    
    // Handle heartbeat via WebSocket
    socket.on('heartbeat', (data) => {
        const { sessionId, wallet, userType } = data;
        
        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                participants: {},
                startTime: Date.now(),
                active: true
            };
        }
        
        sessions[sessionId].participants[wallet] = {
            lastPing: Date.now(),
            userType: userType || 'unknown',
            socketId: socket.id
        };
        
        // Acknowledge heartbeat
        socket.emit('heartbeat-ack', { timestamp: Date.now() });
    });
    
    // Handle manual disconnect
    socket.on('disconnect-session', async (data) => {
        const { sessionId, reason } = data;
        console.log(`🔌 Manual disconnect for session ${sessionId}: ${reason}`);
        
        await handleSessionStop(sessionId, `Manual disconnect via WebSocket: ${reason}`);
        
        // Notify all participants in the session
        io.to(sessionId).emit('session-stopped', {
            reason,
            timestamp: Date.now()
        });
    });
    
    // Handle socket disconnect
    socket.on('disconnect', async () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        
        if (socket.sessionId && socket.wallet) {
            const reason = 'WebSocket connection lost';
            console.log(`🔌 Session ${socket.sessionId} participant ${socket.wallet} disconnected`);
            
            // Give a small grace period before stopping session
            setTimeout(async () => {
                // Check if user reconnected
                if (sessions[socket.sessionId]) {
                    const participant = sessions[socket.sessionId].participants[socket.wallet];
                    if (!participant || Date.now() - participant.lastPing > 15000) {
                        await handleSessionStop(socket.sessionId, reason);
                    }
                }
            }, 5000); // 5 second grace period
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Heartbeat + Relayer running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server ready for connections`);
});
