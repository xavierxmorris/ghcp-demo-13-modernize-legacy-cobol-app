---
name: 'Original COBOL taxation evidence'
description: 'Taxation framing must trace to original source, recordings, and the existing modern ports.'
applyTo: '{examples/tax-office/**,tests/tax-office.test.mjs,scripts/check-tax-office.mjs}'
---

# Original-evidence rules

- Every runnable example must reference original COBOL source, existing
  scenario IDs/golden transcripts, and the existing Java/.NET accounting ports.
- The evidence map must not define another set of inputs or expected outputs.
- Never change original fingerprints or recorded expectations to bless a port.
- Keep source hashes, byte-exact legacy replay, normalized modern comparisons,
  explicit remediation classifications, and bounded process execution.
- The original is generic accounting code, not ATO code. No real tax identity,
  PRN, receipt deduplication, reversal, refund, or offsetting behavior is proven.
- Do not add real taxpayer records, tax law, ATO calls, posting, or refunds.
- Unsupported tax capabilities belong in the evidence-gap backlog until
  authorized original source and recorded behavior exist.
- Run `npm run tax:java`, `tax:dotnet`, or `tax:check`; add `-- --docker` on Windows.
- A missing compiler or failed original replay must fail the gate, not degrade
  into a recorded-only or modern-target-only success.
