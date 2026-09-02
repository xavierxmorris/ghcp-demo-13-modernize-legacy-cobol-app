---
name: 'Node.js port'
description: 'Conventions for the modern Node.js implementation that replaces the COBOL programs.'
applyTo: 'node-accounting-app/**/*.js'
---

# Node.js port conventions

## Structure

The module split mirrors the COBOL programs deliberately, so a reviewer can hold both
in their head at once:

| COBOL            | Node.js                | Responsibility                     |
| ---------------- | ---------------------- | ---------------------------------- |
| `main.cob`       | `src/main.js`          | Menu loop and I/O                  |
| `operations.cob` | `src/operations.js`    | Credit / debit business rules      |
| `data.cob`       | `src/data.js`          | Balance persistence                |
| —                | `src/money.js`         | Amount parsing, validation, format |

Keep this mapping. Do not collapse the modules "because it is only 200 lines".

## Money

Money is **integer cents**. Never a float. `0.1 + 0.2 !== 0.3`, and a ledger that
drifts by a cent is a defect that is very expensive to find later.

- Parse with `parseAmount()`, which returns cents or throws `AmountError`.
- Format with `formatCents()`.
- The `999999.99` ceiling comes from `PIC 9(6)V99` and is enforced as an explicit
  business rule, because the legacy system enforced it by silently destroying money
  (finding `L-01`).

## Validation

Reject, never coerce. The legacy system turned `abc` into `0` and reported a
successful credit; that class of bug is the reason this port exists. Every rejection
path in `money.js` corresponds to a documented finding — keep the citation in the
comment when you touch it.

## Purity

`operations.js` must stay free of I/O: pure functions from `(balanceCents, amountCents)`
to an outcome. That is what makes it unit-testable without spawning a process.
`main.js` owns all reading and writing.

## Output vocabulary

The parity harness reads this program's stdout. You may change layout, grouping and
currency symbols freely — `parity/lib/facts.mjs` normalises them — but you must keep
these keywords or parity will break:

- `Current balance: <amount>`
- `Amount credited. New balance: <amount>`
- `Amount debited. New balance: <amount>`
- `Insufficient funds`
- `Invalid choice`
- `Exiting the program`
- `Rejected: <reason>` for a refused input

If you genuinely need different wording, update the extractor and re-run both
targets. Never update only one side.

## Dependencies

Zero. Node's standard library covers everything here. Adding a dependency to this
project needs justification, not a preference.
