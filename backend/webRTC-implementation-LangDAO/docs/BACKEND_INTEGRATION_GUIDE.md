# Backend Integration Guide for WebRTC Video Calling

This document provides comprehensive guidance for backend developers integrating with the LangDAO WebRTC video calling service for billing, session management, and analytics.

## Overview

The WebRTC service sends real-time events to your backend via HTTP POST requests. Your backend must handle these events to manage billing, session tracking, and user analytics for the LangDAO platform.

## Required Backend Endpoint

### Core Endpoint Setup

**Required Endpoint:**
```
POST /api/webrtc-events
Content-Type: application/json
```

**Environment Variable:**
```bash
BACKEND_URL=https://your-backend.com/api/webrtc-events
```

### Basic Implementation

```javascript
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

## Event Types and Data Structures

### 1. User Connected Event

**Type:** `user-connected`
**When:** User joins the session
**Frequency:** Once per user per session

**Data Structure:**
```json
{
  "type": "user-connected",
  "sessionId": "session-abc123",
  "userRole": "student",
  "userAddress": "0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1",
  "language": "es",
  "timestamp": 1698234567890
}
```

### 2. Session Heartbeat Event (CRITICAL FOR BILLING)

**Type:** `session-heartbeat`
**When:** Every 10 seconds during active session
**Frequency:** Every 10 seconds
**Purpose:** Real-time billing updates and connection monitoring

**Data Structure:**
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

### 3. User Disconnected Event (CRITICAL FOR BILLING)

**Type:** `user-disconnected`
**When:** User leaves or connection drops
**Frequency:** Once per disconnection
**Purpose:** Stop billing immediately

**Data Structure:**
```json
{
  "type": "user-disconnected",
  "sessionId": "session-abc123",
  "userRole": "student",
  "userAddress": "0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1",
  "reason": "connection-closed",
  "timestamp": 1698234897890
}
```

### 4. Session Ended Event (CRITICAL FOR BILLING)

**Type:** `session-ended`
**When:** Call is explicitly ended by either user
**Frequency:** Once per session
**Purpose:** Final payment processing

**Data Structure:**
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

## Session URL Generation

### Role-Based URL Generation

```javascript
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

### Usage Example

```javascript
// When student requests a session
const studentSession = generateWebRTCUrl({
  sessionId: 'session-abc123',
  studentAddress: '0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1',
  languageCode: 'es'
}, 'student');

// Send studentUrl to student
await sendSessionUrlToUser(studentSession.studentUrl, studentData);

// When tutor accepts (later)
const tutorSession = generateWebRTCUrl({
  sessionId: 'session-abc123',
  tutorAddress: '0x8ba1f109dDaA4bd101b53C61935e956fC7a665DE',
  languageCode: 'es',
  originalStartTime: sessionStartTimestamp,
  studentConnected: true
}, 'tutor');

// Send tutorUrl to tutor
await sendSessionUrlToUser(tutorSession.tutorUrl, tutorData);
```

## Billing System Integration

### Session State Management

```javascript
const activeSessions = new Map();

function handleHeartbeat(sessionId, userRole, timestamp, elapsedSeconds, fullData) {
  const sessionKey = sessionId;

  if (!activeSessions.has(sessionKey)) {
    // First heartbeat - start billing
    activeSessions.set(sessionKey, {
      startTime: timestamp,
      lastBillingUpdate: timestamp,
      totalSeconds: 0,
      isActive: true,
      studentAddress: fullData.userRole === 'student' ? fullData.userAddress : null,
      tutorAddress: fullData.userRole === 'tutor' ? fullData.userAddress : null,
      language: fullData.language,
      hourlyRate: getHourlyRateForLanguage(fullData.language)
    });

    // Notify billing system
    await startBilling(sessionId, fullData);
  }

  // Update billing every heartbeat (10 seconds)
  const session = activeSessions.get(sessionKey);
  session.totalSeconds = elapsedSeconds;
  session.lastBillingUpdate = timestamp;

  // Update participant address if missing
  if (fullData.userRole === 'student' && !session.studentAddress) {
    session.studentAddress = fullData.userAddress;
  }
  if (fullData.userRole === 'tutor' && !session.tutorAddress) {
    session.tutorAddress = fullData.userAddress;
  }

  // Calculate current cost and update billing
  const currentCost = (elapsedSeconds / 3600) * session.hourlyRate;
  await updateBilling(sessionId, currentCost, elapsedSeconds);
}

function handleUserDisconnected(sessionId, userRole, timestamp) {
  // Stop billing immediately
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isActive = false;
    await stopBilling(sessionId, session.totalSeconds);
  }
}
```

### Billing Functions Implementation

