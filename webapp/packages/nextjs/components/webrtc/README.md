# WebRTC Session End Integration

This directory contains components and hooks for handling WebRTC session end events and prompting users to complete blockchain transactions.

## Overview

When a WebRTC session ends (either by user action, disconnection, or timeout), the system needs to:

1. **Detect the session end event** from the WebRTC server
2. **Prompt the user** to send a wallet transaction to end the session on the blockchain
3. **Complete the payment** to the tutor through the smart contract
4. **Clean up session state** both locally and on the backend

## Components

### `useWebRTCSession` Hook

- **Purpose**: Manages WebRTC session state and handles session end events
- **Features**:
  - Listens for WebRTC session events via socket.io
  - Tracks session duration
  - Manages session end prompts
  - Handles blockchain transactions for ending sessions
  - Cleans up session state

### `WebRTCSessionEndPrompt` Component

- **Purpose**: Modal prompt that appears when a session ends
- **Features**:
  - Shows session details (duration, participants, session ID)
  - Explains why payment is required
  - Provides "End Session & Pay" button to trigger blockchain transaction
  - Shows loading state during transaction

### `WebRTCSessionStatus` Component

- **Purpose**: Persistent status indicator for active WebRTC sessions
- **Features**:
  - Fixed position status bar showing session info
  - Real-time duration counter
  - Manual "End Session" button
  - Visual indicators for session state (active/ended)

### `WebRTCSessionProvider` Component

- **Purpose**: Global provider that renders session status and prompts
- **Features**:
  - Should be placed high in the component tree
  - Automatically shows session status when sessions are active
  - Handles global session state management

### `WebRTCSessionTest` Component

- **Purpose**: Testing component for debugging WebRTC session functionality
- **Features**:
  - Create mock WebRTC sessions
  - Simulate different end scenarios (user end, disconnect, timeout)
  - Test blockchain transaction flow
  - Available on the debug page

## Event Flow

### 1. Session Start

```typescript
// Session data stored in sessionStorage when session begins
sessionStorage.setItem('pendingSession', JSON.stringify({
  requestId: 'session_123',
  tutorAddress: '0x...',
  studentAddress: '0x...',
  languageId: 1,
}));

// Hook initializes session from storage
useWebRTCSession(); // Detects pending session and starts tracking
```

### 2. Session End Events

The hook listens for these socket events:

```typescript
// User manually ended the call
on('webrtc:session-ended', (data) => {
  // Shows end session prompt
  setShowEndSessionPrompt(true);
});

// User disconnected (connection lost)
on('webrtc:user-disconnected', (data) => {
  // Shows warning and prompt after grace period
  if (data.reason === 'connection-lost') {
    setShowEndSessionPrompt(true);
  }
});

// Heartbeat timeout (session stale)
on('webrtc:heartbeat-timeout', (data) => {
  // Shows timeout warning and prompt
  setShowEndSessionPrompt(true);
});
```

### 3. Blockchain Transaction

When user clicks "End Session & Pay":

```typescript
const endSession = async () => {
  // Call smart contract
  const tx = await endSessionWrite({
    functionName: "endSession",
    args: [tutorAddress],
  });

  // Notify backend of completion
  await fetch('/api/webrtc-session-ended', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      userAddress,
      transactionHash: tx,
    }),
  });

  // Clean up local state
  setCurrentSession(null);
  sessionStorage.removeItem('pendingSession');
};
```

## Backend Integration

### WebRTC Events Endpoint

- **Route**: `POST /api/webrtc-events`
- **Purpose**: Receives events from WebRTC server
- **Events**: `session-ended`, `user-disconnected`, `session-heartbeat`

### Session End Confirmation

- **Route**: `POST /api/webrtc-session-ended`
- **Purpose**: Called when frontend completes blockchain transaction
- **Action**: Cleans up session mapping and confirms completion

### Socket Events Emitted

```javascript
// Session ended by user or system
io.emit('webrtc:session-ended', {
  sessionId,
  tutorAddress,
  studentAddress,
  endedBy,
  reason
});

// User disconnected
io.emit('webrtc:user-disconnected', {
  sessionId,
  disconnectedUser,
  reason
});

// Heartbeat timeout
io.emit('webrtc:heartbeat-timeout', {
  sessionId,
  lastHeartbeat,
  timeoutDuration
});
```

## Usage

### 1. Add to App Layout

```tsx
// In your main app layout
import { WebRTCSessionProvider } from '~~/components/webrtc/WebRTCSessionProvider';

export default function Layout({ children }) {
  return (
    <SocketProvider>
      <WebRTCSessionProvider>
        {children}
      </WebRTCSessionProvider>
    </SocketProvider>
  );
}
```

### 2. Use in Components

```tsx
import { useWebRTCSession } from '~~/hooks/useWebRTCSession';

function MyComponent() {
  const { currentSession, isSessionActive, endSession, sessionDuration } = useWebRTCSession();

  // Component automatically handles session end prompts
  // Manual end session button:
  return (
    <button onClick={endSession} disabled={!currentSession}>
      End Session
    </button>
  );
}
```

### 3. Testing

Visit `/debug` page and use the WebRTC Session Test component to:

- Create mock sessions
- Simulate different end scenarios
- Test the complete flow from session end to blockchain transaction

## Configuration

### Environment Variables

```bash
# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Backend
RPC_URL=http://localhost:8545
BACKEND_PRIVATE_KEY=0x...
REDIS_URL=redis://localhost:6379
```

### Smart Contract

The system calls the `endSession(address tutor)` function on the LangDAO contract to:

- Calculate payment based on session duration
- Transfer payment from student to tutor
- Update session state to inactive
- Emit session end events

## Error Handling

### Common Issues

1. **Session not found**: Session mapping may have expired or been cleaned up
2. **Transaction failed**: Insufficient funds or contract revert
3. **Backend unreachable**: Network issues or backend down
4. **Socket disconnected**: Automatic reconnection should handle this

### Graceful Degradation

- If backend notification fails, transaction still completes
- If socket events are missed, manual end session button is always available
- Session state is persisted in sessionStorage across page refreshes
- Heartbeat timeout provides fallback for stale sessions

## Security Considerations

1. **Session validation**: Backend verifies session exists before processing
2. **User authorization**: Only session participants can end sessions
3. **Rate limiting**: API endpoints have rate limiting protection
4. **Transaction verification**: Backend can verify blockchain transactions
5. **Grace periods**: 30-second grace period prevents accidental ends from brief disconnects

## Future Enhancements

1. **Session history**: Store completed sessions for analytics
2. **Partial payments**: Handle sessions that end before minimum duration
3. **Dispute resolution**: Allow users to dispute session charges
4. **Automatic reconnection**: Handle temporary network issues gracefully
5. **Session recording**: Integrate with session recording for quality assurance