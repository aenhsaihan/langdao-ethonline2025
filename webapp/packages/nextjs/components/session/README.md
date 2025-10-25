# Live Tutoring Session Feature

## Overview

This feature implements a comprehensive live tutoring session management system with real-time updates for both tutors and students. The session navbar displays crucial information during active sessions and automatically handles balance depletion scenarios.

## Features Implemented

### ✅ Session Navbar (`SessionNavbar.tsx`)
A fixed navbar that appears at the top of the page during active sessions showing:

- **Status Indicator**: Color-coded dot (green/yellow/red) showing session health
- **User Role**: Displays whether you're a tutor or student
- **Time Elapsed**: Real-time countdown of session duration
- **Time Remaining**: Calculated based on budget and rate
- **Total Cost**: Live calculation of accumulated charges
- **Current Balance** (Student only): Shows remaining funds
- **Rate Information**: Cost per minute display
- **Top Up Button** (Student only): Quick link to deposit page when balance is low
- **End Session Button**: Confirmation dialog before ending

### ✅ Session Context (`sessionContext.tsx`)
Manages all session state and logic:

- Real-time session statistics calculation
- WebSocket integration for live updates
- Automatic balance monitoring
- Low balance threshold detection (20%)
- Critical balance alert (10%)
- Auto-end session when balance reaches zero
- Session data persistence and synchronization

### ✅ Session Summary (`SessionSummary.tsx`)
Post-session summary modal showing:

- Total session duration
- Total cost/earnings
- Session details (language, participants, rate)
- Rating system (1-5 stars)
- Feedback textarea
- Quick actions (Back to Dashboard, Find Another Tutor)

### ✅ Backend Integration
Socket.IO event handlers in `backend/src/server.js`:

- `session:start` - Initialize a new session
- `session:end` - End an active session
- `session:update-balance` - Real-time balance updates
- `session:balance-update` - Broadcast balance changes
- `session:low-balance-warning` - Alert when balance is low
- `session:ended` - Notify when session terminates

## Color Indicators

### Session Status Colors

- **Green** 🟢: Session healthy, balance sufficient
- **Yellow** 🟡: Low balance warning (< 20% of estimated cost)
- **Red** 🔴: Critical balance (< 10% of estimated cost) with pulsing animation

## Usage

### Starting a Session

```typescript
import { useSession } from '~~/lib/socket/sessionContext';

const { startSession } = useSession();

// Start a new session
startSession({
  sessionId: `session_${Date.now()}`,
  tutorAddress: '0x...',
  studentAddress: '0x...',
  language: 'english',
  ratePerSecond: 0.001,
  startTime: Date.now(),
  estimatedDuration: 1800, // 30 minutes
  studentBalance: 2.0,
  tutorName: 'John Doe',
  studentName: 'Alice Smith',
});
```

### Accessing Session Data

```typescript
const { 
  activeSession,      // Current session data
  sessionStats,       // Calculated stats (time, cost, balance)
  isInSession,        // Boolean flag
  userRole,           // 'tutor' | 'student' | null
  endSession,         // Function to end session
  updateBalance       // Function to update balance
} = useSession();
```

### Session Stats Object

```typescript
interface SessionStats {
  elapsedTime: number;        // seconds elapsed
  timeRemaining: number;      // seconds remaining
  totalCost: number;          // ETH accumulated
  currentBalance: number;     // ETH remaining
  costPerMinute: number;      // ETH per minute
  isLowBalance: boolean;      // < 20% threshold
  isCriticalBalance: boolean; // < 10% threshold or 0
}
```

## Testing

### Test Page
Visit `/session-test` to test the feature:

1. Fill in session parameters (addresses, language, rate, duration, balance)
2. Click "Start Test Session"
3. Observe the session navbar appear at the top
4. Watch real-time updates:
   - Timer counts up
   - Balance drains
   - Cost accumulates
   - Warnings trigger at thresholds
5. Click "End Session" to see the summary modal

### Test Scenarios

#### 1. Normal Session Flow
- Set balance: 2.0 ETH
- Set rate: 0.001 ETH/sec
- Duration: 1800 seconds (30 min)
- Expected: ~1.8 ETH cost, session completes normally

#### 2. Low Balance Warning
- Set balance: 0.4 ETH
- Set rate: 0.001 ETH/sec
- Duration: 1800 seconds
- Expected: Yellow warning appears after ~320 seconds

#### 3. Critical Balance & Auto-End
- Set balance: 0.2 ETH
- Set rate: 0.001 ETH/sec
- Duration: 1800 seconds
- Expected: Red flashing alert, auto-ends at 200 seconds

## Integration Points

### 1. Wallet Integration
- Uses Thirdweb for wallet connection
- Automatically detects user address
- Links to deposit/withdrawal pages

### 2. Socket.IO Integration
- Real-time synchronization between tutor and student
- Server-side validation and persistence
- Automatic reconnection handling

### 3. Smart Contract Integration (Future)
- Can be extended to integrate with LangDAO.sol
- Read actual token balances
- Execute on-chain payments

## File Structure

```
webapp/packages/nextjs/
├── components/
│   └── session/
│       ├── SessionNavbar.tsx      # Main navbar component
│       ├── SessionSummary.tsx     # Post-session summary
│       └── index.ts               # Exports
├── lib/
│   └── socket/
│       ├── sessionContext.tsx     # Session state management
│       └── socketContext.tsx      # WebSocket connection
└── app/
    └── session-test/
        └── page.tsx               # Test/demo page

backend/src/
└── server.js                      # Session socket handlers
```

## Configuration

### Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Backend (.env)
PORT=4000
REDIS_URL=redis://localhost:6379
```

### Thresholds

Adjust in `sessionContext.tsx`:

```typescript
const LOW_BALANCE_THRESHOLD = 0.2;      // 20%
const CRITICAL_BALANCE_THRESHOLD = 0.1; // 10%
```

## Future Enhancements

- [ ] Integrate with LangDAO smart contract for real balance checks
- [ ] Add session history/archive
- [ ] Implement session pause/resume
- [ ] Add video/audio call integration
- [ ] Implement rating blockchain storage
- [ ] Add session recording/replay
- [ ] Multi-currency support
- [ ] Session scheduling/booking
- [ ] Automatic session timeout warnings
- [ ] Tutor rating aggregation

## Troubleshooting

### Navbar Not Appearing
- Check that you're wrapped in `SessionProvider`
- Verify `startSession()` is called with valid data
- Check browser console for errors

### Balance Not Draining
- Verify WebSocket connection is active
- Check Redis is running and accessible
- Ensure session data is properly stored

### Session Auto-Ending Too Early
- Verify `ratePerSecond` is correct (not per minute)
- Check `studentBalance` is sufficient
- Review threshold settings

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for socket events
3. Verify Redis connection
4. Test with `/session-test` page first
