# 🚀 WebRTC Session End - Complete Setup & Testing Guide

## ✅ What Was Fixed

### 1. **Missing `/api/webrtc-events` Endpoint** ✅
**Added to:** `backend/src/routes/webrtc.js`

The WebRTC server now sends events to this endpoint which:
- Receives session lifecycle events (connected, heartbeat, disconnected, ended)
- Looks up session mapping from Redis
- Calls `endSession(tutorAddress)` on the smart contract
- Emits Socket.IO events to frontend

### 2. **Missing BACKEND_URL Configuration** ✅
**Created:** `backend/webRTC-implementation-LangDAO/.env`

```bash
BACKEND_URL=http://localhost:4000/api/webrtc-events
```

### 3. **Session Mapping Storage** ✅
**Updated:** `backend/src/server.js` - `tutor:accept-request` handler

When a tutor accepts a student request, the system now stores:
```javascript
sessionId → { studentAddress, tutorAddress, languageId, startTime }
```

### 4. **Smart Contract Integration** ✅
**Updated:** `backend/src/services/contractService.js`

Added `endSession` function to ABI for blockchain transactions.

---

## 📋 Prerequisites

### 1. Redis Running
```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2. Hardhat Local Node Running
```bash
cd webapp/packages/hardhat
npx hardhat node
```

### 3. Smart Contract Deployed
```bash
cd webapp
yarn deploy
```

### 4. Environment Variables Set

**Backend `.env`:**
```bash
# /backend/.env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

REDIS_URL=redis://localhost:6379
```

**WebRTC `.env`:**
```bash
# /backend/webRTC-implementation-LangDAO/.env
PORT=3000
BACKEND_URL=http://localhost:4000/api/webrtc-events
```

---

## 🎯 Complete Testing Flow

### Step 1: Start All Services

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Hardhat:**
```bash
cd webapp/packages/hardhat
npx hardhat node
```

**Terminal 3 - Main Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 4 - WebRTC Server:**
```bash
cd backend/webRTC-implementation-LangDAO
npm install
node server.js
```

### Step 2: Verify Services

**Check Backend Health:**
```bash
curl http://localhost:4000/health
```

Expected:
```json
{
  "status": "ok",
  "redis": "connected",
  "timestamp": "2025-10-26T..."
}
```

**Check WebRTC Debug:**
```bash
curl http://localhost:4000/api/webrtc-debug
```

Expected:
```json
{
  "success": true,
  "contractService": {
    "initialized": true,
    "contract": true,
    "signer": true
  },
  "wallet": {
    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "balance": "10000.0"
  }
}
```

### Step 3: Test Session Flow

**A. Student requests tutor (via frontend or socket):**
```javascript
socket.emit('student:request-tutor', {
  requestId: 'test-session-123',
  studentAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  language: 0,
  budgetPerSecond: 1000000000000000
});
```

**B. Tutor accepts request:**
```javascript
socket.emit('tutor:accept-request', {
  requestId: 'test-session-123',
  tutorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
});
```

**Expected Backend Log:**
```
✅ Session mapping stored: test-session-123 -> 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**C. Verify session mapping stored:**
```bash
redis-cli HGETALL "session:test-session-123"
```

Expected:
```
1) "sessionId"
2) "test-session-123"
3) "studentAddress"
4) "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
5) "tutorAddress"
6) "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
```

**D. Connect to WebRTC room:**
Students/tutors connect via the frontend WebRTC client to:
```
ws://localhost:3000?room=test-session-123&role=student
ws://localhost:3000?room=test-session-123&role=tutor
```

**E. End the session (from frontend):**
```javascript
// Send via WebSocket to WebRTC server
ws.send(JSON.stringify({
  type: 'call-ended',
  userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
}));
```

**Expected WebRTC Server Log:**
```
Call ended by user: { type: 'call-ended', userAddress: '0x...' }
Backend notified: session-ended
```

**Expected Backend Log:**
```
📡 WebRTC Event received: { type: 'session-ended', sessionId: 'test-session-123', ... }
🛑 Session ended by student: test-session-123
🔍 Looking up session mapping for: test-session-123
📋 Session details: Student=0x7099..., Tutor=0xf39F..., Language=0
🔗 Calling endSession on smart contract for tutor: 0xf39F...
🔑 Using backend wallet: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
📝 Transaction sent: 0x...
✅ Session ended on blockchain. Gas used: 123456
📡 Emitted webrtc:session-completed event to frontend
🧹 Session cleanup completed for test-session-123
```

