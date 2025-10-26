# Frontend Navbar Integration Guide

This document provides guidance for frontend developers who want to create a custom navbar/header for the WebRTC video calling component and need access to real-time session data.

## Overview

The WebRTC component sends real-time events via `postMessage` that the parent application can listen to for building custom navigation bars with live session information.

## Available Signals for Navbar

### 1. Session Timer Data

The WebRTC component continuously emits timer updates that can be used to display session duration in your navbar.

**Event Type:** `timer-update`
**Frequency:** Every second
**Data Structure:**
```javascript
{
  type: 'timer-update',
  sessionId: 'session-abc123',
  elapsedSeconds: 330,
  formattedTime: '05:30',
  userRole: 'student',
  timestamp: 1698234897890
}
```

### 2. Session Status Events

Track the overall session state for navbar indicators.

**Event Types:**
- `session-started` - Both participants connected
- `session-ended` - Call terminated
- `user-connected` - Current user joined
- `user-disconnected` - Participant left

**Data Structure:**
```javascript
{
  type: 'session-started',
  sessionId: 'session-abc123',
  participants: ['student', 'tutor'],
  userAddress: '0x742d35Cc...',
  language: 'es',
  timestamp: 1698234567890
}
```

### 3. Connection Status

Monitor connection quality and participant presence.

**Event Type:** `connection-status`
**Data Structure:**
```javascript
{
  type: 'connection-status',
  sessionId: 'session-abc123',
  isConnected: true,
  participantsCount: 2,
  connectionQuality: 'good', // 'excellent', 'good', 'poor', 'disconnected'
  timestamp: 1698234897890
}
```

### 4. User Actions

Track participant actions for navbar status indicators.

**Event Type:** `user-action`
**Data Structure:**
```javascript
{
  type: 'user-action',
  action: 'muted', // 'muted', 'unmuted', 'video-enabled', 'video-disabled'
  sessionId: 'session-abc123',
  userRole: 'student',
  userAddress: '0x742d35Cc...',
  timestamp: 1698234897890
}
```

## Implementation Example

### Basic PostMessage Listener

```javascript
// Listen for WebRTC events in your main application
window.addEventListener('message', (event) => {
  // Verify origin if needed
  if (event.origin !== 'https://your-webrtc-domain.com') return;

  const { type, sessionId, elapsedSeconds, formattedTime } = event.data;

  switch(type) {
    case 'session-started':
      updateNavbarStatus('live', true);
      startBillingDisplay();
      break;

    case 'timer-update':
      updateSessionTimer(formattedTime);
      updateWalletBalance(elapsedSeconds);
      break;

    case 'user-disconnected':
      updateNavbarStatus('reconnecting', false);
      pauseBilling();
      break;

    case 'session-ended':
      updateNavbarStatus('ended', false);
      showSessionSummary();
      break;

    case 'user-action':
      updateParticipantStatus(event.data);
      break;
  }
});
```

### Navbar Component Example (React)

```jsx
import React, { useState, useEffect } from 'react';

const VideoCallNavbar = ({ sessionId }) => {
  const [sessionTime, setSessionTime] = useState('00:00');
  const [isLive, setIsLive] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(100.00);

  useEffect(() => {
    const handleWebRTCMessage = (event) => {
      const { type, elapsedSeconds, formattedTime } = event.data;

      switch(type) {
        case 'session-started':
          setIsLive(true);
          setParticipantsCount(2);
          break;

        case 'timer-update':
          setSessionTime(formattedTime);
          // Calculate cost: $2 per minute
          const cost = (elapsedSeconds / 60) * 2;
          setWalletBalance(100 - cost);
          break;

        case 'user-disconnected':
          setParticipantsCount(1);
          setIsLive(false);
          break;

        case 'session-ended':
          setIsLive(false);
          break;
      }
    };

    window.addEventListener('message', handleWebRTCMessage);
    return () => window.removeEventListener('message', handleWebRTCMessage);
  }, []);

  return (
    <nav className="video-call-navbar">
      <div className="session-info">
        <span className="session-id">{sessionId}</span>
        <span className="session-time">{sessionTime}</span>
        <span className={`status ${isLive ? 'live' : 'offline'}`}>
          {isLive ? '● Live' : '○ Offline'}
        </span>
      </div>

      <div className="participant-info">
        <span>{participantsCount} participants</span>
      </div>

      <div className="wallet-info">
        <span className="balance">${walletBalance.toFixed(2)}</span>
        <button className="end-session" onClick={handleEndSession}>
          End Session
        </button>
      </div>
    </nav>
  );
};
```

