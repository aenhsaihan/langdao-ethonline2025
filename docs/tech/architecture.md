# Architecture (MVP)

This MVP lets a **Tutor** go online with a per-minute/per-second rate, and a **Student**:

- match via **roulette** or booking
- pay **only for time in call**
- get auto **call cutoff** when balance ends or either side disconnects
- receive **POAP/credential** (optional)
- rate the tutor and track progress

We minimize contracts to what’s essential for **time-billed calls** and **auto-stop**.

---

## High-level Components

```mermaid
flowchart TD
  subgraph CLIENT [Client]
    A[Student dApp - Next.js]
    B[Tutor dApp - Next.js]
    WC[Wallet Connect]
  end

  subgraph REALTIME [Realtime Layer]
    H[Huddle01 SDK - WebRTC Rooms]
  end

  subgraph BACKEND [Backend Minimal]
    M[Matchmaker API - roulette and booking]
    HB[Heartbeat Service - 5s ping]
    REL[Relayer - stops sessions]
  end

  subgraph ONCHAIN [On-chain Components]
    ESC[Session Escrow - prefund start stop settle]
    PAY[Time Accrual - per second calc]
    CRED[Credentials - POAP or SBT]
    RAT[Ratings - on chain or IPFS]
  end

  A -->|wallet auth| WC
  B -->|wallet auth| WC
  A --> M
  B --> M
  M --> H
  A -->|join or leave| HB
  B -->|join or leave| HB
  HB -->|disconnect or low balance stop| REL
  REL -->|tx| ESC
  A -->|funds approve| ESC
  ESC --> PAY
  H -->|live call| A
  H -->|live call| B
  A -->|completion| CRED
  A -->|rating| RAT
  B -->|rating| RAT
```

## Key ideas

- **ESC** (Escrow) holds student funds for a **max duration**, prevents overpaying.
- **PAY** tracks elapsed time; settlement uses block timestamps (or a stream primitive).
- **HB** (Heartbeat) + **Huddle01** events trigger **REL** to stop payment if either peer drops.
- **M** pairs roulette or handles booked calls.
- **CRED** issues POAP/SBT; **RAT** stores ratings (on-chain or IPFS with on-chain hash).

## Component 1: Session Escrow (time-billed calls)

**Goal**: pay the tutor only for time in call; auto-stop on cap/disconnect.

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> Funded: deposit(cap, rate)<br>(by Student)
  Funded --> Active: startSession()<br>(both joined)

  Active --> Stopping: cap reached<br>(or Student ends)
  Active --> Stopping: disconnect detected<br>(heartbeat/webRTC)
  Active --> Stopping: tutor ends

  Stopping --> Settled: settle owed = min(elapsed, cap) * rate
  Settled --> Refunded: refund remainder (cap - elapsed)*rate
  Refunded --> Closed
```

### What this component does (and only this)

- **deposit(cap, rate)**: Student pre-funds max spend → moves to **Funded**.
- **startSession()**: Called once both are in the room → moves to **Active**.
- **elapsed accounting**: measured inside contract (block timestamps) or a “meter” submodule.
- **stop triggers:**
  - **cap reached,**
  - **disconnect** (from heartbeat/webRTC signal relayed on-chain),
  - **either party ends.**
- **settle()**: pay tutor **min(elapsed, cap) × rate**, refund remainder to student.
- **no overpaying, no post-drop leakage** by construction.

#### Caveats

What if the user wishes to keep the current session running longer than his deposit allows? Could be a UX bug.

## Component 2: Heartbeat & Auto-Stop

**Purpose**: guarantee that if either peer drops from a Huddle01 call, billing halts instantly.

### Concept

Each participant’s client emits a signed “I’m still here” ping every N seconds to a lightweight service.
If either side fails to send two consecutive heartbeats (≈ 10 s of silence), the service calls the on-chain `stopSession()` via a relayer.

```mermaid
sequenceDiagram
  autonumber
  participant StudentClient as Student Client
  participant TutorClient as Tutor Client
  participant HeartbeatAPI as Heartbeat Service
  participant Relayer as Relayer Bot
  participant Escrow as Escrow Contract

  loop Every 5 s
    StudentClient->>HeartbeatAPI: POST /ping {sessionId, sig}
    TutorClient->>HeartbeatAPI: POST /ping {sessionId, sig}
  end

  Note over HeartbeatAPI: tracks lastPing[student], lastPing[tutor]

  HeartbeatAPI->>HeartbeatAPI: detect missing ping > 10 s
  alt peer missing
    HeartbeatAPI->>Relayer: emit "disconnect" event
    Relayer->>Escrow: stopSession(sessionId)
    Escrow-->>Relayer: session settled ✅
  end
