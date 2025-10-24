# WebRTC End Session Integration

## Overview

This integration connects the webRTC video call system with the LangDAO smart contract's `endSession()` function. When a user ends a call or disconnects, the backend automatically calls `endSession()` on the blockchain to process payment and update session state.

## Architecture

```
WebRTC Server (Railway)
    ↓ HTTP POST
Backend API (/api/webrtc-events)
    ↓ Read session mapping from Redis
    ↓ Call smart contract
LangDAO.endSession(tutorAddress)
    ↓ Process payment
    ↓ Update session state
```

## Components Created

### 1. **backend/src/routes/webrtc.js**
- Receives events from webRTC server
- Handles: `session-heartbeat`, `session-ended`, `user-disconnected`
- Calls `endSession()` on smart contract
- Monitors heartbeat and auto-ends stale sessions

### 2. **backend/src/services/sessionService.js**
- Stores session mappings in Redis
- Maps `sessionId` → `{studentAddress, tutorAddress, languageId}`
- Used to find tutor address when ending session

### 3. **backend/webRTC-implementation-LangDAO/server.js** (Updated)
- Changed backend URL from `localhost:3001` to `localhost:4000`
- Sends events to main LangDAO backend

## Events Flow

### When Session Starts:
1. Student confirms transaction → `startSession()` called on blockchain
2. Student emits `session:started` socket event
3. Backend stores session mapping in Redis:
   ```javascript
   {
     sessionId: "req_abc123",
     studentAddress: "0x...",
     tutorAddress: "0x...",
     languageId: 1
   }
   ```
4. Both users redirect to webRTC call

### When Session Ends:

#### Method 1: User Clicks "End Call"
1. WebRTC client sends `call-ended` message
2. WebRTC server → POST `/api/webrtc-events`
   ```json
   {
     "type": "session-ended",
     "sessionId": "req_abc123",
     "endedBy": "student",
     "userAddress": "0x...",
     "timestamp": 1234567890
   }
   ```
3. Backend retrieves session mapping from Redis
4. Backend calls `langDAOContract.endSession(tutorAddress)`
5. Smart contract processes payment and updates state
6. Session mapping removed from Redis

#### Method 2: User Disconnects (Connection Lost)
1. WebRTC server detects disconnect
2. WebRTC server → POST `/api/webrtc-events`
   ```json
   {
     "type": "user-disconnected",
     "sessionId": "req_abc123",
     "userRole": "student",
     "reason": "connection-closed"
   }
   ```
3. Backend waits 30 seconds (grace period for reconnection)
4. If no reconnection, calls `endSession()` on blockchain

#### Method 3: Heartbeat Timeout
1. WebRTC client sends heartbeat every 30 seconds
2. Backend monitors heartbeats every minute
3. If no heartbeat for 2 minutes → calls `endSession()`

## Smart Contract Integration

The backend uses ethers.js to interact with the LangDAO contract:

```javascript
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const backendWallet = new ethers.Wallet(PRIVATE_KEY, provider);
const langDAOContract = new ethers.Contract(ADDRESS, ABI, backendWallet);

// End session
const tx = await langDAOContract.endSession(tutorAddress);
await tx.wait();
```

## Environment Variables

### Backend (.env)
```bash
# Blockchain
RPC_URL=http://localhost:8545
BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Redis
REDIS_URL=redis://localhost:6379
```

### WebRTC Server (.env)
```bash
BACKEND_URL=http://localhost:4000/api/webrtc-events
PORT=3000
```

## Testing

### 1. Start All Services
```bash
# Terminal 1: Local blockchain
cd webapp/packages/hardhat
yarn chain

# Terminal 2: Redis
redis-server

# Terminal 3: Main backend
cd backend
yarn dev

# Terminal 4: WebRTC server
cd backend/webRTC-implementation-LangDAO
npm start

# Terminal 5: Frontend
cd webapp
yarn start
```

### 2. Test Session End
1. Start a session between student and tutor
2. Both users should be in webRTC call
3. Click "End Call" button
4. Check backend logs for:
   ```
   🛑 Session ended by student: req_abc123
   Session details: Student=0x..., Tutor=0x...
   Calling endSession on smart contract for tutor: 0x...
   Transaction sent: 0x...
   ✅ Session ended on blockchain. Gas used: 123456
   ```

### 3. Test Disconnect
1. Start a session
2. Close browser tab (simulate disconnect)
3. Wait 30 seconds
4. Check backend logs for grace period and auto-end

### 4. Test Heartbeat Timeout
1. Start a session
2. Stop sending heartbeats (pause webRTC client)
3. Wait 2 minutes
4. Backend should auto-end session

## Monitoring

### Backend Logs
```bash
# Session started
✅ Session mapping stored: req_abc123 -> 0x1234...

# Heartbeat received
💓 Heartbeat for session req_abc123

# Session ended
🛑 Session ended by student: req_abc123
✅ Session ended on blockchain. Gas used: 123456
✅ Session mapping removed: req_abc123
```

### WebRTC Server Logs
```bash
# User connected
Client joined room: req_abc123 as student

# Heartbeat sent
Heartbeat received: { sessionId: 'req_abc123', ... }

# Call ended
Call ended by user: { type: 'call-ended', ... }
Backend notified: session-ended
```

## Error Handling

### Session Not Found
```javascript
// If session mapping doesn't exist
Session mapping not found for req_abc123
// Session may have already ended or expired
```

### Blockchain Transaction Failed
```javascript
// If endSession() reverts
Error ending session on blockchain: Error: execution reverted
// Check: Is session still active? Does tutor have active session?
```

### WebRTC Server Unreachable
```javascript
// If backend can't reach webRTC server
Backend notification failed: ECONNREFUSED
// WebRTC server may be down
```

## Future Improvements

1. **Add session duration tracking** - Store start time and calculate duration
2. **Add payment verification** - Verify payment amount matches duration
3. **Add session history** - Store completed sessions in database
4. **Add reconnection handling** - Allow users to rejoin after disconnect
5. **Add admin override** - Allow owner to force-end sessions
6. **Add session analytics** - Track average session duration, completion rate, etc.

## Security Considerations

1. **Backend Private Key** - Store securely, never commit to git
2. **Rate Limiting** - Already implemented on API endpoints
3. **Session Validation** - Verify session exists before ending
4. **Grace Period** - 30 seconds prevents accidental ends from brief disconnects
5. **Heartbeat Monitoring** - 2-minute timeout prevents zombie sessions

## Troubleshooting

### Session doesn't end when clicking "End Call"
- Check webRTC server logs - is event being sent?
- Check backend logs - is event being received?
- Check Redis - does session mapping exist?
- Check blockchain - is session still active?

### Payment not processed correctly
- Check smart contract logs
- Verify `endSession()` was called with correct tutor address
- Check student's balance before/after

### Tutor stuck in "waiting-for-student" state
- Check if blockchain polling is working
- Check if socket event was received
- Manually end session using smart contract

## Summary

This integration provides **three layers of protection** to ensure sessions are properly ended:

1. **User Action** - Immediate end when user clicks button
2. **Disconnect Detection** - Auto-end after 30-second grace period
3. **Heartbeat Monitoring** - Auto-end after 2-minute timeout

All methods call `endSession()` on the blockchain to process payment and update state.