```javascript
async function startBilling(sessionId, sessionData) {
  // Create billing record
  await db.billingRecords.create({
    sessionId,
    studentAddress: sessionData.userRole === 'student' ? sessionData.userAddress : null,
    tutorAddress: sessionData.userRole === 'tutor' ? sessionData.userAddress : null,
    language: sessionData.language,
    startTime: sessionData.timestamp,
    status: 'active',
    totalCost: 0
  });

  console.log(`Billing started for session ${sessionId}`);
}

async function updateBilling(sessionId, currentCost, elapsedSeconds) {
  await db.billingRecords.update({
    totalCost: currentCost,
    elapsedSeconds: elapsedSeconds,
    lastUpdate: new Date()
  }, {
    where: { sessionId, status: 'active' }
  });

  // Check if user has sufficient balance
  const session = activeSessions.get(sessionId);
  if (session.studentAddress) {
    const balance = await getUserBalance(session.studentAddress);
    if (balance < currentCost + 5) { // $5 buffer
      await sendLowBalanceWarning(session.studentAddress, balance);
    }
  }
}

async function stopBilling(sessionId, totalSeconds) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const finalCost = (totalSeconds / 3600) * session.hourlyRate;

  await db.billingRecords.update({
    status: 'completed',
    endTime: new Date(),
    totalSeconds: totalSeconds,
    finalCost: finalCost
  }, {
    where: { sessionId, status: 'active' }
  });

  // Process payment
  if (session.studentAddress && session.tutorAddress) {
    await processSessionPayment({
      sessionId,
      studentAddress: session.studentAddress,
      tutorAddress: session.tutorAddress,
      amount: finalCost,
      duration: totalSeconds
    });
  }

  activeSessions.delete(sessionId);
  console.log(`Billing completed for session ${sessionId}: $${finalCost.toFixed(2)}`);
}
```

## Connection Monitoring & Disconnect Detection

### Heartbeat Monitoring System

```javascript
const sessionHeartbeats = new Map();

function handleHeartbeat(sessionId, userRole, timestamp, elapsedSeconds, fullData) {
  // Track individual user heartbeats
  const userKey = `${sessionId}-${userRole}`;
  sessionHeartbeats.set(userKey, {
    lastSeen: timestamp,
    sessionId,
    userRole,
    elapsedSeconds,
    userAddress: fullData.userAddress
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

### Grace Period Management

```javascript
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

## Database Schema Recommendations

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  student_address VARCHAR(42) NOT NULL,
  tutor_address VARCHAR(42),
  language VARCHAR(5) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Billing Records Table

```sql
CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  student_address VARCHAR(42) NOT NULL,
  tutor_address VARCHAR(42),
  language VARCHAR(5) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  total_seconds INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  final_cost DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active',
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Session Events Table (Analytics)

```sql
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Rate Management

### Language-Based Pricing

```javascript
const languageRates = {
  'en': 2.00,  // $2/hour for English
  'es': 2.50,  // $2.50/hour for Spanish
  'fr': 3.00,  // $3/hour for French
  'de': 3.00,  // $3/hour for German
  'ja': 4.00,  // $4/hour for Japanese
  'ko': 4.00,  // $4/hour for Korean
  'zh': 3.50,  // $3.50/hour for Chinese
  'ar': 3.50,  // $3.50/hour for Arabic
  'ru': 2.50,  // $2.50/hour for Russian
  'it': 2.50,  // $2.50/hour for Italian
  'pt': 2.50,  // $2.50/hour for Portuguese
  'nl': 2.50,  // $2.50/hour for Dutch
  'sv': 2.50,  // $2.50/hour for Swedish
  'no': 2.50,  // $2.50/hour for Norwegian
  'fi': 2.50,  // $2.50/hour for Finnish
  'pl': 2.50   // $2.50/hour for Polish
};

function getHourlyRateForLanguage(languageCode) {
  return languageRates[languageCode] || languageRates['en'];
}
```

### Dynamic Pricing (Optional)

```javascript
function getDynamicRate(languageCode, tutorId, timeOfDay, demandLevel) {
  const baseRate = getHourlyRateForLanguage(languageCode);

  // Peak hours multiplier (9 AM - 6 PM)
  const hour = new Date().getHours();
  const peakMultiplier = (hour >= 9 && hour <= 18) ? 1.2 : 1.0;

  // High demand multiplier
  const demandMultiplier = demandLevel > 0.8 ? 1.3 : 1.0;

  // Experienced tutor bonus
  const tutorMultiplier = getTutorExperienceMultiplier(tutorId);

  return baseRate * peakMultiplier * demandMultiplier * tutorMultiplier;
}
```

## Error Handling & Resilience

### Event Processing with Retry Logic

```javascript
async function processWebRTCEvent(eventData) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await handleEventByType(eventData);
      break; // Success, exit retry loop
    } catch (error) {
      attempt++;
      console.error(`Event processing failed (attempt ${attempt}):`, error);

      if (attempt >= maxRetries) {
        // Store in dead letter queue for manual review
        await storeFailedEvent(eventData, error);
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

### Duplicate Event Handling

```javascript
const processedEvents = new Set();

