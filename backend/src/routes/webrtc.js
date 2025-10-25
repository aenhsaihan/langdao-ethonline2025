const express = require('express');
const router = express.Router();

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

module.exports = router;
