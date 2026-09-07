---
description: 'Port one COBOL program to the Node.js application and prove parity, one module at a time.'
mode: agent
---

# Port a COBOL program

Port `${input:program:main.cob | operations.cob | data.cob}` to the Node.js
application, preserving behaviour that matters and deliberately fixing behaviour that
does not.

## Before you write any code

1. Read the COBOL program **and** the recorded evidence of what it does:
   - [`spec/scenarios.json`](../../spec/scenarios.json) — the fact sequences
   - `parity/golden/` — the raw transcripts
   - [`docs/LEGACY-BEHAVIOR.md`](../../docs/LEGACY-BEHAVIOR.md) — the findings register

2. List which scenarios exercise this program, and for each, state whether it is
   `strict` (must be reproduced) or `quirk` (should be remediated). Do this before
   implementing. If you cannot say which scenarios cover a code path, that path is
   uncharacterised — add a scenario first with the `characterize-legacy` prompt.

## Implementing

- Keep the module mapping: `main.cob` → `src/main.js`, `operations.cob` →
  `src/operations.js`, `data.cob` → `src/data.js`.
- Money is integer cents. Never a float.
- `operations.js` stays pure — no I/O — so it is testable without a process.
- Preserve the output vocabulary the harness reads (`balance`, `credited`, `debited`,
  `Insufficient funds`, `Invalid choice`, `Exiting the program`, `Rejected:`).
- Where the new code exists because of a legacy defect, cite the finding id in a
  comment.

## Proving it

```bash
npm run parity:node          # modernized policy: strict scenarios must match, quirks are fixed
npm test                     # unit tests + both parity suites
```

Then compare with the original policy; declared changes to normalized facts
should appear as differences:

```bash
node parity/cli.mjs verify --target node --policy bug-for-bug
```

Compare that failure list with the declared `expectModern` changes and findings.
It is not automatically a remediation manifest: investigate any undeclared
difference before labeling it intentional or changing the oracle.

## Output

- The scenarios that now pass, and under which policy.
- Every quirk you remediated, with its finding id and the behaviour you chose instead.
- Anything you deliberately left bug-for-bug, and why.
- The verbatim output of `npm test`.

Do not report success for code you did not execute.