---

## 🧪 Manual Testing Endpoints

### Test WebRTC Event Directly
```bash
curl -X POST http://localhost:4000/api/webrtc-events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "session-ended",
    "sessionId": "test-session-123",
    "endedBy": "student",
    "userAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "timestamp": 1698345600000
  }'
```

### Test Manual Session End
```bash
curl -X POST http://localhost:4000/api/webrtc-test-end \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "tutorAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }'
```

---

## 🔍 Troubleshooting

### Issue: "Backend notification failed"
**Cause:** WebRTC server can't reach backend
**Solution:**
1. Verify backend is running: `curl http://localhost:4000/health`
2. Check BACKEND_URL in WebRTC `.env`: `echo $BACKEND_URL`
3. Restart WebRTC server with correct env

### Issue: "Session mapping not found"
**Cause:** Session wasn't stored when tutor accepted
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Verify tutor acceptance emitted correctly
3. Check backend logs for "Session mapping stored"

### Issue: "Smart contract not available"
**Cause:** Contract not deployed or RPC not accessible
**Solution:**
1. Verify Hardhat node is running
2. Check CONTRACT_ADDRESS in backend `.env`
3. Run debug endpoint: `curl http://localhost:4000/api/webrtc-debug`

### Issue: "No signer available for transaction"
**Cause:** PRIVATE_KEY not set or invalid
**Solution:**
1. Check PRIVATE_KEY in backend `.env`
2. Verify it's a valid 32-byte hex string (64 chars + 0x prefix)
3. Ensure the account has ETH for gas

### Issue: "Contract error: Caller is not the student, tutor nor owner"
**Cause:** Backend wallet is not authorized to call endSession
**Solution:**
Use one of these addresses as PRIVATE_KEY:
- Contract owner (deployer)
- Student's private key
- Tutor's private key

---

## 📊 Expected Event Flow

```
1. Student requests tutor
   ↓
2. Tutor accepts request
   ↓ [Session mapping stored in Redis]
3. Users join WebRTC room
   ↓
4. WebRTC server → Backend: "user-connected" events
   ↓
5. Heartbeat every 10s
   ↓
6. User ends call
   ↓
7. WebRTC server → Backend: "session-ended" event
   ↓
8. Backend looks up session mapping
   ↓
9. Backend calls endSession(tutorAddress) on contract
   ↓
10. Transaction confirmed
   ↓
11. Backend emits Socket.IO event to frontend
   ↓
12. Redis session cleanup
```

---

## 🎉 Success Indicators

When everything works correctly, you should see:

1. ✅ Session mapping stored in Redis
2. ✅ WebRTC events received by backend
3. ✅ Transaction hash logged
4. ✅ Gas used logged
5. ✅ Socket.IO event emitted
6. ✅ Session cleanup completed
7. ✅ No errors in any terminal

---

## 📝 Next Steps for Production

1. **Replace in-memory `activeRooms` with Redis** in webrtc.js routes
2. **Add authentication** to WebRTC events (verify signatures)
3. **Implement retry logic** for failed blockchain transactions
4. **Add monitoring/alerts** for failed session endings
5. **Use environment-specific URLs** for BACKEND_URL
6. **Secure PRIVATE_KEY** using secret management (AWS Secrets Manager, etc.)
7. **Add rate limiting** to `/api/webrtc-events` endpoint
8. **Implement idempotency** for session end (prevent double-processing)

---

## 🐛 Debug Commands

```bash
# Check Redis keys
redis-cli KEYS "session:*"

# Get session details
redis-cli HGETALL "session:test-session-123"

# Monitor Redis commands in real-time
redis-cli MONITOR

# Check backend logs
tail -f backend/logs/app.log

# Test contract call directly (Hardhat console)
npx hardhat console --network localhost
> const LangDAO = await ethers.getContractFactory("LangDAO");
> const langDAO = await LangDAO.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
> await langDAO.endSession("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
```

---

## ✨ Summary

The complete fix involved:

1. ✅ Created `/api/webrtc-events` endpoint in `routes/webrtc.js`
2. ✅ Added session mapping storage on tutor accept
3. ✅ Created `.env` file for WebRTC server with BACKEND_URL
4. ✅ Added `endSession` to contract service ABI
5. ✅ Made Socket.IO globally available for event emission
6. ✅ Added comprehensive error handling and logging

**The entire flow now works end-to-end!** 🎉
