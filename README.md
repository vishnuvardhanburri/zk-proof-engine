# zk-proof-engine

Zero-knowledge proof generation, verification, and on-chain registry system for software supply-chain integrity, built on Groth16/BN254.

> **⚠️ Security Notice**: This project handles cryptographic proofs and verification keys. It has **not** undergone a formal third-party security audit. Review the [Security Model](#security-model), [Threat Model](#threat-model), and [Limitations](#status--limitations) sections before use. Report vulnerabilities via [SECURITY.md](SECURITY.md).

<p align="center">
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/ci.yml?branch=main&label=CI&style=flat-square" alt="CI"></a>
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/codeql.yml"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/codeql.yml?branch=main&label=CodeQL&style=flat-square" alt="CodeQL"></a>
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/secret-scan.yml"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/secret-scan.yml?branch=main&label=Gitleaks&style=flat-square" alt="Gitleaks"></a>
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/scorecard.yml"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/scorecard.yml?branch=main&label=Scorecard&style=flat-square" alt="OpenSSF Scorecard"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Proving_System-Groth16_/_BN254-purple?style=flat-square" alt="Groth16/BN254">
</p>

---

## Security Status

| Category | Status | Detail |
|---|---|---|
| **Formal Security Audit** | ❌ Not performed | No third-party audit has been conducted |
| **CodeQL SAST** | ✅ Configured | Runs on every push and PR; weekly scheduled scan |
| **Secret Scanning** | ✅ Configured | Gitleaks full-history scan on every commit |
| **Dependency Review** | ✅ Configured | PR-level vulnerability and license check |
| **OSV Vulnerability Scan** | ✅ Configured | Weekly + push/PR scanning |
| **OpenSSF Scorecard** | ✅ Configured | Weekly automated assessment |
| **SLSA Provenance** | ✅ Configured | Generated via `actions/attest-build-provenance` on tagged releases |
| **Cosign Signing** | ✅ Configured | Keyless OIDC signing via Sigstore on tagged releases |
| **SBOM** | ✅ Configured | CycloneDX generated per release |
| **OpenSSF Best Practices** | ⬚ Not registered | External registration required (see [Limitations](#status--limitations)) |
| **Branch Protection** | ⬚ Requires GitHub UI | See [GitHub UI Actions Required](#github-ui-actions-required) |
| **Foundry Fuzz Testing** | ✅ Active | Property-based + invariant tests for smart contracts |

---

## What This Project Does

The ZK Proof Engine is a monorepo containing:

1. **Circom Circuits** — Poseidon preimage and Merkle inclusion circuits compiled to R1CS + WASM witness calculators
2. **Groth16 Prover/Verifier** (`@zkpe/engine`) — Wraps snarkjs for witness generation, proof creation, and local verification
3. **Proof Envelope** (`@zkpe/proof-format`) — Canonical `zk-proof/v1` and `zk-proof/v2` (signed) envelope format with deterministic hashing
4. **On-Chain Registry** (`contracts/`) — `ZKVerifierRegistry.sol` append-only Solidity ledger + `ProofGatekeeper.sol` dApp access control
5. **REST API** (`@zkpe/api`) — Fastify server for proof verification, registration, and audit logging with HMAC authentication
6. **Developer CLI** (`@zkpe/cli`) — `zk` command for scaffolding, proving, verifying, deploying, and registering proofs
7. **CI/CD Gatekeeper** (`.github/actions/zk-verify`) — GitHub Actions composite action that gates PRs on proof validity
8. **Dashboard** (`@zkpe/dashboard`) — React + Vite monitoring UI

---

## Architecture

### Proof Lifecycle

```
Developer
 │
 ├─ zk new <circuit> .         ← scaffold project
 ├─ zk prove <circuit> inputs  ← generate witness + Groth16 proof
 │       │
 │       ▼
 │  ┌──────────────────┐
 │  │ @zkpe/engine      │   Witness calc (WASM) → snarkjs.groth16.fullProve
 │  └────────┬─────────┘
 │           ▼
 │  ┌──────────────────┐
 │  │ Proof Envelope    │   zk-proof/v1 — canonical JSON, proofHash, vkHash
 │  │ (@zkpe/proof-fmt) │   Optional: Ed25519 signature (v2)
 │  └────────┬─────────┘
 │           │
 ├─ zk verify proof.json       ← local offline verification
 ├─ zk register proof.json     ← submit to API → on-chain registry
 │           │
 │           ▼
 │  ┌──────────────────┐   ┌──────────────────┐
 │  │ @zkpe/api         │──▶│ ZKVerifierRegistry│  Solidity append-only ledger
 │  │ (Fastify REST)    │   │ (on-chain EVM)    │  ProofGatekeeper for dApps
 │  └──────────────────┘   └──────────────────┘
 │
 └─ CI: .github/actions/zk-verify  ← PR gatekeeper (pull_request_target)
```

### Supply-Chain Pipeline

```
Source Code
 │
 ├─ npm ci (lockfile-pinned)
 ├─ npm run build (turbo)
 │
 ▼
Artifact (zk-proof-engine-release.tar.gz)
 │
 ├─ CycloneDX SBOM (sbom.json)
 ├─ SLSA Build Provenance (provenance.intoto.jsonl)
 │     └─ via actions/attest-build-provenance
 ├─ Cosign Signature (release.sig, sbom.sig)
 │     └─ keyless OIDC via Sigstore
 │
 ▼
GitHub Release (tagged v*)
```

### Trust Boundaries

| Boundary | Trust Assumption |
|---|---|
| Circom circuits | Constraint system correctly encodes the intended relation |
| snarkjs | Groth16 proving/verification is cryptographically sound |
| Trusted setup (PTau) | Powers of tau ceremony is honest (dev: Hermez 16-point; prod: requires ceremony) |
| Verification key | vk is authentic and matches the compiled circuit |
| On-chain registry | EVM execution is correct; contract is immutable once deployed |
| CI environment | GitHub Actions runners are not compromised |
| Release signing | Sigstore OIDC identity is authentic |

---

## Security Model

### What a Proof Attests To

A valid Groth16 proof for circuit `C` with public inputs `x` attests that:

> The prover knows a private witness `w` such that `C(x, w) = 1`

For the shipped circuits:

- **poseidon-preimage**: The prover knows `preimage[0], preimage[1]` such that `Poseidon(preimage[0], preimage[1]) = digest` (where `digest` is a public output)
- **merkle-inclusion**: The prover knows `leaf, siblings[4], pathBits[4]` such that computing the Merkle path yields the public `root`

### What a Proof Does NOT Attest To

- The prover's identity
- The freshness of the proof (use `proverTimestamp` + on-chain `provedAt` + `maxAge` for expiry)
- The correctness of the circuit design itself
- The security of the trusted setup ceremony
- That the public inputs are meaningful in any application context

### Key Bindings

| Field | Binding |
|---|---|
| `vkHash` | `keccak256(canonical verification key)` — binds proof to exact circuit compilation |
| `proofHash` | `keccak256(canonical envelope minus proofHash)` — tamper-evident envelope digest |
| `artifactHash` | `sha256(r1cs ‖ wasm ‖ zkey ‖ vk)` — binds proof to exact artifact bundle |
| `publicInputHash` | On-chain: `keccak256(abi.encodePacked(circuitId, publicInputs))` — dedup key |
| `manifestHash` | `keccak256(canonical manifest JSON)` — content-addressed circuit declaration |

---

## Threat Model

| Threat | Mitigation |
|---|---|
| **Malicious prover** submits forged proof | Groth16 verification rejects invalid proofs; on-chain verifier contracts enforce BN254 pairing checks |
| **Tampered proof envelope** | `proofHash` is recomputed and compared; any field modification invalidates the hash |
| **Wrong verification key** | `vkHash` binds the proof to a specific vk; gatekeeper enforces allow-listed `vkHash` values |
| **Wrong circuit version** | `circuitId` + `circuitVersion` in envelope; manifest `manifestHash` binds the exact artifact set |
| **Tampered artifact** (R1CS/WASM/zkey) | `artifactHash` in envelope + manifest SHA-256 hashes for each artifact file |
| **Proof replay** | On-chain registry deduplicates by `(circuitId, publicInputHash)`; replays are no-ops |
| **Cross-context proof reuse** | `circuitId` scoping prevents using a poseidon proof as a merkle proof |
| **Malicious dependency** | npm lockfile pinning, Dependabot, OSV Scanner, Dependency Review on PRs |
| **Compromised CI** | `pull_request_target` gatekeeper checks out base branch (not PR head); explicit `permissions` blocks; SHA-pinned actions |
| **Workflow modification** | CODEOWNERS requires maintainer approval for `.github/` changes |
| **Credential exposure** | Gitleaks full-history scan; no secrets in workflow outputs; `id-token` scoped to release job only |
| **Unauthorized registry write** | API requires HMAC authentication; rate limiting; nonce replay protection |

---

## Security Boundaries

| Component | Trusted For | Not Trusted For |
|---|---|---|
| `@zkpe/engine` | Correct invocation of snarkjs prove/verify | Cryptographic soundness (delegated to snarkjs/Groth16) |
| `@zkpe/proof-format` | Canonical serialization, hash computation | Application-level semantics of proof fields |
| `@zkpe/circuit-lib` | Artifact integrity (SHA-256 manifests), circuit definitions | Circuit correctness (requires formal verification) |
| `@zkpe/keys` | HMAC signing, Ed25519 envelope signatures, keyring 0600 permissions | Key distribution, certificate authority |
| `@zkpe/api` | Authentication, authorization, rate limiting, audit logging | Availability guarantees (single-instance) |
| `@zkpe/cli` | Developer workflow orchestration | User input validation beyond schema checks |
| `contracts/` | On-chain proof status, replay prevention, access gating | Gas optimization, upgrade governance |
| `.github/actions/zk-verify` | PR-level proof validation against base branch artifacts | Protection against GitHub platform compromise |
| Release pipeline | SLSA provenance, Cosign signatures, SBOM generation | Trusted setup ceremony |

---

## Supported Circuits

| Circuit ID | Version | Public Inputs | Private Witness | Attestation |
|---|---|---|---|---|
| `poseidon-preimage` | `1.0.0` | *(none — digest is output)* | `preimage: field[2]` | Prover knows the Poseidon preimage |
| `merkle-inclusion` | `1.0.0` | `root: field[1]` | `leaf: field[1]`, `siblings: field[4]`, `pathBits: u1[4]` | Prover knows a leaf in the Merkle tree |

Both circuits use Poseidon as the in-circuit hash function. Constraint budgets: poseidon-preimage ~240, merkle-inclusion ~974 (max 65536).

---

## Proof Envelope Format

### `zk-proof/v1` (Unsigned)

```json
{
  "formatVersion": 1,
  "circuitId": "poseidon-preimage",
  "circuitVersion": "1.0.0",
  "vkHash": "0x<keccak256 of canonical vk>",
  "artifactHash": "<sha256 of artifact bundle>",
  "publicInputs": ["<field element>", ...],
  "proof": {
    "pi_a": ["<Fr>", "<Fr>", "1"],
    "pi_b": [["<Fr>", "<Fr>"], ["<Fr>", "<Fr>"], ["1", "0"]],
    "pi_c": ["<Fr>", "<Fr>", "1"]
  },
  "proofHash": "0x<keccak256 of canonical envelope minus proofHash>",
  "proverTimestamp": 1234567890
}
```

### `zk-proof/v2` (Signed)

Adds an `signature` section with Ed25519 over the canonical envelope bytes:

```json
{
  "formatVersion": 2,
  "...": "same as v1",
  "signature": {
    "algo": "ed25519",
    "keyId": "<sha256 thumbprint of public key>",
    "value": "<hex-encoded 64-byte Ed25519 signature>"
  }
}
```

**Canonicalization**: Fields are serialized in a deterministic order defined by `@zkpe/proof-format`. `proofHash` is computed over the canonical JSON of all fields except `proofHash` itself. The signature (v2) covers `proofHash`, creating mutual binding.

---

## Verification

### Offline (Local)

```bash
# Verify a proof envelope against the local circuit artifacts
zk verify proof.json --offline
```

This loads the verification key from the local artifact directory, recomputes `proofHash`, validates `vkHash`, and runs `snarkjs.groth16.verify`.

### On-Chain

```bash
# Register a verified proof on the EVM registry
zk register proof.json --idempotency-key "$(uuidgen)"

# Query proof status
zk status proof.json
```

The on-chain registry stores `(circuitId, publicInputHash) → (status, provedAt)`. Status transitions: `None → Proved`. Proved status is permanent. Expiry is enforced at query time via `requireProved(circuitId, publicInputHash, maxAge)`.

### API

```bash
# Verify via REST API
curl -X POST http://localhost:4000/v1/proofs/verify \
  -H "Content-Type: application/json" \
  -H "x-zk-client: <clientId>" \
  -H "x-zk-ts: <timestamp>" \
  -H "x-zk-nonce: <nonce>" \
  -H "x-zk-sig: <hmac-sha256>" \
  -d @proof.json
```

---

## Artifact Integrity

Circuit artifacts are committed to the repository under `packages/circuit-lib/build/`:

| Artifact | Purpose | Integrity |
|---|---|---|
| `<circuit>.r1cs` | Rank-1 Constraint System | SHA-256 in circuit manifest |
| `<circuit>_js/<circuit>.wasm` | Witness calculator (WASM) | SHA-256 in circuit manifest |
| `<circuit>.zkey` | Proving key (Groth16) | SHA-256 in circuit manifest |
| Verification key | Embedded in zkey; extracted at runtime | `vkHash` = keccak256 of canonical vk JSON |

These are **deterministic dev-build outputs** from `scripts/build-circuits.mjs` using a development PTau file. The manifest (`@zkpe/circuit-lib`) certifies their content hashes. The gatekeeper validates `artifactHash` against the base branch manifest.

> **Note on binary artifacts**: Scorecard's Binary-Artifacts check penalizes committed `.wasm`, `.r1cs`, and `.zkey` files. These are **required cryptographic artifacts** — the WASM witness calculator, constraint system, and proving key are necessary for proof generation. They are not arbitrary binaries. Their integrity is verified via SHA-256 manifest hashes.

---

## Supply-Chain Security Controls

| Control | Status | Detail |
|---|---|---|
| **Gitleaks** | ✅ Configured | Full-history secret scan on every push and PR |
| **CodeQL** | ✅ Configured | `javascript-typescript` analysis; weekly + push/PR |
| **OSV Scanner** | ✅ Configured | Vulnerability scanning; weekly + push/PR |
| **Dependency Review** | ✅ Configured | PR-level dependency diff analysis |
| **OpenSSF Scorecard** | ✅ Configured | Automated assessment; weekly + push |
| **Dependabot** | ✅ Configured | npm + github-actions ecosystems; weekly |
| **Immutable Action Pins** | ✅ Verified | 100% of third-party Actions use SHA-256 commit pins |
| **Token Permissions** | ✅ Verified | All workflows declare explicit least-privilege `permissions` |
| **Workflow Timeouts** | ✅ Verified | All jobs have `timeout-minutes` |
| **CODEOWNERS** | ✅ Configured | Security-sensitive paths require maintainer review |
| **SBOM** | ✅ Configured | CycloneDX JSON generated per release |
| **SLSA Provenance** | ✅ Configured | `actions/attest-build-provenance` on tagged releases |
| **Cosign/Sigstore** | ✅ Configured | Keyless OIDC signing of release artifacts |
| **pip Hash Locking** | ✅ Configured | `.github/requirements.txt` with cryptographic hashes for Slither dependencies |

---

## Release Verification

To verify a release artifact:

```bash
# 1. Download release assets
gh release download v0.1.0 -R vishnuvardhanburri/zk-proof-engine

# 2. Verify SHA-256
sha256sum zk-proof-engine-release.tar.gz

# 3. Verify SLSA provenance
gh attestation verify zk-proof-engine-release.tar.gz \
  -R vishnuvardhanburri/zk-proof-engine

# 4. Verify Cosign signature
cosign verify-blob \
  --certificate-identity-regexp "^https://github\\.com/vishnuvardhanburri/zk-proof-engine/\\.github/workflows/release\\.yml@refs/tags/v.*$" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --signature release.sig \
  zk-proof-engine-release.tar.gz

# 5. Verify SBOM signature
cosign verify-blob \
  --certificate-identity-regexp "^https://github\\.com/vishnuvardhanburri/zk-proof-engine/\\.github/workflows/release\\.yml@refs/tags/v.*$" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --signature sbom.sig \
  sbom.json
```

The `--certificate-identity-regexp` restricts trust to artifacts built by this repository's release workflow, triggered by a version tag.

---

## Development

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0
- **Foundry** (for smart contract development): `forge`, `anvil`

### Setup

```bash
git clone https://github.com/vishnuvardhanburri/zk-proof-engine.git
cd zk-proof-engine
npm ci
npm run build
```

### Commands

```bash
# Full validation: lint + typecheck + tests
npm run check

# Run tests only
npm test

# Run smart contract tests
cd contracts && forge test

# Run smart contract fuzz/invariant tests
cd contracts && forge test --match-path "test/fuzz/*" --match-path "test/invariants/*"

# Start API server (development)
npm run dev -w packages/api

# CLI
npx zk --help
```

---

## Workspace Packages

| Package | Version | Description |
|---|---|---|
| [`@zkpe/proof-format`](packages/proof-format) | `0.2.0` | Proof envelope schema, canonical serialization, hash computation |
| [`@zkpe/circuit-lib`](packages/circuit-lib) | `0.2.0` | Circuit definitions, artifact manifests, integrity verification |
| [`@zkpe/engine`](packages/engine) | `0.2.0` | Groth16 prover, verifier, witness calculator |
| [`@zkpe/keys`](packages/keys) | `0.1.0` | HMAC signing, Ed25519 envelope signatures, keyring management |
| [`@zkpe/api`](packages/api) | `0.2.0` | Fastify REST API with auth, rate limiting, audit logging |
| [`@zkpe/cli`](packages/cli) | `0.1.0` | Developer CLI (`zk`) |
| [`@zkpe/dashboard`](packages/dashboard) | `0.1.0` | React monitoring dashboard |
| [`contracts/`](contracts) | — | Solidity: `ZKVerifierRegistry`, `ProofGatekeeper`, BN254 verifiers |

---

## Testing

| Category | Location | Framework |
|---|---|---|
| Unit tests | `packages/*/test/` | Vitest |
| Integration tests | `packages/cli/test/integration.test.ts` | Vitest + subprocess |
| E2E (Anvil) | CI: `ci.yml` e2e-anvil job | Forge + CLI against local chain |
| Smart contract unit | `contracts/test/` | Forge |
| **Fuzz testing** | `contracts/test/fuzz/RegistryFuzz.t.sol` | Forge fuzz (property-based) |
| **Invariant testing** | `contracts/test/invariants/RegistryInvariants.t.sol` | Forge invariant |
| Production validation | `packages/cli/test/production-validation.test.ts` | Vitest (28 tests) |
| Security (API) | `packages/api/test/security.test.ts` | Vitest (60 tests) |
| Gatekeeper negative | `packages/cli/test/gatekeeper.test.ts` | Vitest (16 tests) |

> **Scorecard detection note**: Scorecard's Fuzzing check looks for OSS-Fuzz or ClusterFuzzLite integration. This project uses Foundry's built-in fuzz and invariant testing for smart contracts, which Scorecard does not currently detect. This is a detection limitation, not a testing gap.

---

## CI Pipeline

Every push to `main` and every PR triggers:

| Workflow | What It Does |
|---|---|
| `ci.yml` | Lint, typecheck, build, test (Ubuntu + macOS + Windows), E2E with Anvil |
| `codeql.yml` | CodeQL static analysis (javascript-typescript) |
| `secret-scan.yml` | Gitleaks full-history secret detection |
| `osv-scanner.yml` | OSV vulnerability scanning |
| `dependency-review.yml` | PR dependency diff analysis (PRs only) |
| `contracts.yml` | Forge build, test, gas report, Slither analysis |
| `gatekeeper.yml` | ZK proof envelope validation on PRs |
| `scorecard.yml` | OpenSSF Scorecard assessment |

All workflows use SHA-pinned actions, explicit `permissions` blocks, and `timeout-minutes`.

---

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
ZK_ENV=dev                    # dev | prod
ZK_API_URL=http://localhost:4000
ZK_API_KEY=<your-api-key>     # HMAC key for API authentication
ZK_NETWORK=dev                # dev | mainnet | sepolia
ZK_RPC_URL=http://127.0.0.1:8545
ZK_PRIVATE_KEY=<deployer-key> # Only for contract deployment
ZK_REGISTRY_ADDRESS=<address> # Deployed registry contract
ZK_LOG_LEVEL=info             # debug | info | warn | error
```

**Never commit `.env` files.** The `.gitignore` excludes them.

---

## Security Reporting

Report vulnerabilities via GitHub Private Vulnerability Reporting:

1. Go to [Security → Report a vulnerability](https://github.com/vishnuvardhanburri/zk-proof-engine/security)
2. Provide reproduction details, affected component, and impact assessment

See [SECURITY.md](SECURITY.md) for the full disclosure policy, response timeline, and accepted risk documentation.

---

## Status / Limitations

### Honest Assessment

- **Single maintainer**: This project is maintained solely by [@vishnuvardhanburri](https://github.com/vishnuvardhanburri). There is no independent code review team. Scorecard's Code-Review check reflects this organizational reality.
- **No formal security audit**: No third-party audit has been performed on the cryptographic implementation, smart contracts, or API. Use accordingly.
- **Trusted setup**: Development builds use Hermez Phase 1 PTau (16 points). Production deployment requires a proper trusted setup ceremony. The current PTau is **not suitable for production**.
- **OpenSSF Best Practices**: The project has not been registered on the [OpenSSF Best Practices](https://www.bestpractices.dev/) platform. Self-assessment documentation exists in `docs/security/openssf-best-practices.md`.
- **Scorecard detection gaps**: Foundry fuzz/invariant testing is not detected by Scorecard's Fuzzing check. Binary circuit artifacts (WASM, R1CS, zkey) are penalized by Binary-Artifacts despite being necessary cryptographic outputs.
- **Accepted dependency risks**: `ethers@5.8.0`, `snarkjs@0.7.6`, and `@opentelemetry/core@1.x` have known advisories with no available upgrades that maintain compatibility. See SECURITY.md for full risk documentation.
- **Multi-tenant isolation**: Server-side tenant identity propagation is implemented but not yet production-hardened for full data isolation. See `docs/architecture/multi-tenancy.md`.

### GitHub UI Actions Required

To maximize Scorecard score, the repository owner must enable in **GitHub Settings → Branches → Branch protection rules** for `main`:

- [x] Require pull request reviews before merging (1 reviewer)
- [x] Require status checks to pass (CI `quality`, `supply-chain`, `e2e-anvil`)
- [x] Block force pushes
- [x] Block branch deletion

These settings cannot be configured via code — they require the GitHub web UI.

---

## Roadmap

Items listed here are planned work, not current capabilities:

- [ ] Formal third-party security audit
- [ ] OpenSSF Best Practices badge registration
- [ ] Production trusted setup ceremony
- [ ] ethers v5 → v6 migration
- [ ] Additional circuit library (range proofs, set membership)
- [ ] Multi-tenant data isolation hardening

---

## Maintainer

**Vishnu Vardhan Burri**
GitHub: [@vishnuvardhanburri](https://github.com/vishnuvardhanburri)

---

## License

[MIT](LICENSE)
