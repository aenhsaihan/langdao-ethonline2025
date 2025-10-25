# USD Display Implementation

## Overview
All rate and budget inputs now display in USD (via PYUSD which is 1:1 with USD). The conversion to wei happens automatically before sending to the smart contract.

## User Flow

### Students
1. Enter budget in **USD per hour** (e.g., $10.00/hr)
2. See real-time conversion to:
   - USD per hour (e.g., $10.00/hr)
   - USD per second (e.g., $0.002778/sec)
3. On submit: Frontend converts to wei per second before calling `registerStudent()`

### Tutors
1. Enter rate in **USD per hour** (e.g., $15.00/hr)
2. See real-time conversion to:
   - USD per hour (e.g., $15.00/hr)
   - USD per second (e.g., $0.004167/sec)
3. On submit: Frontend converts to wei per second before calling `registerTutor()`

## Conversion Logic

```typescript
// User enters: $10.00 per hour
const hourlyRate = 10.00;

// Convert to per-second rate
const ratePerSecond = hourlyRate / 3600; // 0.002777... PYUSD/sec

// Convert to wei (18 decimals) for smart contract
const rateInWei = Math.floor(ratePerSecond * 1e18); // 2777777777777777 wei

// Smart contract receives: BigInt(2777777777777777)
```

## Components Updated

### Registration Components
- ✅ `StudentRegistration.tsx` - Shows USD/hr input with USD/sec preview
- ✅ `TutorRegistration.tsx` - Shows USD/hr input with USD/sec preview

### Session Components
- ✅ `StudentTutorFinder.tsx` - Shows budget and tutor rates in USD
- ✅ `TutorAvailabilityFlow.tsx` - Shows rate in USD with earnings preview

### Demo/Testing Components
- ✅ `QuickActions.tsx` - Shows rates in USD
- ✅ `SocketDemo.tsx` - Shows rates in USD

## Display Format

All USD amounts are displayed using the `pyusdToUsdFormatted()` helper:
- Hourly rates: `$10.00/hr` (2 decimals)
- Per-second rates: `$0.002778/sec` (6 decimals for precision)
- Earnings preview: `$10.00`, `$240.00`, `$7,200.00` (2 decimals)

## Smart Contract Integration

The smart contract stores rates in **wei per second**:
- 1 PYUSD = 1e18 wei
- Rate stored: `2777777777777777` wei/sec
- Equivalent to: $10.00/hr or $0.002778/sec

When sessions end, payments are calculated:
```solidity
uint256 duration = block.timestamp - session.startTime;
uint256 payment = duration * session.ratePerSecond; // in wei
```

## Benefits

1. **User-friendly**: Users think in USD per hour, not wei per second
2. **Accurate**: 6 decimal precision for per-second rates
3. **Transparent**: Real-time conversion preview before submission
4. **Consistent**: All components use the same conversion logic
5. **Safe**: Wei conversion happens client-side before blockchain interaction
