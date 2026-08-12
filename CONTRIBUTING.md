# Contributing

We welcome contributions to `zk-proof-engine`! To ensure a secure and reliable supply chain, we adhere to OpenSSF Best Practices.

## OpenSSF Practices

When contributing, please follow these security guidelines:

1. **Immutable Dependencies**: Any new GitHub Action must be pinned to a full 40-character commit SHA.
2. **Least Privilege**: GitHub Actions workflows must use the minimum required `permissions`.
3. **No Shell Injection**: Avoid untrusted inputs in `run` blocks in workflows.
4. **Vulnerability Scanning**: Code additions must pass all OSV-Scanner and Scorecard supply-chain security checks.
5. **Testing**: Ensure all new code has accompanying tests. Run `npm test` and `forge test` locally before submitting a PR.
6. **Code Review**: All PRs require review before merging into `main`.

## Local Development

```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Run the test suite
npm test
```

Please review the [SECURITY.md](SECURITY.md) for vulnerability reporting instructions.
