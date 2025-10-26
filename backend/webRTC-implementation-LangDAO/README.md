# LangDAO Video Call Service

A secure WebRTC video calling application designed for LangDAO's tutoring platform, enabling real-time video communication between students and tutors with integrated billing, session management, and professional UI matching modern video calling standards.

## Overview

This WebRTC implementation facilitates high-quality video calls while providing real-time event tracking for billing, session management, and analytics integration with the LangDAO ecosystem. The service features a professional interface with session chat, language information display, and comprehensive status sharing between participants.

## ✨ Enhanced Features

- **🎥 Professional Video Interface**: Modern UI with role badges and status indicators
- **💬 Real-time Session Chat**: Built-in messaging with timestamp synchronization
- **🌍 Multi-language Support**: ISO 639 language codes with 16 supported languages
- **📊 Session Information Display**: Language cards and session metadata
- **🔄 Cross-user Status Sync**: Real-time mute/video status sharing between participants
- **⏱️ Continuous Session Timer**: Accurate timing from session start to end
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **🔒 Secure WebRTC**: End-to-end communication with HTTPS security
- **💓 Heartbeat System**: Real-time session monitoring every 10 seconds
- **🎛️ Intuitive Controls**: Clean SVG icons with visual feedback

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Server**
   ```bash
   node server.js
   ```

3. **Access Application**
   ```
   http://localhost:3000?room=test123&role=student&address=0x123&language=es&sessionStart=1698234567890
   http://localhost:3000?room=test123&role=tutor&address=0x456&language=es&sessionStart=1698234567890
   ```

### Production Deployment

**Live URL:** `https://langdao-production.up.railway.app`

**Example URLs:**
- Student: `https://langdao-production.up.railway.app?room=session-abc123&role=student&address=0x742d35Cc&language=es&sessionStart=1698234567890`
- Tutor: `https://langdao-production.up.railway.app?room=session-abc123&role=tutor&address=0x8ba1f109&language=es&sessionStart=1698234567890`

## 🔗 URL Parameters

| Parameter      | Description           | Values                | Required | Example              |
| -------------- | --------------------- | --------------------- | -------- | -------------------- |
| `room`         | Session identifier    | Any string            | Yes      | `session-abc123`     |
| `role`         | User type             | `student`, `tutor`    | Yes      | `student`            |
| `address`      | Wallet address        | Ethereum address      | Yes      | `0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1` |
| `language`     | Language code         | ISO 639 codes        | Yes      | `es`, `fr`, `de`, `ja` |
| `sessionStart` | Session start time    | Unix timestamp (ms)   | Yes      | `1698234567890`      |

## 🌍 Supported Languages

| Code | Language   | Native Name |
|------|------------|-------------|
| `es` | Spanish    | Español     |
| `fr` | French     | Français    |
| `de` | German     | Deutsch     |
| `it` | Italian    | Italiano    |
| `pt` | Portuguese | Português   |
| `ru` | Russian    | Русский     |
| `ja` | Japanese   | 日本語      |
| `ko` | Korean     | 한국어      |
| `zh` | Chinese    | 中文        |
| `ar` | Arabic     | العربية     |
| `nl` | Dutch      | Nederlands  |
| `sv` | Swedish    | Svenska     |
| `no` | Norwegian  | Norsk       |
| `fi` | Finnish    | Suomi       |
| `pl` | Polish     | Polski      |
| `en` | English    | English     |

## Security Requirements

### HTTPS Mandatory for Production

WebRTC requires HTTPS for camera/microphone access:

- ✅ **Development**: `http://localhost` (browser exception)
- ✅ **Production**: `https://langdao-production.up.railway.app`
- ❌ **HTTP in production**: Browser blocks media access

### WebSocket Security

The application automatically detects and uses secure protocols:

```javascript
// Auto-detection logic
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${location.host}?room=${roomId}`);
```

- **Local**: `ws://localhost:3000`
- **Production**: `wss://langdao-production.up.railway.app`

## Integration with LangDAO

### Event System

The application sends real-time events for billing and session management:

#### Critical Events (Must Handle)

1. **Session Started** - Begin billing
2. **Timer Update** - Real-time cost calculation (every second)
3. **User Disconnected** - Stop billing immediately
4. **Session Ended** - Final payment processing

