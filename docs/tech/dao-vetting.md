# DAO Vetting Flow (Tutor Credential SBT)

**Purpose**: community governance verifies tutors and issues a **non-transferable SBT** that unlocks credential-gated rooms.

## A) Governance sequence (from application to SBT mint)

```mermaid
sequenceDiagram
  autonumber
  participant Tutor as Tutor
  participant dApp as LangDAO dApp
  participant Intake as DAO Intake API
  participant IPFS as IPFS (evidence bundle)
  participant Snapshot as Snapshot (off-chain vote)
  participant Multisig as DAO Multisig
  participant SBT as SBT Contract (non-transferable)

  Tutor->>dApp: Apply for credential (proofs, ratings, links)
  dApp->>Intake: submitApplication(payload)
  Intake->>IPFS: pin evidence bundle (JSON)
  IPFS-->>Intake: cid
  Intake-->>dApp: applicationId + cid

  Intake->>Snapshot: create proposal {title, cid, applicant}
  Snapshot-->>Community: voting window (e.g., 3–5 days)

  alt Quorum met & majority YES
    Snapshot-->>Multisig: proposal approved (payload: applicant, cid)
    Multisig->>SBT: mint(applicant, tokenURI=cid)
    SBT-->>Tutor: Credential SBT minted ✅
  else Rejected / No quorum
    Snapshot-->>dApp: status=Rejected (option: resubmit with fixes)
    dApp-->>Tutor: feedback + next steps
  end
```

### Notes

- **Evidence bundle**: CV, language certs, prior ratings (CIDs), sample sessions.
- **Snapshot**: transparent voting; proposal links to CID for reviewers.
- **Multisig**: executes mint after approval (clear separation of “signal” vs “execution”).
- **SBT tokenURI**: points to IPFS metadata (credential type, issuedAt, issuer).

## B) Credential lifecycle (state machine)

```mermaid
stateDiagram-v2
  [*] --> Uncredentialed

  Uncredentialed --> VideoInterview: Submit application
  VideoInterview --> PendingReview
  PendingReview --> Approved: Vote passes + SBT minted
  PendingReview --> Rejected: Vote fails / No quorum

  Approved --> Active: Auto
  Active --> RevocationProposed: Misconduct/appeal opened
  RevocationProposed --> Revoked: Vote passes -> burn SBT
  RevocationProposed --> Active: Vote fails / Dismissed

  Rejected --> Uncredentialed: Reapply after changes
  Revoked --> Uncredentialed: Reapply after cooldown (policy)
```

### Policy hooks

- **Cooldown** after rejection/revocation (e.g., 30–90 days).
- **Appeals** = new proposal referencing prior decision CID.
- **Granular credentials**: multiple SBT “tracks” (e.g., Spanish A2, Conversation Coach, Advanced Grammar) issued independently.

## C) How rooms enforce credentials

- Room configs include required **credential(s)** (SBT contract + tokenId range or trait).
- Join flow checks `SBT.balanceOf(user) > 0` (or `hasTrait(user, "Spanish-A2")`).
- Fallback: allow **observer** role without SBT (no paid host privileges).

## D) Minimal SBT contract (properties)

- **Non-transferable** (override `transferFrom/safeTransferFrom` to revert).
- **Mint** only by **DAO Multisig**.
- **Burn** only by **Multisig** (revocation) or **owner+Multisig** (appeal outcome).
- **tokenURI** = IPFS metadata; consider an **Attestation** layer later (EAS).
