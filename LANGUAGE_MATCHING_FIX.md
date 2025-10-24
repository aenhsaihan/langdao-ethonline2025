# Language Matching Issue & Proper Fix

## Current Problem

There's a mismatch between:
1. **Frontend Socket System**: Uses lowercase language codes (`"english"`, `"spanish"`)
2. **Smart Contract**: Uses numeric language IDs (`1` = Spanish, `2` = French, etc.)
3. **LANGUAGES Constant**: Uses proper case names (`"Spanish"`, `"French"`)

## Current Workaround

The code now uses the **student's selected language** from the frontend, which should match what the tutor offered (since the socket matching system already verified they match).

```typescript
// Uses student's language selection
const languageObj = LANGUAGES.find(l => 
  l.code === language || 
  l.name.toLowerCase() === language.toLowerCase() ||
  l.name === language
);
const languageId = languageObj?.id || 1;
```

## Proper Fix (To Implement Later)

### Option 1: Read Tutor's On-Chain Languages (Recommended)

**When to do this:**
- When you want to ensure the tutor actually registered for the language on-chain
- When you want to support tutors teaching multiple languages

**Implementation:**

1. **In TutorAvailabilityFlow.tsx**, read the tutor's registered languages from the blockchain:

```typescript
// Add these hooks
const { data: tutorInfo } = useScaffoldReadContract({
  contractName: "LangDAO",
  functionName: "getTutorInfo",
  args: [account?.address],
});

// Check which languages the tutor offers (1-10)
const tutorLanguageChecks = LANGUAGES.map(lang => 
  useScaffoldReadContract({
    contractName: "LangDAO",
    functionName: "getTutorLanguage",
    args: [account?.address, BigInt(lang.id)],
  })
);

// Filter to only show languages the tutor registered for
const availableLanguages = LANGUAGES.filter((lang, index) => 
  tutorLanguageChecks[index].data === true
);
```

2. **Only allow tutor to select from their registered languages:**

```typescript
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  {availableLanguages.map((lang) => (
    <button
      key={lang.id}
      onClick={() => setLanguage(lang.code)}
      className={/* ... */}
    >
      <div className="text-2xl mb-1">{lang.flag}</div>
      <div className="text-sm font-medium">{lang.name}</div>
    </button>
  ))}
</div>
```

3. **Send language ID instead of language code to socket:**

```typescript
socket.emit("tutor:set-available", {
  address: account?.address,
  languageId: selectedLanguage.id,  // Send ID instead of code
  language: selectedLanguage.name,   // Also send name for display
  ratePerSecond,
});
```

### Option 2: Standardize Language Codes Everywhere

**When to do this:**
- When you want simpler code
- When you don't need to verify on-chain languages

**Implementation:**

1. **Update LANGUAGES constant** to use lowercase codes consistently:

```typescript
export const LANGUAGES = [
  { id: 1, name: "Spanish", flag: "🇪🇸", code: "spanish" },
  { id: 2, name: "French", flag: "🇫🇷", code: "french" },
  // ... etc
] as const;
```

2. **Update TutorAvailabilityFlow** to use the same codes:

```typescript
const languages = LANGUAGES.map(l => ({
  value: l.code,
  label: l.name,
  flag: l.flag,
  id: l.id
}));
```

3. **Update matching logic** to use language IDs:

```typescript
// In backend matching service
const languageId = LANGUAGES.find(l => l.code === language)?.id || 1;
```

### Option 3: Store Language ID in Socket Data (Best Long-term)

**When to do this:**
- For production
- When you want the most reliable matching

**Implementation:**

1. **Update socket events** to include language ID:

```typescript
// Tutor sets availability
socket.emit("tutor:set-available", {
  address: account?.address,
  languageId: 1,  // Numeric ID from blockchain
  languageName: "Spanish",  // For display
  ratePerSecond,
});

// Student requests tutor
socket.emit("student:request-tutor", {
  requestId,
  studentAddress: account?.address,
  languageId: 1,  // Numeric ID
  languageName: "Spanish",  // For display
  budgetPerSecond,
});
```

2. **Update backend matching** to use language IDs:

```typescript
// In matchingService.js
async function findMatchingTutors({ languageId, budgetPerSecond, studentAddress }) {
  // Match by numeric ID instead of string
  const tutorAddresses = await redisClient.sMembers(`tutors:lang:${languageId}`);
  // ...
}
```

3. **Update StudentTutorFinder** to use the language ID directly:

```typescript
const confirmAndStartSession = async () => {
  // No need to map - use the ID directly from the matched tutor
  const languageId = currentTutor.languageId;
  
  await startSessionWrite({
    functionName: "startSession",
    args: [
      currentTutor.tutorAddress as `0x${string}`, 
      BigInt(languageId),  // Direct from socket data
      CONTRACTS.PYUSD
    ],
  });
};
```

## Testing the Current Workaround

1. **Student selects "Spanish"** → Frontend uses language code "spanish"
2. **Tutor selects "Spanish"** → Frontend uses language code "spanish"
3. **Socket matching** → Matches "spanish" === "spanish" ✅
4. **Student starts session** → Maps "spanish" → ID 1 → Calls `startSession(tutor, 1, token)`
5. **Smart contract checks** → Does tutor offer language ID 1? ✅

## Debug Logs to Check

When testing, check the console for:

```
=== LANGUAGE MAPPING DEBUG ===
currentTutor.language from socket: spanish
Student's selected language: spanish
✅ Using student's selected language: { languageId: 1, languageName: "Spanish", originalLanguage: "spanish" }
============================
```

If you see a different language ID than expected, check:
1. What language the tutor registered with on-chain (in TutorRegistration)
2. What language the tutor selected in TutorAvailabilityFlow
3. What language the student selected in StudentTutorFinder

## Summary

- **Current workaround**: Uses student's selected language (works if socket matching is correct)
- **Proper fix**: Implement Option 3 (store language IDs in socket data)
- **Timeline**: Can implement proper fix after MVP testing