#### Analytics Events

5. **User Connected** - Session tracking
6. **User Actions** - Behavior logging (mute, video toggle)

### Backend Integration

**Required Endpoint:**
```
POST https://your-backend.com/api/webrtc-events
Content-Type: application/json
```

**Environment Variable:**
```bash
BACKEND_URL=https://your-backend.com/api/webrtc-events
```

### Heartbeat Signal Structure

**Heartbeat Payload (sent every 10 seconds):**
```json
{
  "type": "session-heartbeat",
  "sessionId": "session-abc123",
  "userRole": "student",
  "userAddress": "0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1",
  "language": "es",
  "startTime": 1698234567890,
  "heartbeat": true,
  "timestamp": 1698234897890,
  "isAudioEnabled": true,
  "isVideoEnabled": false,
  "elapsedSeconds": 330
}
```

**Complete Event Types Sent to Backend:**

1. **user-connected** - When user joins the session
```json
{
  "type": "user-connected",
  "sessionId": "session-abc123",
  "userRole": "student",
  "timestamp": 1698234567890
}
```

2. **session-heartbeat** - Every 10 seconds during active session
```json
{
  "type": "session-heartbeat",
  "sessionId": "session-abc123",
  "userRole": "student",
  "userAddress": "0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1",
  "language": "es",
  "startTime": 1698234567890,
  "heartbeat": true,
  "timestamp": 1698234897890,
  "isAudioEnabled": true,
  "isVideoEnabled": false,
  "elapsedSeconds": 330
}
```

3. **user-disconnected** - When user leaves or connection drops
```json
{
  "type": "user-disconnected",
  "sessionId": "session-abc123",
  "userRole": "student",
  "reason": "connection-closed",
  "timestamp": 1698234897890
}
```

4. **session-ended** - When call is explicitly ended
```json
{
  "type": "session-ended",
  "sessionId": "session-abc123",
  "totalSeconds": 330,
  "endedBy": "student",
  "userAddress": "0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1",
  "timestamp": 1698234897890
}
```

### Frontend Integration

**URL Generation for Backend:**

The backend can generate WebRTC session URLs using this pattern:
```javascript
// Backend URL generation example
function generateWebRTCUrl(sessionData) {
  const baseUrl = 'https://langdao-production.up.railway.app';
  const params = new URLSearchParams({
    room: sessionData.sessionId,           // e.g., "session-abc123"
    role: sessionData.userRole,            // "student" or "tutor"
    address: sessionData.walletAddress,    // Ethereum wallet address
    language: sessionData.languageCode,    // ISO 639 code: "es", "fr", etc.
    sessionStart: Date.now()               // Current timestamp
  });

  return `${baseUrl}?${params.toString()}`;
}

// Example usage
const studentUrl = generateWebRTCUrl({
  sessionId: 'session-abc123',
  userRole: 'student',
  walletAddress: '0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1',
  languageCode: 'es'
});

const tutorUrl = generateWebRTCUrl({
  sessionId: 'session-abc123', // Same session ID
  userRole: 'tutor',
  walletAddress: '0x8ba1f109dDaA4bd101b53C61935e956fC7a665DE',
  languageCode: 'es'
});
```

**PostMessage Listener for Parent Application:**
```javascript
window.addEventListener('message', (event) => {
  const { type, sessionId, elapsedSeconds } = event.data;

  switch(type) {
    case 'session-started':
      startBillingDisplay();
      break;
    case 'timer-update':
      updateCostDisplay(elapsedSeconds);
      break;
    case 'user-disconnected':
      handlePartnerDisconnected();
      break;
    case 'session-ended':
      showFinalBill();
      break;
  }
});
```

## Project Structure

```
webRTC/
├── server.js              # WebSocket signaling server
├── public/
│   ├── index.html         # WebRTC client application
│   └── assets/           # UI icons
│       ├── icons8-microphone-48.png
│       ├── icons8-camera-24.png
│       └── icons8-call-button-24.png
├── package.json
├── INTEGRATION_REPORT.md  # Detailed integration guide
└── README.md
```

## Technical Architecture

### WebRTC Flow

