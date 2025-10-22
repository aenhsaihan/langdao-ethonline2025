// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const url = require("url");
const fetch = require("node-fetch");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

// Store rooms and their connections
const rooms = new Map();

// Helper function to notify backend
async function notifyBackend(eventData) {
    try {
        // Replace with your actual backend URL
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001/api/webrtc-events';

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });

        console.log('Backend notified:', eventData.type);
    } catch (error) {
        console.log('Backend notification failed:', error.message);
    }
}

// Handle WebSocket signaling
wss.on("connection", (ws, req) => {
    const query = url.parse(req.url, true).query;
    const roomId = query.room || 'default';
    const userRole = query.role || 'user';

    // Add client to room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(ws);
    ws.roomId = roomId;
    ws.userRole = userRole;

    console.log(`Client joined room: ${roomId} as ${userRole}`);

    // Notify backend of user connection (event #5)
    notifyBackend({
        type: 'user-connected',
        sessionId: roomId,
        userRole: userRole,
        timestamp: Date.now()
    });

    ws.on("message", (message) => {
        // Broadcast only to clients in the same room
        const roomClients = rooms.get(roomId);
        if (roomClients) {
            roomClients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    });

    ws.on("close", () => {
        // Notify backend of user disconnection (critical event #3)
        notifyBackend({
            type: 'user-disconnected',
            sessionId: roomId,
            userRole: userRole,
            reason: 'connection-closed',
            timestamp: Date.now()
        });

        // Remove client from room
        const roomClients = rooms.get(roomId);
        if (roomClients) {
            roomClients.delete(ws);
            if (roomClients.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted - all users left`);
            }
        }
        console.log(`Client left room: ${roomId}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));