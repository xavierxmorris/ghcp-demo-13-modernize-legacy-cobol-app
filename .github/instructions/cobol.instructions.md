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
you read the source like a modern language:

- **`PIC 9(6)V99` is an unsigned 8-digit fixed-point field.** A minus sign in the
  input is discarded, not rejected. `-100` credits 100.
- **`ACCEPT` fills the receiving field from the left and truncates.** Input longer
  than the field is silently cut before it is parsed, so `12345678.99` becomes
  `12345678`.
- **`ADD` / `SUBTRACT` without `ON SIZE ERROR` discard the overflowing digit.**
  The result wraps and the program reports success.
- **`ACCEPT` at end of file leaves the field unchanged and never signals EOF.**
  A `PERFORM UNTIL` loop around it spins forever.
- **`WORKING-STORAGE` in a called subprogram persists for the process lifetime**
  but not beyond it. `data.cob` looks like storage and is really a global variable.
- **Alphanumeric comparison pads the shorter operand with spaces**, which is why
  `'READ'` matches a `PIC X(6)` field holding `'READ  '`.

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
