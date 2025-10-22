const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("✅ Connected! Socket ID:", socket.id);

  // Test tutor availability
  socket.emit("tutor:set-available", {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    languages: ["English", "Spanish"],
    rates: { English: 50, Spanish: 50 },
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