1. **Signaling Server**: Node.js WebSocket server handles offer/answer exchange
2. **STUN Server**: Google's STUN server for NAT traversal
3. **Peer Connection**: Direct browser-to-browser media streaming
4. **Event Tracking**: Real-time session monitoring

### Session Management

```javascript
// Room-based connections
const rooms = new Map(); // Track active sessions
ws.roomId = roomId;      // Associate connection with room
ws.userRole = userRole;  // Track user role (student/tutor)
```

### Billing Integration

- **Start**: When both peers connect
- **Update**: Every second via timer
- **Stop**: On disconnection or explicit end
- **Calculate**: `(elapsedSeconds / 3600) * hourlyRate`

## UI Components

### Control Buttons

| Button     | Active State     | Inactive State | Function          |
| ---------- | ---------------- | -------------- | ----------------- |
| Microphone | Green + MIC icon | Red + MIC icon | Audio toggle      |
| Camera     | Green + CAM icon | Red + CAM icon | Video toggle      |
| End Call   | Red + CALL icon  | -              | Terminate session |

### Visual Feedback

- **Speaking Indicator**: Green border animation on active audio
- **Connection Status**: Real-time display of connection state
- **Timer Display**: Live session duration

## Error Handling

### Media Access Errors

```javascript
// Comprehensive error handling
if (!window.isSecureContext && location.protocol !== 'https:') {
  throw new Error('HTTPS is required for camera/microphone access');
}

// Specific error messages
NotAllowedError: "Permission denied"
NotFoundError: "No camera/microphone found"
NotSupportedError: "Browser not supported"
```

### Connection Recovery

- **WebSocket reconnection**: Automatic retry on disconnect
- **ICE candidate handling**: Graceful failure handling
- **Backend notification**: Failed API calls logged but non-blocking

## Deployment

### Railway Deployment

1. **Connect Repository**: Link GitHub repo to Railway
2. **Auto-deploy**: Pushes trigger automatic deployment
3. **Environment Variables**: Set `BACKEND_URL` in Railway dashboard
4. **Domain**: Use provided Railway domain or custom domain

### Manual Deployment

```bash
# Using Railway CLI
railway login
railway link
railway deploy
```

## Testing

### Local Testing

```bash
# Terminal 1
node server.js

# Terminal 2 - Open two browser tabs
open http://localhost:3000?room=test&role=student
open http://localhost:3000?room=test&role=tutor
```

### Production Testing

1. **HTTPS Access**: Ensure using `https://` URL
2. **Media Permissions**: Allow camera/microphone access
3. **Console Check**: No WebSocket or media errors
4. **Cross-browser**: Test Chrome, Firefox, Safari

## Browser Support

- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 14+
- ✅ Edge 80+
- ❌ Internet Explorer (not supported)

## Troubleshooting

### Common Issues

**Media Access Denied**
- Solution: Use HTTPS, allow permissions, refresh page

**WebSocket Connection Failed**
- Local: Check server is running on port 3000
- Production: Verify HTTPS and wss:// protocol

**Black Icon Squares**
- Solution: Ensure assets copied to `public/assets/`

**No Video/Audio**
- Check camera/microphone hardware
- Verify browser permissions
- Test with different browser

### Debug Mode

