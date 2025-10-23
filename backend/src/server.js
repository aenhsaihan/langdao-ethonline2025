const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Initialize Redis connection
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})(); 

const tutorRoutes = require('./routes/tutors');
const studentRoutes = require('./routes/students');
const matchingRoutes = require('./routes/matching');
const matchingService = require('./services/matchingService');

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
if (NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      await redisClient.ping();
      redisStatus = 'connected';
    } catch (redisError) {
      console.error('Redis health check failed:', redisError);
    }

    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      redis: redisStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      error: error.message
    });
  }
});

// API routes
app.use('/api/tutors', tutorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/matching', matchingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const status = err.status || err.statusCode || 500;
  const message = NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  
  res.status(status).json({ 
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket rate limiting configuration
const SOCKET_RATE_LIMIT = 10; // requests per minute per socket

async function checkSocketRateLimit(socketId) {
  try {
    const key = `rate_limit:${socketId}`;
    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, 60); // Set TTL on first request
    }
    
    return current <= SOCKET_RATE_LIMIT;
  } catch (error) {
    console.error('Error checking socket rate limit:', error);
    return true; // Allow request if rate limiting fails
  }
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Helper to bind socketId <-> tutor address in Redis
  async function bindSocketToAddress(address) {
    try {
      // Save socketId on the tutor hash and a reverse map socket -> address
      await redisClient.hSet(`tutor:${address}`, { socketId: socket.id });
      await redisClient.hSet('socket_to_address', socket.id, address);
    } catch (e) {
      console.error('Failed to bind socket to address:', e);
    }
  }

  // Helper to resolve address from socketId
  async function getAddressForSocket() {
    try {
      return await redisClient.hGet('socket_to_address', socket.id);
    } catch {
      return null;
    }
  }

  socket.on('tutor:setAvailable', async (payload, cb) => {
    try {
      // Rate limit
      if (!(await checkSocketRateLimit(socket.id))) {
        cb?.({ ok: false, error: 'Rate limit exceeded' });
        return;
      }

      const { address, language, ratePerSecond } = payload || {};
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
      if (!language || !String(language).trim()) throw new Error('language is required');
      if (ratePerSecond === undefined || ratePerSecond === null) throw new Error('ratePerSecond is required');

      const result = await matchingService.setTutorAvailable(address.toLowerCase(), String(language).trim(), ratePerSecond);
      // Bind socket to this address
      await bindSocketToAddress(address.toLowerCase());

      cb?.({ ok: true, result });
      // Broadcast an availability update
      io.emit('tutor:available-updated', { action: 'added', tutor: { address: address.toLowerCase(), language, ratePerSecond } });
    } catch (err) {
      console.error('Error in tutor:setAvailable:', err);
      cb?.({ ok: false, error: err.message });
    }
  });

  // DEPRECATE the old event name, but keep it working by delegating to the new logic
  socket.on('tutor:set-available', async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      if (!data || !data.address || !data.language || typeof data.ratePerSecond === 'undefined') {
        socket.emit('error', { message: 'Missing required fields: address, language, ratePerSecond' });
        return;
      }

      const result = await matchingService.setTutorAvailable(
        data.address.toLowerCase(),
        String(data.language).trim(),
        data.ratePerSecond
      );

      await bindSocketToAddress(data.address.toLowerCase());

      if (result.success) {
        socket.emit('tutor:availability-set', { success: true });
        io.emit('tutor:available-updated', {
          action: 'added',
          tutor: { address: data.address.toLowerCase(), language: data.language, ratePerSecond: data.ratePerSecond },
        });
      } else {
        socket.emit('error', { message: result.error || 'Failed to set availability' });
      }
    } catch (error) {
      console.error('Error setting tutor availability:', error);
      socket.emit('error', { message: 'Failed to set availability' });
    }
  });

  // Student requests tutor
  socket.on('student:request-tutor', async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      if (!data || !data.requestId || !data.studentAddress || !data.language || typeof data.budgetPerSecond === 'undefined') {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const result = await matchingService.findMatchingTutors({
        language: data.language,
        budgetPerSecond: data.budgetPerSecond,
        studentAddress: data.studentAddress,
      });

      const tutors = (result && Array.isArray(result.tutors)) ? result.tutors : [];
      if (tutors.length === 0) {
        socket.emit('student:no-tutors-available', { requestId: data.requestId });
        return;
      }

      // Store request for tracking
      await matchingService.storeStudentRequest(data.requestId, {
        studentAddress: data.studentAddress,
        studentSocketId: socket.id,
        language: data.language,
        budgetPerSecond: data.budgetPerSecond,
        timestamp: Date.now(),
      });

      // Notify matching tutors (fetch socketId from tutor hash)
      let tutorsNotified = 0;
      for (const tutor of tutors) {
        const tutorHash = await redisClient.hGetAll(`tutor:${tutor.address.toLowerCase()}`);
        const tutorSocketId = tutorHash?.socketId;
        if (tutorSocketId && io.sockets.sockets.get(tutorSocketId)) {
          io.to(tutorSocketId).emit('tutor:incoming-request', {
            requestId: data.requestId,
            student: {
              address: data.studentAddress,
              language: data.language,
              budgetPerSecond: data.budgetPerSecond,
            },
          });
          tutorsNotified++;
        }
      }

      socket.emit('student:request-sent', {
        requestId: data.requestId,
        tutorsNotified,
      });
    } catch (error) {
      console.error('Error processing student request:', error);
      socket.emit('error', { message: 'Failed to process request' });
    }
  });

  // Tutor accepts request
  socket.on('tutor:accept-request', async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      if (!data || !data.requestId || !data.tutorAddress) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const result = await matchingService.getStudentRequest(data.requestId);
      if (!result?.success || !result.request) {
        socket.emit('error', { message: 'Request not found or expired' });
        return;
      }
      const reqData = result.request;
      const studentSocketId = reqData.studentSocketId;

      if (studentSocketId && io.sockets.sockets.get(studentSocketId)) {
        io.to(studentSocketId).emit('student:tutor-accepted', {
          requestId: data.requestId,
          tutor: {
            address: data.tutorAddress.toLowerCase(),
            socketId: socket.id,
          },
        });
      }

      await matchingService.removeStudentRequest(data.requestId);
      socket.emit('tutor:request-accepted', { requestId: data.requestId });
    } catch (error) {
      console.error('Error accepting request:', error);
      socket.emit('error', { message: 'Failed to accept request' });
    }
  });

  // Tutor declines request
  socket.on('tutor:decline-request', async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      if (!data || !data.requestId) {
        socket.emit('error', { message: 'Missing requestId' });
        return;
      }

      socket.emit('tutor:request-declined', { requestId: data.requestId });
    } catch (error) {
      console.error('Error declining request:', error);
      socket.emit('error', { message: 'Failed to decline request' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

    try {
      const address = await getAddressForSocket();
      if (address) {
        await matchingService.removeTutorAvailable(address.toLowerCase());
        await redisClient.hDel('socket_to_address', socket.id);
        await redisClient.hSet(`tutor:${address.toLowerCase()}`, { socketId: '' });

        io.emit('tutor:available-updated', {
          action: 'removed',
          address: address.toLowerCase(),
        });
      }

      await redisClient.del(`rate_limit:${socket.id}`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Clean up matching service and Redis connections
    await matchingService.cleanup();
    
    // Close Redis client connection
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis connection closed');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

module.exports = { app, server, io };