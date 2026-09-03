# Account Management System — Node.js port

The modern replacement for the COBOL programs in the repository root.

## Run it

```bash
node src/main.js
```

The balance is persisted to `.account-store.json` beside this file, or to the path in
`ACCOUNT_STORE` if that is set. The parity harness sets `ACCOUNT_STORE` to a temporary
file per scenario so runs cannot contaminate each other.

## Module map

The split deliberately mirrors the COBOL programs so both can be held in mind at once.

| COBOL | Node.js | Responsibility |
| --- | --- | --- |
| `main.cob` | `src/main.js` | Menu loop and all I/O |
| `operations.cob` | `src/operations.js` | Credit and debit rules, pure functions |
| `data.cob` | `src/data.js` | Balance persistence |
| — | `src/money.js` | Amount parsing, validation, formatting |

`src/money.js` has no COBOL counterpart because the original had no concept of a
validated amount — that absence is the root of findings `L-02` through `L-06`.

## What this port changes on purpose

Fourteen legacy defects are remediated. Each is a **behaviour change** that a business
stakeholder would need to sign off, not a refactor:

| Finding | Legacy behaviour | This port |
| --- | --- | --- |
| `L-01` | An overflowing credit wraps to `0.00` and reports success | Refuses the transaction, balance untouched |
| `L-02` | `-100.00` credits `100.00` | Refuses a signed amount |
| `L-03` | `abc` and `1e3` become `0.00` and report success | Refuses non-numeric input |
| `L-04` | Input longer than the field is truncated before parsing, including `999999.99` | Refuses over-long amounts |
| `L-05` | `10.999` silently becomes `10.99`; `0.005` becomes nothing | Refuses more than two decimal places |
| `L-06` | A zero-value transaction is recorded as successful | Refuses a zero amount |
| `L-07` | End of input spins forever printing `Invalid choice` | Exits cleanly |
| `L-08` | Balance displayed as `001000.00` | Displayed as `1,000.00` |
| `L-09` | The balance is lost on restart | Persisted atomically |
| `L-10` | `data.cob` never executes | `data.js` genuinely stores the balance |

Regenerate this list mechanically at any time:

```bash
node ../parity/cli.mjs verify --target node --policy bug-for-bug
```

Every failure it prints is an intentional change. Anything unexpected in that list is a
regression.

## Design rules

- **Money is integer cents.** Never a float. `0.1 + 0.2 !== 0.3`, and a ledger that
  drifts by a cent is very expensive to debug later.
- **Reject, do not coerce.** Turning bad input into zero is exactly how the legacy
  system lost money.
- **`operations.js` performs no I/O**, so the business rules are unit-testable without
  spawning a process.
- **The `999,999.99` ceiling is kept** as an explicit rule. It came from
  `PIC 9(6)V99`; the legacy system enforced it by silently destroying the overflow.
- **Zero dependencies.** The standard library is sufficient.

## Scope: single process

The store is written atomically — a unique temporary file plus `rename` — so a crash
cannot leave a torn file. That is **not** the same as transactional.

`readBalance()` → arithmetic → `writeBalance()` is a read-modify-write with no lock,
so two instances running against the same `ACCOUNT_STORE` can overwrite each other.
This port is deliberately single-process, matching the original, which had no
concurrency story at all. A production ledger needs transactional storage; that is a
separate exercise, not a `fs` trick.

A store that exists but is not exactly what this program wrote — malformed JSON, a
missing or non-integer `balanceCents`, a negative value, or one beyond the account
limit — raises an error rather than falling back to the opening balance. Silently
resetting an account to `1,000.00` is finding `L-09`, not a recovery strategy.

## Output vocabulary

The parity harness reads this program's stdout and normalises it. Layout, grouping and
currency formatting are free to change; these keywords are not, or parity breaks:

`Current balance:` · `Amount credited. New balance:` · `Amount debited. New balance:` ·
`Insufficient funds` · `Invalid choice` · `Exiting the program` · `Rejected:`
