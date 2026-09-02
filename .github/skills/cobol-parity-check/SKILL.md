---
name: cobol-parity-check
description: Verify that a Node.js port still matches the recorded behaviour of the legacy COBOL accounting system. Use when reviewing or making changes to node-accounting-app, spec/scenarios.json, parity/, or the COBOL sources, or whenever asked whether a migration preserved behaviour.
---

# COBOL to Node.js parity check

This repository migrates a COBOL accounting system to Node.js. Equivalence is decided
by a golden-master harness, not by inspection.

## Run the check

```bash
npm run build:cobol   # needs GnuCOBOL; skip if unavailable and say so
npm test              # unit tests + both parity suites
```

For a readable per-scenario diff:

```bash
node parity/cli.mjs verify --target node --policy modernized
```

To see which legacy defects the port deliberately fixed — every failure below is an
intentional behaviour change:

```bash
node parity/cli.mjs verify --target node --policy bug-for-bug
```

## Interpreting a failure

| Symptom | Meaning | Action |
| --- | --- | --- |
| A `strict` scenario fails | Business-logic regression | Fix the port |
| A `quirk` fails under `modernized` | The remediation is incomplete or differs from `expectModern` | Fix the port, or justify and update `expectModern` |
| Facts vanish rather than change | The port's output wording drifted | Fix the wording, or update `parity/lib/facts.mjs` and re-verify **both** targets |
| `parity:cobol` itself fails | The baseline no longer matches the binary | Investigate before re-recording; something changed the COBOL or the compiler |

## The rule that must not be broken

`spec/scenarios.json`'s `expectLegacy` fields and everything in `parity/golden/` are
**recorded output from the real COBOL binary**. Editing them by hand to make a test
pass replaces a failing test with a false assurance. Regenerate them only with
`npm run parity:record`, and only with the binary built.

Authored fields (`input`, `parity`, `finding`, `notes`, `expectModern`) may be edited
normally — `expectModern` is a design decision and should be argued for.

## Reviewing a change

1. Does the diff touch `expectLegacy` or `parity/golden/` without a `parity:record` run?
   Flag it.
2. Does the `bug-for-bug` failure list match the remediations the author declared?
   Anything extra is an undeclared behaviour change.
3. Is any balance arithmetic done in floating point? Money is integer cents.
4. Is invalid input coerced to a value anywhere instead of rejected? That is the defect
   class the migration exists to remove — see `docs/LEGACY-BEHAVIOR.md`.
