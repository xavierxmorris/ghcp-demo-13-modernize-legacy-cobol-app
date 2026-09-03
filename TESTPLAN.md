# Test plan — legacy behaviour for stakeholder validation

The original version of this document was a manual checklist with empty "Actual Result"
columns. Every case is now **executable**, and the "Actual (recorded)" column below is
what the compiled COBOL program really did — not what anyone expected it to do.

Source of truth: [`spec/scenarios.json`](spec/scenarios.json).
Evidence: [`parity/golden/`](parity/golden).
Explanations: [`docs/LEGACY-BEHAVIOR.md`](docs/LEGACY-BEHAVIOR.md).

```bash
npm run build:cobol
npm run parity:list       # every case
npm run parity:cobol      # re-verify the recorded results
```

## How to read this

- **Level `strict`** — real business behaviour. The replacement system must reproduce it.
- **Level `quirk`** — a defect. The replacement system may reproduce it or fix it, and
  the decision needs your sign-off. The proposed replacement behaviour is in the
  scenario's `expectModern` field.
- **Actual (recorded)** — the normalised fact sequence captured from a real run.
  `credited:1200.00` means the program reported a credit leaving a balance of 1200.00.

Opening balance is `1000.00` in every case unless stated.

---

## Cases carried over from the original plan

| ID | Case | Level | Actual (recorded) | Notes |
| --- | --- | --- | --- | --- |
| `TC-1.1` | View current balance | strict | `balance:1000.00` | |
| `TC-2.1` | Credit `200.00` | strict | `credited:1200.00` | |
| `TC-2.2` | Credit `0.00` | **quirk** | `credited:1000.00` | Reported as a **successful credit**. `L-06` |
| `TC-3.1` | Debit `300.00` | strict | `debited:700.00` | |
| `TC-3.2` | Debit `2000.00` (over balance) | strict | `insufficient_funds` | The one guard that is correct |
| `TC-3.3` | Debit `0.00` | **quirk** | `debited:1000.00` | Reported as a **successful debit**. `L-06` |
| `TC-4.1` | Exit | strict | `exit` | |

## Cases the original plan did not cover

Every row below was discovered by running the program. Four are 🔴 critical.

| ID | Case | Level | Actual (recorded) | Finding |
| --- | --- | --- | --- | --- |
| `TC-1.2` | How the balance is rendered | quirk | `001000.00`, zero-padded | ⚪ `L-08` — the README claims `1000.00` |
| `TC-3.4` | Debit exactly the full balance | strict | `debited:0.00` | Permitted. Boundary never tested before |
| `TC-3.5` | Debit `1000.01`, one cent over | strict | `insufficient_funds` | Guard is inclusive on the correct side |
| `TC-5.1` | Credit `500` then debit `200` | strict | `balance:1300.00` | |
| `TC-5.2` | Several operations in one session | strict | `balance:1050.00` | State is retained within a run |
| `Q-01` | Credit `-100.00` | quirk | `credited:1100.00` | 🟠 `L-02` — the balance **rises** |
| `Q-02` | Debit `-100.00` | quirk | `debited:900.00` | 🟠 `L-02` — sign discarded |
| `Q-03` | Credit `abc` | quirk | `credited:1000.00` | 🟠 `L-03` — success reported, nothing happened |
| `Q-04` | Credit `12345678.99` | quirk | `credited:346678.00` | 🟠 `L-04` — input truncated before parsing |
| `Q-05` | Credit `999000.00` | quirk | `credited:0.00` | 🔴 `L-01` — **the balance is destroyed** |
| `Q-06` | Credit `10.999` | quirk | `credited:1010.99` | 🟡 `L-05` — sub-cent value discarded |
| `Q-07` | Input ends without choosing Exit | quirk | `invalid_choice`, `runaway` | 🔴 `L-07` — **never terminates** |
| `Q-08` | Menu choice `12` | quirk | `balance:1000.00` | 🟠 `L-04` — silently selects option 1 |
| `Q-09` | Empty menu choice | strict | `invalid_choice` | Correct |
| `Q-10` | Credit `1e3` | quirk | `credited:1000.00` | 🟠 `L-03` — treated as zero |
| `Q-11` | Restart the program | quirk | balance returns to `1000.00` | 🔴 `L-09` — **nothing is persisted** |
| `Q-12` | Credit `" 200 "` with spaces | strict | `credited:1200.00` | Tolerated; a port must not become stricter |
| `Q-13` | Credit `0.005` | quirk | `credited:1000.00` | 🟡 `L-05` — sub-cent discarded, success reported |
| `Q-14` | Credit `999999.99`, the field maximum | quirk | `credited:999.90` | 🟠 `L-04` — even the stated maximum is truncated |

---

## Decisions needed from stakeholders

Each row is a `quirk` the replacement system proposes to change. Reproducing the legacy
behaviour instead remains available (`--policy bug-for-bug`), but must be a decision,
not an accident.

| Finding | Today | Proposed | Who notices |
| --- | --- | --- | --- |
| 🔴 `L-01` | A credit past `999,999.99` wipes the balance to zero and reports success | Refuse the transaction, balance untouched | Anyone crediting a large amount. Today they lose the entire balance |
| 🔴 `L-07` | Batch input without a trailing Exit loops forever | Exit cleanly at end of input | Operations. Today this fills a disk |
| 🔴 `L-09` | The balance resets to `1000.00` on every restart | Persist the balance | Everyone. There is currently no ledger |
| 🔴 `L-10` | `data.cob` never runs; the documented data layer does not exist | A real, tested storage layer | Architecture and audit |
| 🟠 `L-02` | `-100.00` credits `100.00` | Refuse a signed amount | Anyone who mistypes a sign |
| 🟠 `L-03` | `abc` reports a successful credit of nothing | Refuse non-numeric input | Every user, silently, today |
| 🟠 `L-04` | `12345678.99` is applied as `345,678.00` | Refuse over-long amounts | Anyone entering a large figure |
| 🟡 `L-05` | `10.999` is applied as `10.99` | Refuse more than two decimals | Reconciliation, eventually |
| 🟡 `L-06` | A zero movement is recorded and reported as successful | Refuse a zero amount | Audit |
| ⚪ `L-08` | Balance shown as `001000.00` | Shown as `1,000.00` | Every user |

**Note on `L-10`:** `data.cob` is never actually executed — see
[`docs/LEGACY-BEHAVIOR.md#l-10`](docs/LEGACY-BEHAVIOR.md#l-10). Any statement that the
current system has a separate data tier, including the original architecture diagram, is
incorrect.

---

## Where the automated tests are

| Layer | Location |
| --- | --- |
| Behavioural scenarios | `spec/scenarios.json` |
| Recorded COBOL transcripts | `parity/golden/` |
| Unit tests for the replacement | `tests/money.test.mjs`, `tests/operations.test.mjs` |
| Harness self-tests | `tests/facts.test.mjs` |
| Equivalence tests for both systems | `tests/parity.test.mjs` |

`npm test` runs all of it — 106 tests. The 26 COBOL parity tests skip automatically when `build/accountsystem` is absent.
