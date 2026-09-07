---
description: 'Implement one evidence-backed COBOL behavior in Java or .NET without weakening the oracle.'
mode: agent
---

# Implement one Java or .NET migration slice

Target: `${input:target:java or dotnet}`.
Scope: `${input:scope:one module or a covered behavior}`.

1. Read `AGENTS.md`, the applicable instructions, `spec/scenarios.json`,
   relevant golden transcripts, and `docs/LEGACY-BEHAVIOR.md`.
2. List the scenario IDs, strict invariants, and existing declared remediations
   that cover this scope. If evidence is missing, stop implementation and
   identify the characterization required.
3. Modify only the selected port and necessary tests/build integration.
   Preserve the main/operations/data mapping and use integer cents.
   Do not modify legacy source, `expectLegacy`, or golden output.
4. Run `npm run build:java && npm run parity:java` or
   `npm run build:dotnet && npm run parity:dotnet`, then `npm run test:ports`.
   Run `npm test` for regression coverage when all toolchains are available.
5. Compare `node parity/cli.mjs verify --target <target> --policy bug-for-bug`
   failures with the declared `expectModern` differences. This flag changes
   the oracle, not the application. Never suppress unexplained failures.

Return the source-to-target mapping, actual commands/outcomes, declared
differences, coverage gaps, and whether evidence includes fresh COBOL replay
or only comparison with recorded expectations. Do not claim production
readiness, deploy resources, install global plugins, or commit/push changes.