### Navbar Styling Suggestions

```css
.video-call-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.session-info {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 14px;
}

.status.live {
  color: #00ff88;
}

.status.offline {
  color: #ff4757;
}

.wallet-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.balance {
  font-weight: 600;
  color: #4A90E2;
}

.end-session {
  background: #ff4757;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
```

## Session Control from Navbar

### Ending Sessions

To end a session from your custom navbar:

```javascript
// Send message to WebRTC iframe
const webrtcFrame = document.getElementById('webrtc-iframe');
webrtcFrame.contentWindow.postMessage({
  type: 'end-session',
  reason: 'user-request'
}, '*');
```

### Muting/Unmuting

```javascript
// Control audio/video from navbar
webrtcFrame.contentWindow.postMessage({
  type: 'toggle-audio',
  enabled: false
}, '*');

webrtcFrame.contentWindow.postMessage({
  type: 'toggle-video',
  enabled: true
}, '*');
```

## Billing Integration

### Real-time Cost Calculation

```javascript
const RATE_PER_MINUTE = 2.00; // $2 per minute

function calculateSessionCost(elapsedSeconds) {
  const minutes = elapsedSeconds / 60;
  return minutes * RATE_PER_MINUTE;
}

function updateWalletDisplay(elapsedSeconds) {
  const cost = calculateSessionCost(elapsedSeconds);
  const remaining = initialBalance - cost;

  document.getElementById('wallet-balance').textContent =
    `$${remaining.toFixed(2)}`;

  // Warn if balance is low
  if (remaining < 5.00) {
    showLowBalanceWarning();
  }
}
```

### Grace Period Handling

```javascript
// Handle disconnection warnings
window.addEventListener('message', (event) => {
  if (event.data.type === 'connection-warning') {
    const { disconnectedRole, gracePeriodSeconds } = event.data;

    showDisconnectionModal({
      message: `${disconnectedRole} disconnected. Wait ${gracePeriodSeconds}s or end session?`,
      onWait: () => {
        // Continue session
        event.source.postMessage({
          type: 'grace-period-decision',
          decision: 'wait'
        }, '*');
      },
      onEnd: () => {
        // End session immediately
        event.source.postMessage({
          type: 'grace-period-decision',
          decision: 'end'
        }, '*');
      }
    });
  }
});
```

## Best Practices

### 1. **Performance**
- Throttle balance updates to avoid excessive re-renders
- Cache session data to prevent state loss on reconnection

### 2. **Error Handling**
- Always verify event origin for security
- Handle missing data gracefully
- Implement fallback values for network issues

### 3. **User Experience**
- Show connection status prominently
- Provide clear billing information
- Enable easy session termination

### 4. **Security**
- Validate all incoming postMessage data
- Sanitize displayed values
- Implement proper CORS policies

## Event Flow Diagram

```
Session Start:
Frontend → WebRTC → user-connected → Backend
                 → session-started → Frontend Navbar

During Session:
WebRTC → timer-update (every 1s) → Frontend Navbar
       → session-heartbeat (every 10s) → Backend

Session End:
WebRTC → user-disconnected → Backend + Frontend Navbar
       → session-ended → Backend + Frontend Navbar
```

This integration allows your frontend to build a complete navbar experience while maintaining separation between the WebRTC component and your main application architecture.