Enable console logging:
```javascript
console.log('WebRTC Debug Mode');
pc.oniceconnectionstatechange = () => {
  console.log('ICE state:', pc.iceConnectionState);
};
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For technical support or integration questions:
- Check `INTEGRATION_REPORT.md` for detailed integration guide
- Review browser console for error messages
- Verify HTTPS requirements are met

---

**Built for LangDAO** - Enabling seamless tutor-student video communication with integrated billing and session management.

---

## Implementation Summary

### What Has Been Completed

✅ **Professional Video Interface**: Modern UI matching language learning platform standards
✅ **Real-time Session Chat**: Built-in messaging with timestamps between participants
✅ **Multi-language Support**: 16 supported languages with ISO 639 codes
✅ **Cross-user Status Sync**: Real-time mute/video status sharing
✅ **Continuous Session Timer**: Accurate timing that doesn't reset on peer connections
✅ **Heartbeat System**: 10-second interval monitoring for backend integration
✅ **Lightweight Architecture**: Pure HTML/CSS/JS for fast Railway deployment
✅ **Secure WebRTC**: HTTPS-ready with automatic protocol detection
✅ **Responsive Design**: Works across desktop, tablet, and mobile devices
✅ **Professional Controls**: Clean SVG icons with visual feedback

### Backend Team Requirements

## Development Checklist

| Task | Status | Priority | Description |
|------|--------|----------|-------------|
| ☐ | **Endpoint Setup** | HIGH | Create `POST /api/webrtc-events` endpoint |
| ☐ | **Event Handling** | HIGH | Handle 4 event types: `user-connected`, `session-heartbeat`, `user-disconnected`, `session-ended` |
| ☐ | **Environment Config** | HIGH | Set `BACKEND_URL` environment variable in Railway |
| ☐ | **URL Generation** | HIGH | Implement session URL generation with role-based logic |
| ☐ | **Billing Integration** | HIGH | Start/stop billing based on heartbeat events |
| ☐ | **Heartbeat Monitoring** | MEDIUM | Implement disconnect detection (>25 seconds) |
| ☐ | **Grace Period System** | MEDIUM | Handle connection warnings and user decisions |
| ☐ | **Frontend Messaging** | MEDIUM | Send real-time updates to frontend via PostMessage |
| ☐ | **Edge Case Handling** | LOW | Handle multiple disconnects, simultaneous issues |

## Implementation Details

**1. Core Endpoint Setup:**
```javascript
// Required endpoint implementation
app.post('/api/webrtc-events', (req, res) => {
  const { type, sessionId, userRole, timestamp, elapsedSeconds } = req.body;

  switch(type) {
    case 'user-connected':
      handleUserConnected(sessionId, userRole, timestamp);
      break;
    case 'session-heartbeat':
      handleHeartbeat(sessionId, userRole, timestamp, elapsedSeconds, req.body);
      break;
    case 'user-disconnected':
      handleUserDisconnected(sessionId, userRole, timestamp);
      break;
    case 'session-ended':
      handleSessionEnded(sessionId, req.body);
      break;
  }

  res.json({ success: true });
});
```

**2. URL Generation with Business Logic:**
```javascript
// Role-based URL generation
function generateWebRTCUrl(sessionData, initiatorRole) {
  const baseUrl = process.env.WEBRTC_URL || 'https://langdao-production.up.railway.app';

  // Business rule: Only students can initiate calls
  if (initiatorRole === 'student') {
    return {
      studentUrl: `${baseUrl}?room=${sessionData.sessionId}&role=student&address=${sessionData.studentAddress}&language=${sessionData.languageCode}&sessionStart=${Date.now()}`,
      tutorUrl: null // Generate later when tutor accepts
    };
  }

  // Generate tutor URL only after student joins or tutor accepts
  if (initiatorRole === 'tutor' && sessionData.studentConnected) {
    return {
      tutorUrl: `${baseUrl}?room=${sessionData.sessionId}&role=tutor&address=${sessionData.tutorAddress}&language=${sessionData.languageCode}&sessionStart=${sessionData.originalStartTime}`
    };
  }

  throw new Error(`Invalid role or session state for URL generation`);
}
```

**3. Billing Integration:**
```javascript
// Billing state management
const activeSessions = new Map();

function handleHeartbeat(sessionId, userRole, timestamp, elapsedSeconds, fullData) {
  const sessionKey = sessionId;

  if (!activeSessions.has(sessionKey)) {
    // First heartbeat - start billing
    activeSessions.set(sessionKey, {
      startTime: timestamp,
      lastBillingUpdate: timestamp,
      totalSeconds: 0,
      isActive: true
    });

    // Notify billing system
    startBilling(sessionId, fullData);
  }

  // Update billing every heartbeat (10 seconds)
  const session = activeSessions.get(sessionKey);
  session.totalSeconds = elapsedSeconds;
  session.lastBillingUpdate = timestamp;

  // Calculate current cost and update billing
  const currentCost = (elapsedSeconds / 3600) * getHourlyRate(sessionId);
  updateBilling(sessionId, currentCost, elapsedSeconds);
}

function handleUserDisconnected(sessionId, userRole, timestamp) {
  // Stop billing immediately
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isActive = false;
    stopBilling(sessionId, session.totalSeconds);
  }
}
```

**4. Heartbeat Monitoring & Disconnect Detection:**
```javascript
// Connection monitoring system
const sessionHeartbeats = new Map();

