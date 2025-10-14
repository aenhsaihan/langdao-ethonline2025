# langdao-ethonline2025

🌎 Empowering people worldwide to use their language skills to learn, teach, and earn in Web3

# LangDAO

> Helping people worldwide use their **language skills** to **teach and earn crypto** in Web3.

## TL;DR (60 seconds)

- **What:** A community platform where Spanish (and any language) speakers teach/guide learners and **earn crypto**.
- **Why now:** Web3 adoption needs human onboarding; language is the missing bridge.
- **First testbed:** **Latin America**, scalable globally.
- **Status:** Pre-code; validating with mentors, defining MVP, lining up integrations (Huddle01, POAP).

## Problem

Millions have skills but no clear path to earn in Web3. Learning is scattered, incentives are weak, and language access is uneven.

## Solution

- **Live sessions (Huddle01)** + **token-gated rooms** via wallet.
- **Proof of participation/skill** via **POAP/credentials**.
- **Micro-bounties** for teaching, vetting, or guiding onboarding.

## MVP Scope (Hackathon)

- Join with wallet → book/join a session → complete language session → **get paid**.
- Start with **Spanish**; design to be language-agnostic.

## Architecture (high-level)

- Frontend: Next.js + wagmi/viem, WalletConnect.
- Video: **Huddle01** for decentralized sessions.
- Credentials: POAP (or lightweight credential NFT/SBT).
- Payments: Superfluid, Sablier or custom solution
- Backend: minimal (serverless or none) for scheduling/metadata.

## Roadmap (milestones)

- **M1 (Hackathon):** clickable prototype + live session flow + POAP mint.
- **M2 (Post-hack):** mentor-validated tokenomics + pilot program in LatAm.
- **M3:** multi-language expansion, contributor reputation.

## Ask (Mentors & Collaborators)

- **Validation:** problem/solution fit, incentives.
- **Biz viability:** revenue & sustainability.
- **Launch strategy:** partnerships, community seeding (LatAm).

## Links

- Onboarding video notes: `docs/product/overview.md`
- Tech integrations: `docs/tech/integrations.md`
- Testbed rationale: `docs/product/testbed-latam.md`

License: MIT
