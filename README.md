# ZK Proof Engine

A production-grade zero-knowledge proof system spanning circuits, an on-chain registry,
a verification API, a developer CLI, a CI gatekeeper, and a dashboard.

Status: **Milestones 0–8 complete.** M9 (dashboard) is implemented in the
working tree (release-preparation commit pending). M10–M12 not started. See
`docs/` for the full architecture package, `CHANGELOG.md` for milestone
history, and `docs/09-proof-specification.md` for exactly what a proof
attests to (and what it explicitly does **not** prove).

## Components

Zero-Knowledge Proof Engine · Witness Generator · Proof Verifier · Smart Contracts ·
Blockchain Registry · Backend API · Developer CLI · GitHub Action · CI/CD Gatekeeper ·
Dashboard · Documentation · End-to-End Tests

## Quick start (development)

```bash
npm ci
npm run check     # lint + typecheck + tests (Turbo pipeline)
```

## Repository layout

```
packages/
├── proof-format/   # versioned proof envelope + manifest types, hashing (M0)
├── circuit-lib/    # circom circuits (M1)
├── engine/         # ZK Proof Engine, witness generator, verifier (M1–M3)
├── contracts/      # Solidity verifier + registry (M4)
├── api/            # Fastify backend (M5)
├── cli/            # developer CLI (M6)
└── dashboard/      # React dashboard (M9)
.github/workflows/  # CI + secret scan (M0), GitHub Action + gatekeeper (M7–M8)
docs/               # audit, architecture, ADRs, roadmap
archive/legacy/     # quarantine path for non-final scaffolding
```

## Developer CLI (`@zkpe/cli`)

The CLI is published as `@zkpe/cli` and installed as a standalone binary (`zk`).
It requires a built zk engine and contracts, so install from the monorepo or
from the locally packed tarballs:

```bash
npm ci
npm run build
npm run fresh-install --workspace @zkpe/cli   # packs + installs into a scratch project
```

Once installed, the golden path is:

```bash
zk env set dev      # point at your API (REDACTED secrets, never printed)
zk new poseidon-preimage .   # scaffold a project (writes inputs.json)
zk prove poseidon-preimage inputs.json --out proof.json
zk verify proof.json --offline     # local verification, no API needed
zk register proof.json --idempotency-key "$(uuidgen)"
zk status proof.json               # on-chain status via API
zk registry                        # registry info via API
zk completions bash                 # shell completion (bash/zsh/fish)
```

Notable behaviors:

- Exit codes: `0` success, `1` runtime error, `2` usage error (bad flags).
- `--json` for machine-readable output; `--env` to switch API profiles.
- Secrets (API tokens) are stored redacted and rendered as `<redacted>`.
- `--offline` never touches the network; online verification verifies the
  envelope locally first, then asks the API (which also verifies on-chain).
- `zk deploy --rpc-url <url>` deploys the verifier + registry contracts via a
  Foundry script.

## Project Documentation

- [01 Repository Audit](docs/01-repository-audit.md)
- [02 Architecture Review](docs/02-architecture-review.md)
- [03 Technical Debt Report](docs/03-technical-debt-report.md)
- [04 Security Review](docs/04-security-review.md)
- [05 Missing Components](docs/05-missing-components.md)
- [06 Dependency Graph](docs/06-dependency-graph.md)
- [07 Milestone Roadmap](docs/07-milestone-roadmap.md)
- [08 Proving Systems Comparison](docs/08-proving-systems-comparison.md)
- [09 Proof Specification](docs/09-proof-specification.md)
- [10 Circuit Interface Design](docs/10-circuit-interface-design.md)
- [11 Performance Targets](docs/11-performance-targets.md)
- [12 Cryptographic Design Review](docs/12-crypto-design-review.md)
- ADRs: [docs/adr/](docs/adr/) (0001–0012)
- [CI/CD Gatekeeper](docs/19-gatekeeper.md) (M7–M8)
- [21 Trusted-Setup Plan](docs/21-trusted-setup-plan.md) (DEBT-1, prod ceremony)

## Status

- [x] Phase 0 — Repository Audit & Architecture Review (approved with revisions)
- [x] Proving systems comparison · proof specification · VCI · performance targets
- [x] Cryptographic Design Review (Part A freeze, ADR-0008)
- [x] Milestone 0 — Foundations (monorepo, proof-format, CI)
- [x] Milestone 1 — Proof engine (v1 circuits `poseidon-preimage` +
  `merkle-inclusion`, hashes, artifact manifest)
- [x] Milestone 2 — Witness generator · Milestone 3 — Verifier
- [x] Milestone 4 — Smart contracts + registry (ADR-0010)
- [x] Milestone 5 — Backend API (ADR-0011)
- [x] Milestone 6 — Developer CLI (M6, incl. `artifactHash` binding)
- [x] Milestone 7–8 — CI/CD gatekeeper + security review (ADR-0012)
  - gate: signed envelope + certified vkHash + artifact binding +
    trusted-key signature (secret) + on-chain enforcement; `pull_request_target`
    trust boundary; 14 negative tests + on-chain e2e (registered pass,
    expired/revoked/unregistered block)
  - registry v2: `revokeProof` (permanent tombstone) + `ProofRevoked`
- [~] Milestone 9 — Dashboard (implemented, uncommitted; see docs/20)
- [ ] Milestone 10 .. 12 (docs CI, e2e nightly, release)
