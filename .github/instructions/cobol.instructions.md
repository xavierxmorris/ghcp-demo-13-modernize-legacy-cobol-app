---
name: 'Legacy COBOL sources'
description: 'Rules for reading and reasoning about the COBOL programs that define this system.'
applyTo: '**/*.cob'
---

# Working with the COBOL sources

These three programs are the **specification**, not an implementation to improve.
They are read-only. Do not reformat, refactor, add comments to, or "fix" them.

## What to know before you reason about this code

COBOL's fixed-format layout and `PIC` clauses cause behaviour that is invisible if
you read the source like a modern language. Each point below is recorded, not
inferred:

- **`PIC 9(6)V99` is an unsigned 8-digit fixed-point field.** A minus sign in the
  input is discarded, not rejected. `-100` credits 100. (`L-02`)
- **`ACCEPT` fills the receiving field from the left and truncates.** Input longer
  than the field is silently cut before it is parsed, so `12345678.99` becomes
  `12345678`. (`L-04`)
- **`ADD` / `SUBTRACT` without `ON SIZE ERROR` discard the overflowing digit.**
  The result wraps and the program reports success. (`L-01`)
- **`ACCEPT` at end of file leaves the field unchanged and never signals EOF.**
  A `PERFORM UNTIL` loop around it spins forever. (`L-07`)
- **`WORKING-STORAGE` in a called subprogram persists for the process lifetime**
  but not beyond it. (`L-09`)
- **A literal passed `BY REFERENCE` is only as wide as the literal.**
  `operations.cob` passes the 4-character `'READ'` and 5-character `'WRITE'` into
  `data.cob`'s `PIC X(6)` linkage item. In the GnuCOBOL 3.1.2 and 4.0 builds
  recorded here the callee receives `READ\0C` and `WRITE\0`, matches neither
  branch, and — because `data.cob` has no `ELSE` — silently does nothing.
  **`data.cob` therefore never executes, and the balance is actually held by
  `operations.cob`'s own `FINAL-BALANCE`.** (`L-10`)
- **`main.cob` avoids that bug only by accident**: its literals `'TOTAL '`,
  `'CREDIT'` and `'DEBIT '` happen to be exactly six characters, so the
  `Operations` dispatch works.

Reproduce the last two:

```bash
bash scripts/probes/data-cob-is-dead-code.sh
```

## The rule

Every one of the points above is a *recorded* observation, not a reading of the
source. When you need to know what these programs do with some input, add a
scenario to `spec/scenarios.json` and run `npm run parity:record`. Cite the finding
id from `docs/LEGACY-BEHAVIOR.md`.

Never write "the COBOL program does X" in a commit message, comment or PR
description unless a golden transcript in `parity/golden/` shows it.

## Compiling

```bash
npm run build:cobol      # cobc -Wall -x main.cob operations.cob data.cob -o build/accountsystem
```

The `_FORTIFY_SOURCE redefined` warnings from GnuCOBOL 3.1.2 on Ubuntu are a known
interaction with the distribution's hardening flags. They are harmless and not
something to fix.
