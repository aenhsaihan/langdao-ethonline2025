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
