# Architecture (High-Level)

## Diagram

```
 Learner / Contributor (Wallet)
                │
                ▼
        Frontend (Next.js / React)
                │
     ┌──────────┼───────────────────────────────┐
     │          │                               │
     ▼          ▼                               ▼
 Wallet      Huddle01 SDK                Credential Mint
 Connect     (Live Sessions)             (POAP or minimal ERC-721)
 (wagmi/viem)   │                               │
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
