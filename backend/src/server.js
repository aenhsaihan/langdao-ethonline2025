const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const matchingService = require("./services/matchingService");
const contractService = require("./services/contractService");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "null"], // Allow file:// protocol for testing
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/tutors", require("./routes/tutors"));
app.use("/api/students", require("./routes/students"));
app.use("/api/matching", require("./routes/matching"));

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle tutor availability
  socket.on("tutor:set-available", async (data) => {
    try {
      await matchingService.setTutorAvailable(socket.id, data);
      socket.broadcast.emit("tutor:available-updated", data);
      socket.emit("tutor:availability-confirmed", { success: true });
    } catch (error) {
      socket.emit("tutor:availability-error", {
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("tutor:set-unavailable", (data) => {
    matchingService.setTutorUnavailable(socket.id, data);
    socket.broadcast.emit("tutor:available-updated", data);
  });

  // Handle student requests
  socket.on("student:request-tutor", async (data) => {
    try {
      // Validate student is registered and not currently studying
      const studentInfo = await contractService.getStudentInfo(data.student);
      if (!studentInfo.isRegistered) {
        socket.emit("error", { message: "Student not registered" });
        return;
      }

      const isStudying = await contractService.isStudying(data.student);
      if (isStudying) {
        socket.emit("error", { message: "Student is already in a session" });
        return;
      }

      const matchingTutors = await matchingService.findMatchingTutors(data);
      if (matchingTutors.length > 0) {
        // Broadcast to all matching tutors
        matchingTutors.forEach((tutor) => {
          io.to(tutor.socketId).emit("tutor:incoming-request", {
            requestId: data.requestId,
            student: data.student,
            language: data.language,
            budget: data.budget,
          });
        });

        socket.emit("student:request-sent", {
          requestId: data.requestId,
          tutorsNotified: matchingTutors.length,
        });
      } else {
        socket.emit("student:no-tutors-available", {
          requestId: data.requestId,
        });
      }
    } catch (error) {
      console.error("Error processing student request:", error);
      socket.emit("error", { message: "Failed to process tutor request" });
    }
  });

  // Handle tutor responses
  socket.on("tutor:respond-to-request", (data) => {
    const studentSocketId = matchingService.getStudentSocketId(data.requestId);
    if (studentSocketId) {
      io.to(studentSocketId).emit("student:tutor-response", {
        requestId: data.requestId,
        tutor: data.tutor,
        accepted: data.accepted,
      });
    }
  });

  // Handle student selection
  socket.on("student:select-tutor", async (data) => {
    try {
      // Here we would trigger the smart contract transaction
      const result = await contractService.startSession(data);
      socket.emit("student:session-started", result);

      // Notify the selected tutor
      const tutorSocketId = matchingService.getTutorSocketId(data.tutorAddress);
      if (tutorSocketId) {
        io.to(tutorSocketId).emit("tutor:session-started", result);
      }
    } catch (error) {
      socket.emit("error", { message: "Failed to start session" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    matchingService.handleDisconnection(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`LangDAO Backend running on port ${PORT}`);
});