function handleHeartbeat(sessionId, userRole, timestamp, elapsedSeconds, fullData) {
  // Track individual user heartbeats
  const userKey = `${sessionId}-${userRole}`;
  sessionHeartbeats.set(userKey, {
    lastSeen: timestamp,
    sessionId,
    userRole,
    elapsedSeconds
  });

  // ... billing logic above
}

// Monitor for disconnections every 15 seconds
setInterval(() => {
  const now = Date.now();
  const DISCONNECT_THRESHOLD = 25000; // 25 seconds (2.5x heartbeat interval)

  sessionHeartbeats.forEach((data, userKey) => {
    if (now - data.lastSeen > DISCONNECT_THRESHOLD) {
      console.log(`User ${data.userRole} disconnected from session ${data.sessionId}`);

      // Send disconnect warning to frontend
      sendDisconnectWarning(data.sessionId, data.userRole);

      // Remove to avoid spam
      sessionHeartbeats.delete(userKey);
    }
  });
}, 15000);
```

**5. Grace Period System:**
```javascript
// Grace period management
const gracePeriods = new Map();

function sendDisconnectWarning(sessionId, disconnectedRole) {
  const gracePeriodSeconds = 30; // 30 second grace period

  // Store grace period state
  gracePeriods.set(sessionId, {
    disconnectedRole,
    startTime: Date.now(),
    duration: gracePeriodSeconds * 1000,
    resolved: false
  });

  // Send to frontend via your messaging system
  sendToFrontend(sessionId, {
    type: 'connection-warning',
    disconnectedRole,
    gracePeriodSeconds,
    sessionId
  });

  // Auto-end session if no decision made
  setTimeout(() => {
    const grace = gracePeriods.get(sessionId);
    if (grace && !grace.resolved) {
      handleGracePeriodExpired(sessionId);
    }
  }, gracePeriodSeconds * 1000);
}

// Handle grace period decisions from frontend
app.post('/api/grace-period-decision', (req, res) => {
  const { sessionId, decision, decidedBy } = req.body; // decision: 'wait' or 'end'

  const grace = gracePeriods.get(sessionId);
  if (grace) {
    grace.resolved = true;

    if (decision === 'end') {
      // End session immediately
      endSession(sessionId, decidedBy);
    } else {
      // Continue waiting - reset disconnect detection
      console.log(`Grace period granted for session ${sessionId}`);
    }

    gracePeriods.delete(sessionId);
  }

  res.json({ success: true });
});
```

## Critical Questions for Backend Team

**Q: What happens when someone disconnects for >25 seconds?**
**A:** The backend should detect this via missing heartbeats and send a `connection-warning` to the frontend, prompting the remaining user to either wait 30 seconds or end the session immediately. This prevents billing for dead connections while giving users a chance to reconnect.

**Q: Who controls call initiation - students vs tutors?**
**A:** This is a business logic decision. The backend should implement role-based URL generation. For example: only students can initiate calls, tutors get URLs only after students connect. Implement this in your URL generation function, not in the WebRTC app.

**Q: When should billing start and stop?**
**A:** Start billing on the first `session-heartbeat` (both users connected), update every 10 seconds, stop immediately on `user-disconnected` or `session-ended`. Never bill during grace periods or when only one user is connected.

### Frontend Team Requirements

**1. Integration Method:**
- Embed WebRTC interface in iframe or popup window
- Implement PostMessage listener to receive session events
- Handle billing display updates in real-time

**2. User Flow:**
- Backend generates session URLs and sends to both participants
- Users click URLs to join video call
- Parent application receives events for billing updates
- Session ends when either user clicks "Exit" or closes window

**3. Event Handling:**
- `session-started`: Begin billing display
- `timer-update`: Update cost display every second
- `user-disconnected`: Show partner disconnected state
- `session-ended`: Process final payment and show session summary

### Deployment Notes

- **Production URL**: `https://langdao-production.up.railway.app`
- **HTTPS Required**: Camera/microphone access blocked on HTTP in production
- **Environment Variables**: Set `BACKEND_URL` in Railway dashboard
- **Auto-deployment**: Enabled on git push to connected repository