```

### Behavior Summary

| Event                     | Trigger                 | Action                               |
| :------------------------ | :---------------------- | :----------------------------------- |
| ✅ Normal pings           | both clients responding | nothing changes                      |
| ⚠️ One peer silent > 10 s | network loss/closed tab | Heartbeat → Relayer → stopSession()  |
| Stop Acknowledgement      | Escrow settles          | tutor payout + student refund issued |

### Implementation notes

- Ping = small JSON {sessionId, walletAddr, signature}.
- Verification = HMAC / signature ensures no spoofing.
- Relayer = can be Biconomy, Gelato, OZ Defender or simple script with funded key.
- Timeout tunable (5 s, 10 s, 15 s).
- Logs feed optional analytics (“average disconnect time”).

## Component 3A — Matchmaker (Roulette “find tutor now”)

**Purpose**: pair a student with an available, matching tutor quickly, confirm the rate/cap, and hand off to escrow → call.

### Assumptions

- Student specifies **filters**: language, level, **max rate**, credential (optional SBT).
- Tutor sets **availability** + **per-second/minute rate** and optional credentials.
- We pre-check **student balance/cap** before proposing.

```mermaid
sequenceDiagram
  autonumber
  participant Student as Student dApp
  participant MM as Matchmaker API
  participant Tutor as Tutor dApp
  participant Wallet as Wallet/Balance
  participant Escrow as Escrow Contract
  participant Huddle as Huddle01

  Student->>Wallet: read balance / max spend cap
  Student->>MM: findNow({lang, level, maxRate, credReq, cap})
  MM->>MM: filter tutors: online ∧ rate<=maxRate ∧ cred ok
  alt no tutors
    MM-->>Student: none available → suggest booking/waitlist
    Note over Student,MM: END (no match)
  else candidates exist
    MM->>Tutor: proposal({rate, estCap, filters}) (30s ttl)
    alt tutor accepts
      Tutor-->>MM: accept
      MM->>Huddle: create room token (ephemeral)
      MM-->>Student: matchFound({tutor, rate, roomToken, cap})
      Student->>Escrow: deposit(cap), startSessionIntent(rate,tutor)
      alt deposit OK
        Escrow-->>Student: sessionId
        Student->>Huddle: join(roomToken)
        Tutor->>Huddle: join(roomToken)
        Note over Student,Tutor: handoff to Heartbeat + Escrow component
      else deposit fails / too low
        Escrow-->>Student: insufficient funds
        MM-->>Student: retry / reduce cap
      end
    else tutor times out / declines
      Tutor-->>MM: decline/timeout
      MM->>MM: try next candidate (max N attempts)
      MM-->>Student: (optional) still matching… spinner
    end
  end
```

### Behavior

- **Filter** → **Propose** → **Accept** loop with **short TTL** to keep UX snappy.
- **Balance & cap pre-check** avoids proposing rates the student can’t afford.
- **Rate lock** at acceptance (for the session intent), so no last-second changes.
- On **accept**, we **create room**, then require **escrow deposit** before join.
- If **escrow fails**, offer **retry** or **reduce cap**; the tutor can be auto-released.

### Edge cases & timeouts

- No tutors → offer **booking** or **waitlist ping**.
- Tutor non-response → **retry next** (max N attempts, e.g., 3).
- Race conditions (two students propose same tutor): first **valid accept** wins; others get retry.

## Component 3B — Matchmaker (Booking Flow)

**Purpose**: let students **book tutors in advance**, ensure **both confirm**, and automatically trigger the **escrow + call** flow at the appointment time.

```mermaid
sequenceDiagram
  autonumber
  participant Student as Student dApp
  participant MM as Matchmaker API
  participant Tutor as Tutor dApp
  participant Cal as Calendar / Scheduler
  participant Escrow as Escrow Contract
  participant Huddle as Huddle01
  participant Notif as Notification Service

  Student->>MM: requestBooking({tutorId, dateTime, duration, rateCap})
  MM->>Tutor: proposeSlot({dateTime, duration, rateCap})
  alt tutor accepts
    Tutor-->>MM: accept
    MM->>Cal: createEvent({student, tutor, time, duration})
    Cal-->>MM: eventId
    MM->>Notif: sendConfirmation(emails/push to both)
    Notif-->>Student: booking confirmed
    Notif-->>Tutor: booking confirmed
  else tutor declines
    Tutor-->>MM: decline
    MM-->>Student: suggest new slot / other tutors
    Note over MM: END (no booking)
  end

  %% Day-of-Session automation
  Notif->>Student: reminder T-30 min
  Notif->>Tutor: reminder T-30 min
  Cal->>MM: trigger start window (T-5 min)

  MM->>Huddle: createRoomToken(eventId)
  MM->>Escrow: preAuthSession({student,tutor,rate,durationCap})
  Escrow-->>MM: sessionIntent ok
  MM-->>Student: joinLink + depositPrompt
  Student->>Escrow: deposit(cap)
  Student->>Huddle: join(roomToken)
  Tutor->>Huddle: join(roomToken)

  Note over Huddle: handoff → Heartbeat & Escrow components
