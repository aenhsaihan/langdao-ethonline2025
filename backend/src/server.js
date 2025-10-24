const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const redis = require("redis");

// Redis client configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// Initialize Redis connection
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

const tutorRoutes = require("./routes/tutors");
const studentRoutes = require("./routes/students");
const matchingRoutes = require("./routes/matching");
const matchingService = require("./services/matchingService");

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// Security middleware
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: [CORS_ORIGIN, "null"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logging
if (NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", async (req, res) => {
  try {
    // Check Redis connection
    let redisStatus = "disconnected";
    try {
      await redisClient.ping();
      redisStatus = "connected";
    } catch (redisError) {
      console.error("Redis health check failed:", redisError);
    }

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      redis: redisStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      error: error.message,
    });
  }
});

// API routes
app.use("/api/tutors", tutorRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/matching", matchingRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const status = err.status || err.statusCode || 500;
  const message =
    NODE_ENV === "production" ? "Internal Server Error" : err.message;

  res.status(status).json({
    error: message,
    ...(NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: [CORS_ORIGIN, "null"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
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
    console.error("Error checking socket rate limit:", error);
    return true; // Allow request if rate limiting fails
  }
}

// Socket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Helper to bind socketId <-> tutor address in Redis
  async function bindSocketToAddress(address) {
    try {
      // Save socketId on the tutor hash and a reverse map socket -> address
      await redisClient.hSet(`tutor:${address}`, { socketId: socket.id });
      await redisClient.hSet("socket_to_address", socket.id, address);
    } catch (e) {
      console.error("Failed to bind socket to address:", e);
    }
  }

  // Helper to resolve address from socketId
  async function getAddressForSocket() {
    try {
      return await redisClient.hGet("socket_to_address", socket.id);
    } catch {
      return null;
    }
  }

  socket.on("tutor:setAvailable", async (payload, cb) => {
    try {
      // Rate limit
      if (!(await checkSocketRateLimit(socket.id))) {
        cb?.({ ok: false, error: "Rate limit exceeded" });
        return;
      }

      const { address, language, ratePerSecond } = payload || {};
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address))
        throw new Error("Invalid address");
      if (!language || !String(language).trim())
        throw new Error("language is required");
      if (ratePerSecond === undefined || ratePerSecond === null)
        throw new Error("ratePerSecond is required");

      const result = await matchingService.setTutorAvailable(
        address.toLowerCase(),
        String(language).trim(),
        ratePerSecond
      );
      // Bind socket to this address
      await bindSocketToAddress(address.toLowerCase());

      console.log(
        `Tutor ${address} now available for ${language}, checking for pending student requests...`
      );

      // Check for pending student requests that match this tutor
      const pendingRequests = await matchingService.getPendingStudentRequests(
        String(language).trim(),
        ratePerSecond
      );

      if (pendingRequests && pendingRequests.length > 0) {
        console.log(
          `Found ${pendingRequests.length} pending requests for this tutor`
        );

        // Notify this tutor about all pending matching requests
        for (const request of pendingRequests) {
          socket.emit("tutor:incoming-request", {
            requestId: request.requestId,
            student: {
              address: request.studentAddress,
              language: request.language,
              budgetPerSecond: request.budgetPerSecond,
            },
          });
        }
      }

      cb?.({ ok: true, result, pendingRequests: pendingRequests?.length || 0 });
      // Broadcast an availability update
      io.emit("tutor:available-updated", {
        action: "added",
        tutor: { address: address.toLowerCase(), language, ratePerSecond },
      });
    } catch (err) {
      console.error("Error in tutor:setAvailable:", err);
      cb?.({ ok: false, error: err.message });
    }
  });

  // DEPRECATE the old event name, but keep it working by delegating to the new logic
  socket.on("tutor:set-available", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (
        !data ||
        !data.address ||
        !data.language ||
        typeof data.ratePerSecond === "undefined"
      ) {
        socket.emit("error", {
          message: "Missing required fields: address, language, ratePerSecond",
        });
        return;
      }

      const result = await matchingService.setTutorAvailable(
        data.address.toLowerCase(),
        String(data.language).trim(),
        data.ratePerSecond
      );

      await bindSocketToAddress(data.address.toLowerCase());

      console.log(
        `Tutor ${data.address} now available for ${data.language}, checking for pending student requests...`
      );

      // Check for pending student requests that match this tutor
      const pendingRequests = await matchingService.getPendingStudentRequests(
        String(data.language).trim(),
        data.ratePerSecond
      );

      if (pendingRequests && pendingRequests.length > 0) {
        console.log(
          `Found ${pendingRequests.length} pending requests for this tutor`
        );

        // Notify this tutor about all pending matching requests
        for (const request of pendingRequests) {
          socket.emit("tutor:incoming-request", {
            requestId: request.requestId,
            student: {
              address: request.studentAddress,
              language: request.language,
              budgetPerSecond: request.budgetPerSecond,
            },
          });
        }
      }

      if (result.success) {
        socket.emit("tutor:availability-set", {
          success: true,
          pendingRequests: pendingRequests?.length || 0,
        });
        io.emit("tutor:available-updated", {
          action: "added",
          tutor: {
            address: data.address.toLowerCase(),
            language: data.language,
            ratePerSecond: data.ratePerSecond,
          },
        });
      } else {
        socket.emit("error", {
          message: result.error || "Failed to set availability",
        });
      }
    } catch (error) {
      console.error("Error setting tutor availability:", error);
      socket.emit("error", { message: "Failed to set availability" });
    }
  });

  // Tutor sets unavailable
  socket.on("tutor:set-unavailable", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (!data || !data.address) {
        socket.emit("error", { message: "Missing required field: address" });
        return;
      }

      const result = await matchingService.removeTutorAvailable(
        data.address.toLowerCase()
      );

      if (result.success) {
        socket.emit("tutor:availability-removed", { success: true });
        
        // Check if this tutor was in a session state (waiting to enter session)
        // If so, notify the student they were waiting for
        const tutorHash = await redisClient.hGetAll(`tutor:${data.address.toLowerCase()}`);
        console.log(`🎯 Tutor ${data.address.toLowerCase()} hash data:`, tutorHash);
        
        // For now, let's always emit the withdrawal event when a tutor becomes unavailable
        // This handles the case where tutor withdraws their acceptance
        console.log(`🎯 EMITTING tutor:withdrew-acceptance for tutor ${data.address.toLowerCase()}`);
        io.emit("tutor:withdrew-acceptance", {
          tutorAddress: data.address.toLowerCase(),
          message: "Tutor withdrew their acceptance and is back to waiting for students",
        });
        
        // Broadcast that this tutor is no longer available
        io.emit("tutor:available-updated", {
          action: "removed",
          tutor: { address: data.address.toLowerCase() },
        });
        console.log(`Tutor ${data.address} set to unavailable`);
      } else {
        socket.emit("error", {
          message: result.error || "Failed to remove availability",
        });
      }
    } catch (error) {
      console.error("Error removing tutor availability:", error);
      socket.emit("error", { message: "Failed to remove availability" });
    }
  });

  // Student requests tutor
  socket.on("student:request-tutor", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (
        !data ||
        !data.requestId ||
        !data.studentAddress ||
        !data.language ||
        typeof data.budgetPerSecond === "undefined"
      ) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      // Store request FIRST so it's available for tutors who come online later
      await matchingService.storeStudentRequest(data.requestId, {
        studentAddress: data.studentAddress,
        studentSocketId: socket.id,
        language: data.language,
        budgetPerSecond: data.budgetPerSecond,
        timestamp: Date.now(),
      });

      console.log(
        `Student ${data.studentAddress} requesting tutor for ${data.language}, request stored: ${data.requestId}`
      );

      // Find currently available tutors
      const result = await matchingService.findMatchingTutors({
        language: data.language,
        budgetPerSecond: data.budgetPerSecond,
        studentAddress: data.studentAddress,
      });

      const tutors =
        result && Array.isArray(result.tutors) ? result.tutors : [];

      // Notify matching tutors (fetch socketId from tutor hash)
      let tutorsNotified = 0;
      for (const tutor of tutors) {
        const tutorHash = await redisClient.hGetAll(
          `tutor:${tutor.address.toLowerCase()}`
        );
        const tutorSocketId = tutorHash?.socketId;
        if (tutorSocketId && io.sockets.sockets.get(tutorSocketId)) {
          io.to(tutorSocketId).emit("tutor:incoming-request", {
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

      // Always confirm request was sent, even if no tutors available now
      socket.emit("student:request-sent", {
        requestId: data.requestId,
        tutorsNotified,
        message:
          tutorsNotified === 0
            ? "Request stored, will notify tutors when they come online"
            : `Notified ${tutorsNotified} available tutors`,
      });

      if (tutorsNotified === 0) {
        socket.emit("student:no-tutors-available", {
          requestId: data.requestId,
          message:
            "No tutors online yet, your request is active and will be sent to tutors when they come online",
        });
      }
    } catch (error) {
      console.error("Error processing student request:", error);
      socket.emit("error", { message: "Failed to process request" });
    }
  });

  // Tutor accepts request
  socket.on("tutor:accept-request", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (!data || !data.requestId || !data.tutorAddress) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      const result = await matchingService.getStudentRequest(data.requestId);
      if (!result?.success || !result.request) {
        socket.emit("error", { message: "Request not found or expired" });
        return;
      }
      const reqData = result.request;
      const studentSocketId = reqData.studentSocketId;

      // Get tutor info to send complete data to student
      const tutorInfo = await matchingService.getTutorByAddress(
        data.tutorAddress.toLowerCase()
      );
      const tutorData = tutorInfo.success ? tutorInfo.tutor : null;

      if (studentSocketId && io.sockets.sockets.get(studentSocketId)) {
        io.to(studentSocketId).emit("student:tutor-accepted", {
          requestId: data.requestId,
          tutorAddress: data.tutorAddress.toLowerCase(),
          language: tutorData?.language || reqData.language,
          ratePerSecond: tutorData?.ratePerSecond || 0,
          socketId: socket.id,
        });
      }

      // Remove the request from pending since it's been accepted
      await matchingService.removeStudentRequest(data.requestId);

      // Send confirmation to tutor with student info
      socket.emit("tutor:request-accepted", {
        requestId: data.requestId,
        studentAddress: reqData.studentAddress,
        language: reqData.language,
        budgetPerSecond: reqData.budgetPerSecond,
      });

      console.log(
        `Tutor ${data.tutorAddress} accepted request ${data.requestId}`
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      socket.emit("error", { message: "Failed to accept request" });
    }
  });

  // Tutor declines request
  socket.on("tutor:decline-request", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (!data || !data.requestId) {
        socket.emit("error", { message: "Missing requestId" });
        return;
      }

      socket.emit("tutor:request-declined", { requestId: data.requestId });
    } catch (error) {
      console.error("Error declining request:", error);
      socket.emit("error", { message: "Failed to decline request" });
    }
  });

  // Student cancels request
  socket.on("student:cancel-request", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (!data || !data.requestId || !data.studentAddress) {
        socket.emit("error", {
          message: "Missing required fields: requestId, studentAddress",
        });
        return;
      }

      console.log(
        `Student ${data.studentAddress} cancelling request ${data.requestId}`
      );

      // Remove the pending request from storage
      const result = await matchingService.removeStudentRequest(data.requestId);

      if (result.success) {
        socket.emit("student:request-cancelled", {
          requestId: data.requestId,
          success: true,
        });

        // Broadcast to all tutors that this request is cancelled
        io.emit("student:request-cancelled-broadcast", {
          requestId: data.requestId,
          studentAddress: data.studentAddress,
        });

        console.log(
          `Request ${data.requestId} cancelled and broadcast to all tutors`
        );
      } else {
        socket.emit("error", {
          message: result.error || "Failed to cancel request",
        });
      }
    } catch (error) {
      console.error("Error cancelling student request:", error);
      socket.emit("error", { message: "Failed to cancel request" });
    }
  });

  // Student accepts a tutor (starts session)
  socket.on("student:accept-tutor", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (
        !data ||
        !data.requestId ||
        !data.tutorAddress ||
        !data.studentAddress
      ) {
        socket.emit("error", {
          message:
            "Missing required fields: requestId, tutorAddress, studentAddress",
        });
        return;
      }

      console.log(
        `Student ${data.studentAddress} accepted tutor ${data.tutorAddress} for request ${data.requestId}`
      );

      // Get the request data to find all tutors who were notified
      const requestData = await matchingService.getStudentRequest(
        data.requestId
      );

      if (!requestData || !requestData.success) {
        socket.emit("error", { message: "Request not found or expired" });
        return;
      }

      // Find all tutors who were notified of this request
      const result = await matchingService.findMatchingTutors({
        language: requestData.language,
        budgetPerSecond: requestData.budgetPerSecond,
        studentAddress: data.studentAddress,
      });

      const tutors =
        result && Array.isArray(result.tutors) ? result.tutors : [];

      // Notify all tutors except the accepted one that they were rejected
      let tutorsNotified = 0;
      for (const tutor of tutors) {
        if (tutor.address.toLowerCase() !== data.tutorAddress.toLowerCase()) {
          const tutorHash = await redisClient.hGetAll(
            `tutor:${tutor.address.toLowerCase()}`
          );
          const tutorSocketId = tutorHash?.socketId;
          if (tutorSocketId && io.sockets.sockets.get(tutorSocketId)) {
            io.to(tutorSocketId).emit("tutor:student-rejected", {
              requestId: data.requestId,
              studentAddress: data.studentAddress,
              selectedTutorAddress: data.tutorAddress,
              message: "Student selected another tutor",
            });
            tutorsNotified++;
          }
        }
      }

      // Notify the accepted tutor that they were chosen
      const acceptedTutorHash = await redisClient.hGetAll(
        `tutor:${data.tutorAddress.toLowerCase()}`
      );
      const acceptedTutorSocketId = acceptedTutorHash?.socketId;
      if (
        acceptedTutorSocketId &&
        io.sockets.sockets.get(acceptedTutorSocketId)
      ) {
        io.to(acceptedTutorSocketId).emit("tutor:student-selected", {
          requestId: data.requestId,
          studentAddress: data.studentAddress,
          message: "Student selected you! Session starting...",
        });
      }

      // Remove the request from storage since it's been resolved
      await matchingService.removeStudentRequest(data.requestId);

      // Confirm to student
      socket.emit("student:tutor-accepted", {
        requestId: data.requestId,
        tutorAddress: data.tutorAddress,
        tutorsNotified: tutorsNotified,
        success: true,
      });

      console.log(
        `✅ Student acceptance processed: ${tutorsNotified} tutors notified of rejection, accepted tutor notified`
      );
    } catch (error) {
      console.error("Error processing student tutor acceptance:", error);
      socket.emit("error", { message: "Failed to process tutor acceptance" });
    }
  });

  // Student rejects a tutor (continues waiting for others)
  socket.on("student:reject-tutor", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (
        !data ||
        !data.requestId ||
        !data.tutorAddress ||
        !data.studentAddress
      ) {
        socket.emit("error", {
          message:
            "Missing required fields: requestId, tutorAddress, studentAddress",
        });
        return;
      }

      console.log(
        `Student ${data.studentAddress} rejected tutor ${data.tutorAddress} for request ${data.requestId}`
      );

      // Notify the rejected tutor
      const rejectedTutorHash = await redisClient.hGetAll(
        `tutor:${data.tutorAddress.toLowerCase()}`
      );
      const rejectedTutorSocketId = rejectedTutorHash?.socketId;
      if (
        rejectedTutorSocketId &&
        io.sockets.sockets.get(rejectedTutorSocketId)
      ) {
        io.to(rejectedTutorSocketId).emit("tutor:student-rejected", {
          requestId: data.requestId,
          studentAddress: data.studentAddress,
          selectedTutorAddress: null, // No one selected yet
          message: "Student rejected you, but request is still active",
        });
      }

      // Confirm to student
      socket.emit("student:tutor-rejected", {
        requestId: data.requestId,
        tutorAddress: data.tutorAddress,
        success: true,
      });

      console.log(
        `✅ Student rejection processed: tutor ${data.tutorAddress} notified of rejection`
      );
    } catch (error) {
      console.error("Error processing student tutor rejection:", error);
      socket.emit("error", { message: "Failed to process tutor rejection" });
    }
  });

  // Student selects a tutor (rejecting all others)
  socket.on("student:select-tutor", async (data) => {
    try {
      if (!(await checkSocketRateLimit(socket.id))) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }

      if (
        !data ||
        !data.requestId ||
        !data.selectedTutorAddress ||
        !data.studentAddress
      ) {
        socket.emit("error", {
          message:
            "Missing required fields: requestId, selectedTutorAddress, studentAddress",
        });
        return;
      }

      console.log(
        `Student ${data.studentAddress} selected tutor ${data.selectedTutorAddress} for request ${data.requestId}`
      );

      // Get the request data to find all tutors who were notified
      const requestData = await matchingService.getStudentRequest(
        data.requestId
      );

      if (!requestData || !requestData.success) {
        socket.emit("error", { message: "Request not found or expired" });
        return;
      }

      // Find all tutors who were notified of this request
      const result = await matchingService.findMatchingTutors({
        language: requestData.language,
        budgetPerSecond: requestData.budgetPerSecond,
        studentAddress: data.studentAddress,
      });

      const tutors =
        result && Array.isArray(result.tutors) ? result.tutors : [];

      // Notify all tutors except the selected one that they were rejected
      let tutorsNotified = 0;
      for (const tutor of tutors) {
        if (
          tutor.address.toLowerCase() !==
          data.selectedTutorAddress.toLowerCase()
        ) {
          const tutorHash = await redisClient.hGetAll(
            `tutor:${tutor.address.toLowerCase()}`
          );
          const tutorSocketId = tutorHash?.socketId;
          if (tutorSocketId && io.sockets.sockets.get(tutorSocketId)) {
            io.to(tutorSocketId).emit("tutor:student-rejected", {
              requestId: data.requestId,
              studentAddress: data.studentAddress,
              selectedTutorAddress: data.selectedTutorAddress,
              message: "Student selected another tutor",
            });
            tutorsNotified++;
          }
        }
      }

      // Notify the selected tutor that they were chosen
      const selectedTutorHash = await redisClient.hGetAll(
        `tutor:${data.selectedTutorAddress.toLowerCase()}`
      );
      const selectedTutorSocketId = selectedTutorHash?.socketId;
      if (
        selectedTutorSocketId &&
        io.sockets.sockets.get(selectedTutorSocketId)
      ) {
        io.to(selectedTutorSocketId).emit("tutor:student-selected", {
          requestId: data.requestId,
          studentAddress: data.studentAddress,
          message: "Student selected you! Waiting for session to start...",
        });
      }

      // Remove the request from storage since it's been resolved
      await matchingService.removeStudentRequest(data.requestId);

      // Confirm to student
      socket.emit("student:tutor-selected", {
        requestId: data.requestId,
        selectedTutorAddress: data.selectedTutorAddress,
        tutorsNotified: tutorsNotified,
        success: true,
      });

      console.log(
        `✅ Student selection processed: ${tutorsNotified} tutors notified of rejection, selected tutor notified`
      );
    } catch (error) {
      console.error("Error processing student tutor selection:", error);
      socket.emit("error", { message: "Failed to process tutor selection" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async (reason) => {
    console.log("Client disconnected:", socket.id, "Reason:", reason);

    try {
      const address = await getAddressForSocket();
      if (address) {
        await matchingService.removeTutorAvailable(address.toLowerCase());
        await redisClient.hDel("socket_to_address", socket.id);
        await redisClient.hSet(`tutor:${address.toLowerCase()}`, {
          socketId: "",
        });

        io.emit("tutor:available-updated", {
          action: "removed",
          address: address.toLowerCase(),
        });
      }

      await redisClient.del(`rate_limit:${socket.id}`);
    } catch (error) {
      console.error("Error handling disconnect:", error);
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
      console.log("Redis connection closed");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log("Forcing shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

module.exports = { app, server, io };
