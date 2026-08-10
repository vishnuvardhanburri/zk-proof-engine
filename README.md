# ZK Proof Engine

<p align="center">
  <strong>Production-Grade Zero-Knowledge Proof System & Software Supply-Chain Security Framework</strong>
</p>

<p align="center">
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/ci.yml?branch=main&label=CI&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/contracts.yml?branch=main&label=Contracts%20CI&style=flat-square" alt="Contracts CI Status"></a>
  <a href="https://github.com/vishnuvardhanburri/zk-proof-engine/actions"><img src="https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/secret-scan.yml?branch=main&label=Secret%20Scan&style=flat-square" alt="Secret Scan Status"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-Policy-blue?style=flat-square" alt="Security Policy"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Proving%20System-Groth16%20%2F%20BN254-purple?style=flat-square" alt="Proving System">
</p>

---

## 💡 Overview

**ZK Proof Engine** is an end-to-end zero-knowledge proof platform spanning Circom circuits, Groth16 witness/proof generation, on-chain EVM registries, a Fastify backend REST API, a developer CLI (`zk`), an automated CI/CD gatekeeper, and a real-time monitoring dashboard.

Designed for high-assurance software supply chains, the engine allows developers to prove computational integrity (such as Poseidon preimages and Merkle tree membership) off-chain, record proof statuses on EVM smart contracts, and enforce zero-knowledge gates directly within CI/CD pipelines and dApp smart contracts.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────┐
                               │  Circom 2.x Circuits    │
                               │  (poseidon / merkle)    │
                               └───────────┬─────────────┘
                                           │
                                           ▼
  ┌───────────────────────┐    ┌─────────────────────────┐    ┌───────────────────────┐
  │   Developer CLI (zk)  │───►│  Prover & Engine (@zkpe)│───►│   Proof Envelope      │
  │   scaffold/prove/verify│    │  Witness Calc / Groth16 │    │   (zk-proof/v1 schema)│
  └───────────────────────┘    └─────────────────────────┘    └───────────┬───────────┘
              │                                                           │
              ▼                                                           ▼
  ┌───────────────────────┐                                   ┌───────────────────────┐
  │  Fastify REST API     │◄─────────────────────────────────►│   ZKVerifierRegistry  │
  │  Verify / Register    │                                   │   (On-Chain EVM V2)   │
  └───────────┬───────────┘                                   └───────────┬───────────┘
              │                                                           │
              ▼                                                           ▼
  ┌───────────────────────┐                                   ┌───────────────────────┐
  │   React Dashboard     │                                   │   ProofGatekeeper     │
  │   Real-Time Monitor   │                                   │   dApp Access Control │
  └───────────────────────┘                                   └───────────────────────┘
```

---

## ✨ Key Features

- **⚡ Fast-Path Witness Generation**: Integrated C++/WASM witness calculator (`circom_witnesscalc`) for low-latency proof synthesis.
- **📜 Canonical Proof Envelope (`zk-proof/v1`)**: Versioned schema with deterministic SHA-256 canonical payload hashing and verification key (`vkHash`) binding.
- **🔐 On-Chain Proof Registry (`ZKVerifierRegistry.sol`)**: Append-only Solidity ledger tracking proof statuses (`PROVED`, `EXPIRED`, `REVOKED`), preventing replay attacks via cryptographic `proofHash` indexing.
- **🚫 Permanent Revocation (`revokeProof`)**: On-chain tombstoning mechanism enabling immediate invalidation of compromised proof vectors.
- **🛡️ CI/CD Gatekeeper (`zk-verify`)**: GitHub Actions composite gate verifying proof envelope signatures, certified `vkHash` allow-lists, and artifact hash bindings within a secure `pull_request_target` trust boundary.
- **💻 Developer CLI (`zk`)**: Command-line tool supporting project scaffolding, proving, local offline verification, on-chain registration, and contract deployment.
- **📊 Real-Time Dashboard**: React + Vite UI providing live analytics for registered proofs, circuit health, and gatekeeper CI reports.

---

## 📦 Workspace Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| [`@zkpe/proof-format`](packages/proof-format) | `0.2.0` | `zk-proof/v1` envelope schema, canonical field serialization, and hash calculation. |
| [`@zkpe/circuit-lib`](packages/circuit-lib) | `0.2.0` | Certified Circom circuits (`poseidon-preimage`, `merkle-inclusion`) and artifact manifests. |
| [`@zkpe/engine`](packages/engine) | `0.2.0` | Prover, verifier, witness calculator wrapper, and canonical anchoring logic. |
| [`@zkpe/keys`](packages/keys) | `0.1.0` | Keyring management, HMAC request signing, and Ed25519 envelope signature verification. |
| [`@zkpe/api`](packages/api) | `0.2.0` | Fastify REST API server for proof verification, registration, rate limiting, and audit logging. |
| [`@zkpe/cli`](packages/cli) | `0.1.0` | Command-line interface (`zk`) for developers and automated environments. |
| [`@zkpe/dashboard`](packages/dashboard) | `0.1.0` | React web dashboard for proof browsing, circuit metrics, and CI report inspection. |
| [`contracts/`](contracts) | `0.1.0` | Solidity smart contracts (`ZKVerifierRegistry`, `ProofGatekeeper`, BN254 Groth16 Verifiers). |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **Foundry** (for Solidity contracts & testing): `forge >= 0.2.0`

### Installation & Build
```bash
# Clone the repository
git clone https://github.com/vishnuvardhanburri/zk-proof-engine.git
cd zk-proof-engine

