---
name: 'Java and .NET accounting ports'
description: 'Independent managed-language implementations under the shared behavioral oracle.'
applyTo: '{java-accounting-app/**,dotnet-accounting-app/**,scripts/build-ports.mjs}'
---

# Managed-language port rules

- Target Java 25 or .NET 10. Use the standard library; no application packages.
- Keep menu/I/O, pure operations, storage, and numeric parsing separate.
- Use signed 64-bit integer cents with the explicit 99,999,999-cent ceiling.
- Reject signed, fractional-cent, malformed, zero, or overflowing movements.
- Preserve the existing `expectModern` choices; do not invent new remediations.
- Never edit COBOL, `expectLegacy`, or recorded transcripts to make a port pass.
- Keep `ACCOUNT_STORE` isolation and process-restart behavior. An absent store
  may start at the opening balance; corrupt or inaccessible state must fail.
- The integer-cent store is not the Node JSON-object format or a concurrent
  production ledger. Do not add a web API around it without a new storage design.
- Rebuild the changed target before verifying it:
  `npm run build:java && npm run parity:java` or
  `npm run build:dotnet && npm run parity:dotnet`.
- Use `npm run test:ports` for the full managed-port gate and `npm test` for
  regression coverage. Report unavailable targets as unverified, not passing.