```

### Behavior Summary

| Phase         | Who                  | Action                                     |
| :------------ | :------------------- | :----------------------------------------- |
| Proposal      | Student -> Tutor     | request slot (date, duration, rateCap)     |
| Confirmation  | Tutor                | accept/decline → calendar entry            |
| Reminders     | Notification service | 30 min & 5 min pre-session                 |
| Pre-fund      | Student              | deposits cap before start                  |
| Session Start | System               | opens Huddle room + Escrow intent          |
| Live Call     | Both                 | proceeds under Heartbeat + Auto-Stop rules |

### Key Properties

- **Double opt-in**: prevents ghost bookings.
- **Pre-authorization**: ensures funds exist before the room opens.
- **Automation**: Cal/Notif triggers prevent manual coordination.
- **Handoff**: identical to roulette after join → no duplicate logic.

## Component 4 — Credentials & Ratings

**Purpose**: after every session, issue a verifiable proof of participation and update both participants’ reputations.
for vetted tutors, issue a **Soul-Bound Token (SBT)** to unlock credential-gated rooms.

```mermaid
sequenceDiagram
  autonumber
  participant Student as Student dApp
  participant Tutor as Tutor dApp
  participant ESC as Escrow Contract
  participant POAP as POAP API / Mint Contract
  participant DAO as Vetting DAO / SBT Issuer
  participant IPFS as Ratings Storage

  ESC-->>Student: sessionSettled(eventId)
  Student->>POAP: mintPOAP(eventId, sig)
  POAP-->>Student: tokenId (POAP NFT)
  Note over Student,POAP: proof of session = credential #1

  Student->>IPFS: uploadRating({tutorId, score, text})
  IPFS-->>Student: cid
  Student->>ESC: recordRatingHash(cid)
  ESC-->>Tutor: reputationUpdate(cid)

  alt DAO vetting process
    Tutor->>DAO: applyForCredential({proofs, ratings})
    DAO-->>Tutor: verify + mint SBT
    Tutor->>SBT: hold soul-bound credential
  end
```

### Credential Types

| Type                   | Purpose                          | Who mints                      | Transferable | Example                            |
| :--------------------- | :------------------------------- | :----------------------------- | :----------: | :--------------------------------- |
| POAP                   | Proof of attendance / completion | automatic API                  |      ✅      | Student finishes a lesson          |
| SBT (Tutor Credential) | DAO-vetted qualification         | DAO governance                 |      ❌      | “Certified Spanish native speaker” |
| Rating Record          | Session feedback                 | student → IPFS + hash on-chain |     n/a      | 5 stars, comment                   |

### Logic Highlights

- **Automatic POAP**: triggered by sessionSettled; minimal friction.
- **Reputation anchor**: each rating = IPFS CID + hash on-chain → verifiable, append-only.
- DAO vetting: a DAO multisig reviews proofs/ratings → issues an SBT NFT.
- Access control: smart-contract rooms or filters check balanceOf(SBT) > 0.

## Component 5 — DAO Vetting Flow (Tutor Credential SBT)

- [DAO Vetting Flow](dao-vetting.md)

# Architecture (High-Level)

## Diagram

```

Learner / Contributor (Wallet)
│
▼
Frontend (Next.js / React)
│
┌──────────┼───────────────────────────────┐
│ │ │
▼ ▼ ▼
Wallet Huddle01 SDK Credential Mint
Connect (Live Sessions) (POAP or minimal ERC-721)
(wagmi/viem) │ │
└───────────► Completion Signal │
│
▼
Reward Reminder / Claim payment(testnet)

```

## Components

- **Frontend:** Next.js + wagmi/viem for wallet connect.
- **Video:** **Huddle01** for low-latency, wallet-aware live sessions (optionally token-gated).
- **Credentials:** **POAP** (or minimal ERC-721) as proof of completion/participation.
- **Payment:** Streaming payment should be terminated upon session completion
- **Serverless (optional for MVP):** simple scheduling/metadata endpoints if needed.

## Primary Flows

1. **Join & Learn**
   - Connect wallet → view schedule → join live Huddle01 session.
2. **Verify & Credential**
   - Host marks completion → participant mints POAP/credential.
3. **Reward (MVP)**
   - Display mock reward, tutor should receive payment

## Notes & Constraints

- **MVP:** minimize backend; prefer client-side + third-party SDKs.
- **Abuse prevention (post-MVP):** host attestation, time-in-session checks, or allowlist for early pilots.
- **Scalability:** start single language (Spanish), design flows to be language-agnostic.

## Future Integrations (Post-Hackathon)

- **Chainlink**: attestations / automation for scheduled tasks.
- **Reputation**: simple on-chain badges → aggregated contributor profile.
- **Storage**: IPFS/Arweave for session metadata or recordings if needed.

```

```