# Install workspace dependencies
npm ci

# Build all packages and generate dev PTau keys
npm run build
```

### Running Validation Suite
```bash
# Full health check: lint + typecheck + unit/integration tests
npm run check

# Execute Solidity Foundry smart contract test suite
cd contracts && forge test
```

---

## 🛠️ Developer CLI (`zk`)

The CLI is packaged under `@zkpe/cli` and binary `zk`.

### Standard Workflow

```bash
# 1. Configure target environment profile
zk env set dev

# 2. Scaffold a new project (writes default inputs.json)
zk new poseidon-preimage .

# 3. Generate zero-knowledge proof
zk prove poseidon-preimage inputs.json --out proof.json

# 4. Verify proof locally (offline execution)
zk verify proof.json --offline

# 5. Register proof on-chain via API
zk register proof.json --idempotency-key "$(uuidgen)"

# 6. Query on-chain status
zk status proof.json

# 7. Generate shell autocompletion
zk completions zsh > ~/.zsh/completion/_zk
```

---

## 🔒 Security & Supply-Chain Controls

This repository enforces **Layer 1 — GitHub Security Foundation** controls:

- **Gitleaks Secret Gate**: Automated full-history secret detection on every commit and PR.
- **CodeQL Static Analysis**: Continuous security analysis targeting `javascript-typescript`.
- **Dependency Supply-Chain Review**: Automated PR dependency vulnerability inspection and license verification.
- **Strict Least-Privilege**: All workflows enforce explicit `permissions: contents: read`.
- **Immutable Action Pinning**: 100% of third-party GitHub Actions are pinned to immutable 40-character commit SHAs.
- **CODEOWNERS Protection**: Critical repository paths are protected under explicit code ownership.

For vulnerability reporting procedures, see [`SECURITY.md`](SECURITY.md) and [`docs/security/github-security.md`](docs/security/github-security.md).

---

## 📚 Technical Documentation Index

Detailed architectural specs, security reviews, and ADRs are available in [`docs/`](docs):

- **Architecture**:
  - [02 Architecture Review](docs/02-architecture-review.md)
  - [06 Dependency Graph](docs/06-dependency-graph.md)
  - [09 Proof Specification](docs/09-proof-specification.md)
  - [13 Engine Architecture Design](docs/13-engine-design.md)
  - [19 CI/CD Gatekeeper Design](docs/19-gatekeeper.md)
- **Security & Cryptography**:
  - [04 Security Review](docs/04-security-review.md)
  - [12 Cryptographic Design Review](docs/12-crypto-design-review.md)
  - [16 Smart Contracts Security Analysis](docs/16-contracts-security-analysis.md)
  - [GitHub Security Matrix](docs/security/github-security.md)
- **Architectural Decision Records (ADRs)**:
  - [ADR-0001: Monorepo & Toolchain](docs/adr/0001-monorepo-and-toolchain.md)
  - [ADR-0008: Cryptographic Parameters Freeze](docs/adr/0008-crypto-parameters-freeze.md)
  - [ADR-0010: Contract Upgrades & Pause Schema](docs/adr/0010-contract-upgrades-pause-schema.md)
  - [ADR-0011: Backend API Request Signing](docs/adr/0011-backend-api-request-signing.md)
  - [ADR-0012: Gatekeeper Trust & Artifact Binding](docs/adr/0012-gatekeeper-trust-and-artifact-binding.md)

---

## 👤 Maintainer

**Vishnu Vardhan Burri**  
GitHub: [@vishnuvardhanburri](https://github.com/vishnuvardhanburri)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
