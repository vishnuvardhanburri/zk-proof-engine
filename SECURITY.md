# Security Policy

## Maintainer & Scope

The `zk-proof-engine` project is maintained by a sole maintainer:

- **Maintainer**: Vishnu Vardhan Burri ([@vishnuvardhanburri](https://github.com/vishnuvardhanburri))

---

## Supported Versions

Only the latest release tag and the active `main` branch receive security updates:

| Version / Ref | Supported          | Security Scope |
| :--- | :--- | :--- |
| `main` | :white_check_mark: Yes | All components (Circuits, Engine, Contracts, API, CLI, Gatekeeper) |
| Latest tag (`v0.8.x` / `v1.0.0`) | :white_check_mark: Yes | Core cryptographic engine, registry contracts, & proof formats |
| Older commits / tags | :x: No | Unsupported |

---

## Vulnerability Reporting

If you discover a potential security vulnerability within `zk-proof-engine`, please submit a private report rather than opening a public issue or discussion.

### Primary Channel: GitHub Private Vulnerability Reporting
1. Navigate to the repository's **Security** tab on GitHub: [`https://github.com/vishnuvardhanburri/zk-proof-engine/security`](https://github.com/vishnuvardhanburri/zk-proof-engine/security).
2. Click **Report a vulnerability** (if enabled by GitHub repository settings).
3. Fill out the report with full reproduction details.

### Secondary Channel: Maintainer Direct Contact
If Private Vulnerability Reporting is unavailable, open a direct security inquiry with maintainer **[@vishnuvardhanburri](https://github.com/vishnuvardhanburri)** on GitHub.

---

## Responsible Disclosure & Response Process

1. **Acknowledgement**: The maintainer ([@vishnuvardhanburri](https://github.com/vishnuvardhanburri)) will acknowledge receipt of reports within **48 hours**.
2. **Triage & Reproduction**: The maintainer will validate the vulnerability and assess severity within **5 business days**.
3. **Fix & Release**: For confirmed high or critical vulnerabilities, a patch will be developed and released within **14 days**.
4. **Public Disclosure**: A public security advisory will be published after a fix has been tagged and merged into `main`.

---

## Reporting Guidelines

To help us assess and resolve issues quickly, please include the following details in your report:

1. **Target Commit SHA**: The exact commit SHA or release tag where the issue was observed.
2. **Affected Component**: Specify the package or contract (`packages/engine`, `packages/proof-format`, `contracts/src/ZKVerifierRegistry.sol`, `packages/api`, `packages/cli`, or `.github/actions/zk-verify`).
3. **Severity & Impact Assessment**: Description of potential impact (e.g., proof forgery, constraint under-specification, contract drain, state corruption, or bypass of CI Gatekeeper).
4. **Attack Scenario**: Step-by-step description of how an attacker could exploit the vulnerability.
5. **Reproduction Vector**: Minimal reproducible example (proof vector, input JSON, or unit test snippet).

---

## Trust Model & Scorecard Limitations

This project is maintained by a single owner (`@vishnuvardhanburri`). As a result, certain enterprise-level GitHub features evaluated by OpenSSF Scorecard are intrinsically limited:

- **Code-Review:** Pull Request approvals are required for merging to `main`, but as a sole maintainer, "two-party" review is organically unachievable without artificial contributors. We do not manufacture fake reviewers to bypass this.
- **Maintained:** The repository is actively maintained but may occasionally flag as "unmaintained" in Scorecard until the project surpasses the 90-day creation threshold.
- **Fuzzing:** Foundry-based invariant and property fuzzing are actively utilized for cryptographic correctness but are currently undetected by Scorecard's ClusterFuzzLite integrations.
- **Code Scanning Findings (GHSA-8988-4f7v-96qf, CVE-2026-54285, GHSA-qpx9-hpmf-5gmw, GHSA-848j-6mx2-7j84, GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p):** We formally accept the risk for these transitive vulnerabilities (`ethers@5.x`, `snarkjs`, `@opentelemetry/core@1.x`). Upgrading them introduces immediate breaking API and cryptographic protocol changes.
