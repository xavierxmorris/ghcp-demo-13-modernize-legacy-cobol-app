---
description: 'Diagnose a failing parity scenario and decide whether it is a regression or an intended remediation.'
mode: agent
---

# Triage a parity failure

A parity scenario is red. Work out **why** before changing anything.

Scenario: `${input:scenario:scenario id, or leave blank to triage all failures}`

## The rule

A red scenario is information, not an obstacle. The one thing you must not do is edit
`spec/scenarios.json` or `parity/golden/` to make it green. Those files are recorded
evidence.

## Steps

1. Reproduce with the diff visible:

   ```bash
   node parity/cli.mjs verify --target node --policy modernized --filter <ID> --verbose
   ```

2. Classify the failure. Exactly one of these is true:

   | Classification | Signal | Correct action |
   | --- | --- | --- |
   | **Regression** | A `strict` scenario diverged | Fix the port. The legacy behaviour is correct here. |
   | **Undeclared remediation** | A `quirk` scenario diverged from both `expectLegacy` and `expectModern` | Either fix the port, or update `expectModern` and justify it in `docs/LEGACY-BEHAVIOR.md`. |
   | **Vocabulary drift** | Facts are missing entirely, not merely different | The port changed its wording. Fix the wording, or update `parity/lib/facts.mjs` and re-verify **both** targets. |
   | **Stale baseline** | The COBOL target also fails `npm run parity:cobol` | The golden master no longer matches the binary. Something changed the COBOL or the compiler. Investigate before re-recording. |

3. Confirm which side moved:

   ```bash
   npm run parity:cobol      # is the legacy baseline still self-consistent?
   ```

   If this is green, the baseline is fine and the port is at fault.

4. Apply the fix that matches the classification. Then:

   ```bash
   npm test
   ```

## Output

State the classification explicitly, the evidence for it, the fix you applied, and the
resulting test output. If the correct action was to change an authored expectation
rather than code, say so plainly and explain the business reasoning — that is a design
decision, not a test fix.
