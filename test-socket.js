const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("✅ Connected! Socket ID:", socket.id);

  // Test tutor availability
  socket.emit("tutor:set-available", {
    tutorAddress: "0x1234567890123456789012345678901234567890",
    languages: ["English", "Spanish"],
    hourlyRate: 50,
  });
  console.log("📤 Sent tutor:set-available event");
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});

socket.on("tutor:availability-confirmed", (data) => {
  console.log("📥 Received tutor:availability-confirmed:", data);
});

socket.on("error", (error) => {
  console.log("❌ Error:", error);
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\n👋 Disconnecting...");
  socket.disconnect();
  process.exit();
});