app.post('/api/webrtc-events', async (req, res) => {
  const eventData = req.body;
  const eventId = `${eventData.sessionId}-${eventData.type}-${eventData.timestamp}`;

  // Check for duplicate events
  if (processedEvents.has(eventId)) {
    console.log(`Duplicate event ignored: ${eventId}`);
    return res.json({ success: true, duplicate: true });
  }

  try {
    await processWebRTCEvent(eventData);
    processedEvents.add(eventId);

    // Clean up old event IDs (keep last 1000)
    if (processedEvents.size > 1000) {
      const oldestIds = Array.from(processedEvents).slice(0, 100);
      oldestIds.forEach(id => processedEvents.delete(id));
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Security Considerations

### Request Validation

```javascript
const validateWebRTCEvent = (eventData) => {
  const requiredFields = {
    'user-connected': ['sessionId', 'userRole', 'userAddress', 'timestamp'],
    'session-heartbeat': ['sessionId', 'userRole', 'userAddress', 'elapsedSeconds', 'timestamp'],
    'user-disconnected': ['sessionId', 'userRole', 'timestamp'],
    'session-ended': ['sessionId', 'totalSeconds', 'endedBy', 'timestamp']
  };

  const required = requiredFields[eventData.type];
  if (!required) {
    throw new Error(`Unknown event type: ${eventData.type}`);
  }

  for (const field of required) {
    if (!eventData[field] && eventData[field] !== 0) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate wallet address format
  if (eventData.userAddress && !/^0x[a-fA-F0-9]{40}$/.test(eventData.userAddress)) {
    throw new Error('Invalid wallet address format');
  }

  // Validate timestamp is recent (within 5 minutes)
  const now = Date.now();
  if (Math.abs(now - eventData.timestamp) > 5 * 60 * 1000) {
    throw new Error('Event timestamp too old or in future');
  }
};
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const webrtcEventLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many WebRTC events from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/webrtc-events', webrtcEventLimiter);
```

## Analytics & Reporting

### Session Analytics

```javascript
async function generateSessionAnalytics(timeRange) {
  const analytics = await db.query(`
    SELECT
      language,
      COUNT(*) as total_sessions,
      AVG(total_seconds) as avg_duration,
      SUM(final_cost) as total_revenue,
      AVG(final_cost) as avg_session_cost
    FROM billing_records
    WHERE created_at >= $1 AND created_at <= $2 AND status = 'completed'
    GROUP BY language
    ORDER BY total_revenue DESC
  `, [timeRange.start, timeRange.end]);

  return analytics.rows;
}
```

### Real-time Dashboard Data

```javascript
async function getDashboardMetrics() {
  const activeSessions = await db.query(`
    SELECT COUNT(*) as count FROM sessions WHERE status = 'active'
  `);

  const todayRevenue = await db.query(`
    SELECT SUM(final_cost) as revenue FROM billing_records
    WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'
  `);

  const avgSessionLength = await db.query(`
    SELECT AVG(total_seconds) as avg_seconds FROM sessions
    WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'
  `);

  return {
    activeSessions: activeSessions.rows[0].count,
    todayRevenue: todayRevenue.rows[0].revenue || 0,
    avgSessionLength: avgSessionLength.rows[0].avg_seconds || 0
  };
}
```

## Testing Your Integration

### Mock Event Sender

```javascript
const axios = require('axios');

const mockEvents = [
  {
    type: 'user-connected',
    sessionId: 'test-session-123',
    userRole: 'student',
    userAddress: '0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1',
    language: 'es',
    timestamp: Date.now()
  },
  {
    type: 'session-heartbeat',
    sessionId: 'test-session-123',
    userRole: 'student',
    userAddress: '0x742d35Cc6634C0532925a3b8D52c0b98db8d2aD1',
    language: 'es',
    startTime: Date.now() - 30000,
    heartbeat: true,
    timestamp: Date.now(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    elapsedSeconds: 30
  }
];

async function testWebRTCIntegration() {
  for (const event of mockEvents) {
    try {
      const response = await axios.post('http://localhost:3000/api/webrtc-events', event);
      console.log(`Event ${event.type} processed:`, response.data);
    } catch (error) {
      console.error(`Failed to process ${event.type}:`, error.message);
    }

    // Wait between events
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

This comprehensive backend integration guide provides everything needed to handle WebRTC events, manage billing, monitor sessions, and maintain data integrity for the LangDAO video calling platform.


  New Functionality:

  When someone clicks "End Session":
  1. ✅ Broadcasts termination: Sends call-ended message to other participants
  2. ✅ Immediate cleanup: Stops media, closes connections, ends timer
  3. ✅ Backend notification: Sends session-ended event for billing
  4. ✅ Visual feedback: Shows "Call Ended" message before closing

  When receiving termination from other person:
  1. ✅ No confirmation: Immediately ends call (no annoying popup)
  2. ✅ Automatic cleanup: Same cleanup process as local termination
  3. ✅ Backend notification: Sends user-disconnected event
  4. ✅ Clean exit: Shows message and closes gracefully
