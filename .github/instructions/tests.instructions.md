---
name: 'Tests and the parity harness'
description: 'How to write and change tests, scenarios and golden files in this repository.'
applyTo: '{tests/**,parity/**,spec/**}'
---

# Tests, scenarios and golden files

## Two different kinds of test, do not confuse them

**Unit tests** (`tests/money.test.mjs`, `tests/operations.test.mjs`, `tests/facts.test.mjs`)
check the new code in isolation. Fast, deterministic, no process spawning.

**Parity tests** (`tests/parity.test.mjs`) replay `spec/scenarios.json` against a real
process and compare against recorded legacy behaviour. These are the tests that
actually protect the migration.

## What is recorded and what is authored

| Artefact                              | Origin                        | May you edit it by hand? |
| ------------------------------------- | ----------------------------- | ------------------------ |
| `scenario.input` / `sessions`          | Authored                      | Yes                      |
| `scenario.parity`, `finding`, `notes`  | Authored                      | Yes                      |
| `scenario.expectModern`                | Authored — a design decision  | Yes                      |
| `scenario.expectLegacy`                | **Recorded** from the binary  | **No**                   |
| `parity/golden/*.txt`                  | **Recorded** from the binary  | **No**                   |

To change a recorded artefact, run `npm run parity:record` with the COBOL binary
built, and include the resulting diff in your change. If you cannot build the COBOL,
you cannot change these files — say so instead of guessing.

## Adding a scenario

```jsonc
{
  "id": "Q-13",
  "title": "Short, factual description of the observed behaviour",
  "tags": ["validation", "defect"],
  "parity": "quirk",            // "strict" for real business rules
  "finding": "L-0X",            // required for quirks; add it to docs/LEGACY-BEHAVIOR.md
  "input": ["2", "…", "1", "4"],
  "expectModern": ["rejected", "balance:1000.00", "exit"],
  "notes": "Why this matters and what the legacy system does wrong."
}
```

Then `npm run parity:record -- --filter Q-13`, read the recorded `expectLegacy`, and
write up the finding.

Every scenario's input **must end with `4`** unless the scenario exists specifically to
exercise the end-of-input defect (`Q-07`). The legacy program never terminates on EOF,
so an unterminated scenario relies on the harness timeout and wastes five seconds.

## Test style

- `node:test` with `describe` / `it`, and `node:assert/strict`.
- Test names are behaviour statements: `refuses a debit one cent beyond the balance`.
- Where a test exists because of a legacy defect, name the finding in a comment.
- No mocking frameworks and no snapshot libraries. The golden master *is* the snapshot
  mechanism, and it is deliberately explicit.

## Harness invariants

- Every spawned process needs a byte cap **and** a timeout. The legacy binary loops
  forever on EOF; without both limits the suite hangs or fills the disk.
- Each scenario gets a private `ACCOUNT_STORE`. Sessions *within* one scenario share
  it — that is exactly what `Q-11` measures.
- Fact extraction is one fact per line, highest-priority pattern wins.
