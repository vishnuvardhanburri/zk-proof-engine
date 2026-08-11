
# zk-proof-engine

Zero-knowledge proof infrastructure for generating, verifying, registering, and
continuously validating cryptographic proofs for software supply-chain workflows.

Built around **Groth16 / BN254**, canonical proof envelopes, artifact integrity
verification, an on-chain registry, authenticated APIs, developer tooling, and
security-focused CI/CD.

> **Security notice**
>
> This project has **not undergone a formal third-party security audit**.
> Do not interpret the repository's automated security controls as an audit or
> cryptographic certification. Review the [Security Model](#security-model),
> [Threat Model](#threat-model), and [Status & Limitations](#status--limitations)
> before using the system in production.

<p align="center">

[![CI](https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/ci.yml?branch=main&label=CI)](https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/codeql.yml?branch=main&label=CodeQL)](https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/codeql.yml)
[![Gitleaks](https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/secret-scan.yml?branch=main&label=Gitleaks)](https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/secret-scan.yml)
[![OpenSSF Scorecard](https://img.shields.io/github/actions/workflow/status/vishnuvardhanburri/zk-proof-engine/scorecard.yml?branch=main&label=Scorecard)](https://github.com/vishnuvardhanburri/zk-proof-engine/actions/workflows/scorecard.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</p>

---

## Overview

`zk-proof-engine` provides a complete proof lifecycle:

```text
Circuit
   │
   ▼
Witness Generation
   │
   ▼
Groth16 Proof
   │
   ▼
Canonical Proof Envelope
   │
   ├──────────────► Offline Verification
   │
   ├──────────────► Artifact / VK Binding
   │
   ▼
Authenticated API
   │
   ▼
On-Chain Registry
   │
   ▼
Proof Gatekeeper
````

The project also treats the software supply chain as a security boundary:

```text
Source
  │
  ├── Locked dependencies
  ├── CodeQL
  ├── Secret scanning
  ├── Dependency analysis
  ├── Vulnerability scanning
  └── CI validation
          │
          ▼
     Release Artifact
          │
          ├── SBOM
          ├── SLSA Provenance
          ├── Sigstore Signature
          └── SHA-256 Integrity
          │
          ▼
      GitHub Release
```

---

## Architecture

The repository is organized as a monorepo with clearly separated
cryptographic, application, contract, and CI boundaries.

| Component                   | Responsibility                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- |
| `packages/circuit-lib`      | Circuit definitions, generated artifacts, manifests, integrity verification      |
| `packages/engine`           | Witness generation and Groth16 proving / verification                            |
| `packages/proof-format`     | Canonical proof envelope serialization and hashing                               |
| `packages/keys`             | HMAC and Ed25519 signing/key management                                          |
| `packages/api`              | Authenticated REST API, verification, registration, rate limiting, audit logging |
| `packages/cli`              | Developer CLI for proving, verifying, registering, and deployment workflows      |
| `packages/dashboard`        | Monitoring and operational interface                                             |
| `contracts/`                | On-chain registry and proof-gating contracts                                     |
| `.github/actions/zk-verify` | CI proof-validation gate                                                         |

### Design Principles

* Cryptographic verification is performed independently from application logic.
* Proofs are bound to explicit circuit and artifact identities.
* Security-sensitive operations fail closed.
* Release artifacts are independently verifiable.
* CI security controls use least privilege.
* Third-party GitHub Actions are pinned to immutable commits.
* Security claims are documented according to actual evidence.

---

## Proof Lifecycle

```text
zk new
   │
   ▼
Circuit + Inputs
   │
   ▼
Witness Generation
   │
   ▼
Groth16 Proving
   │
   ▼
Proof Envelope
   │
   ├── proofHash
   ├── vkHash
   ├── artifactHash
   ├── circuitId
   └── circuitVersion
   │
   ▼
Offline Verification
   │
   ▼
Authenticated Registration
   │
   ▼
On-Chain Registry
   │
   ▼
Gatekeeper Decision
```

---

## Supported Circuits

| Circuit             | Version | Statement                                        |
| ------------------- | ------: | ------------------------------------------------ |
| `poseidon-preimage` | `1.0.0` | Proves knowledge of a Poseidon preimage          |
| `merkle-inclusion`  | `1.0.0` | Proves knowledge of a leaf and valid Merkle path |

Both circuits use Poseidon as the in-circuit hash function.

---

## Security Model

A valid Groth16 proof establishes that the prover knows a witness `w`
satisfying the circuit relation:

```text
C(x, w) = 1
```

A proof does **not** by itself establish:

* prover identity;
* proof freshness;
* correctness of the circuit design;
* correctness of the trusted setup;
* semantic correctness of application-level public inputs.

### Integrity Bindings

| Binding           | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `vkHash`          | Binds a proof to a canonical verification key        |
| `proofHash`       | Detects modification of the proof envelope           |
| `artifactHash`    | Binds the proof to the expected circuit artifact set |
| `publicInputHash` | Provides deterministic on-chain proof identity       |
| `manifestHash`    | Binds circuit metadata to a canonical manifest       |

These bindings provide defense in depth rather than relying on a single
integrity check.

---

## Threat Model

The system is designed to reject or fail closed against common integrity
and supply-chain threats.

| Threat                     | Primary Control                                       |
| -------------------------- | ----------------------------------------------------- |
| Forged proof               | Groth16 verification                                  |
| Modified proof envelope    | `proofHash` validation                                |
| Wrong verification key     | `vkHash` binding                                      |
| Cross-circuit proof reuse  | Circuit identity binding                              |
| Modified circuit artifacts | Artifact and manifest hashes                          |
| Proof replay               | On-chain identity / deduplication                     |
| Unauthorized API access    | Authentication and authorization                      |
| Request replay             | Nonce / timestamp validation                          |
| Excessive API traffic      | Rate limiting                                         |
| Malicious dependency       | Lockfiles, OSV, Dependabot, Dependency Review         |
| Workflow compromise        | Least-privilege permissions and immutable action pins |
| Secret exposure            | Gitleaks and GitHub secret controls                   |
| Release tampering          | SHA-256, SLSA provenance, Sigstore                    |

---

## Supply-Chain Security

The repository continuously validates the software supply chain.

| Control                              | Status                         |
| ------------------------------------ | ------------------------------ |
| Gitleaks                             | Configured                     |
| CodeQL                               | Configured                     |
| OSV Scanner                          | Configured                     |
| Dependabot                           | Configured                     |
| Dependency Review                    | Configured                     |
| OpenSSF Scorecard                    | Configured                     |
| Immutable GitHub Action pins         | Configured                     |
| Least-privilege workflow permissions | Configured                     |
| SBOM / CycloneDX                     | Configured                     |
| SLSA provenance                      | Configured for tagged releases |
| Sigstore / Cosign                    | Configured for tagged releases |
| CODEOWNERS                           | Configured                     |
| Workflow timeouts                    | Configured                     |

Automated controls provide continuous assurance; they are **not a substitute
for an independent security audit**.

---

## Release Integrity

Tagged releases are accompanied by machine-verifiable supply-chain metadata.

A release can be checked through:

```bash
# Download release artifacts
gh release download v0.1.0 \
  -R vishnuvardhanburri/zk-proof-engine

# Verify artifact digest
sha256sum zk-proof-engine-release.tar.gz

# Verify GitHub build provenance
gh attestation verify zk-proof-engine-release.tar.gz \
  -R vishnuvardhanburri/zk-proof-engine

# Verify Sigstore signature
cosign verify-blob \
  --certificate-identity-regexp \
  "^https://github\.com/vishnuvardhanburri/zk-proof-engine/\.github/workflows/release\.yml@refs/tags/v.*$" \
  --certificate-oidc-issuer \
  "https://token.actions.githubusercontent.com" \
  --signature release.sig \
  zk-proof-engine-release.tar.gz
```

The release identity is restricted to this repository's release workflow and
version-tag execution context.

---

## Proof Verification

### Offline

```bash
zk verify proof.json --offline
```

Offline verification validates the envelope integrity, verification-key
binding, and Groth16 proof.

### On-Chain Registration

```bash
zk register proof.json \
  --idempotency-key "$(uuidgen)"
```

### Query Status

```bash
zk status proof.json
```

### API Verification

```bash
curl -X POST http://localhost:4000/v1/proofs/verify \
  -H "Content-Type: application/json" \
  -H "x-zk-client: <client-id>" \
  -H "x-zk-ts: <timestamp>" \
  -H "x-zk-nonce: <nonce>" \
  -H "x-zk-sig: <hmac-sha256>" \
  -d @proof.json
```

---

## Proof Envelope

The project supports canonical proof envelopes.

### `zk-proof/v1`

Unsigned proof envelope containing:

```text
formatVersion
circuitId
circuitVersion
vkHash
artifactHash
publicInputs
proof
proofHash
proverTimestamp
```

### `zk-proof/v2`

Adds an Ed25519 signature over the canonical envelope representation.

```text
signature
├── algo
├── keyId
└── value
```

Canonical serialization is deterministic so hashes and signatures are stable
across verification environments.

---

## Development

### Requirements

* Node.js 20+
* npm 10+
* Foundry (`forge`, `anvil`) for Solidity development

### Install

```bash
git clone https://github.com/vishnuvardhanburri/zk-proof-engine.git
cd zk-proof-engine

npm ci
npm run build
```

### Validate

```bash
npm run check
npm test
```

### Smart Contracts

```bash
cd contracts

forge test
```

Fuzz and invariant tests:

```bash
forge test \
  --match-path "test/fuzz/*" \
  --match-path "test/invariants/*"
```

### API Development

```bash
npm run dev -w packages/api
```

---

## Testing

Testing is layered across correctness, security, integration, and system
boundaries.

| Test Layer           | Purpose                                   |
| -------------------- | ----------------------------------------- |
| Unit                 | Package-level correctness                 |
| Integration          | Cross-package and CLI behavior            |
| Property / Fuzz      | Boundary and invariant discovery          |
| Smart-contract tests | Registry and gatekeeper behavior          |
| Negative tests       | Invalid proofs and bypass attempts        |
| API security tests   | Authentication, abuse, and validation     |
| E2E                  | Prove → verify → register → on-chain gate |
| Cross-platform CI    | Linux, macOS, Windows                     |
| Supply-chain tests   | Dependencies, secrets, SAST, provenance   |
| Release verification | Artifact, signature, SBOM, provenance     |

Passing automated tests does not constitute a formal security audit.

---

## Configuration

Copy the example configuration:

```bash
cp .env.example .env
```

Typical development settings:

```text
ZK_ENV=dev
ZK_API_URL=http://localhost:4000
ZK_API_KEY=<local-development-key>
ZK_NETWORK=dev
ZK_RPC_URL=http://127.0.0.1:8545
ZK_REGISTRY_ADDRESS=<deployed-address>
ZK_LOG_LEVEL=info
```

**Never commit real credentials, private keys, API keys, or `.env` files.**

---

## CI / CD

The repository validates changes through multiple independent workflows.

```text
Pull Request / Push
        │
        ├── Build / Test
        ├── CodeQL
        ├── Gitleaks
        ├── OSV Scanner
        ├── Dependency Review
        ├── Smart Contract Tests
        ├── Gatekeeper Validation
        └── OpenSSF Scorecard
```

Tagged releases additionally produce:

```text
Release
 ├── Artifact
 ├── SHA-256 digest
 ├── SBOM
 ├── SLSA provenance
 └── Sigstore signature
```

All workflows use explicit permissions and timeout controls.

---

## Security Reporting

Please report vulnerabilities privately through GitHub's security reporting
mechanism.

See [SECURITY.md](SECURITY.md) for the complete disclosure process.

When reporting a vulnerability, include where possible:

* affected component;
* affected version or commit;
* reproduction steps;
* security impact;
* relevant logs or proof-of-concept;
* suggested mitigation, if known.

Do not publicly disclose an exploitable vulnerability before coordinated
disclosure.

---

## Status & Limitations

This project is under active development and should be evaluated according to
its documented evidence and limitations.

### Security Audit

No formal third-party security audit has been performed.

### Trusted Setup

Development builds use the project's development PTau configuration.
A production deployment requires an appropriate trusted setup ceremony.

### Maintainer Model

The repository currently has a single maintainer:

**Vishnu Vardhan Burri — [@vishnuvardhanburri](https://github.com/vishnuvardhanburri)**

No additional maintainers or review teams are represented as existing where
they do not exist.

### OpenSSF

OpenSSF Scorecard is integrated into CI.

OpenSSF Best Practices registration is a separate external assessment and
should only be represented as complete after the repository has actually been
registered and assessed.

### Multi-Tenant Deployment

The repository contains server-side tenant-related infrastructure, but a
production deployment requiring strict tenant isolation should undergo
additional isolation, authorization, concurrency, and data-leakage validation
before being considered hardened for hostile multi-tenant workloads.

### Binary Artifacts

Some cryptographic circuit artifacts are required for the proof-generation
workflow. Their integrity is validated through artifact and manifest hashes.

---

## Roadmap

Planned work is intentionally separated from current capabilities.

* [ ] Independent third-party security audit
* [ ] OpenSSF Best Practices registration
* [ ] Production trusted setup ceremony
* [ ] Continued dependency modernization
* [ ] Additional circuit families
* [ ] Production multi-tenant isolation hardening
* [ ] Continued adversarial and failure-injection testing

---

## Maintainer

**Vishnu Vardhan Burri**

GitHub: [@vishnuvardhanburri](https://github.com/vishnuvardhanburri)

---

## License

MIT License. See [LICENSE](LICENSE).

```
