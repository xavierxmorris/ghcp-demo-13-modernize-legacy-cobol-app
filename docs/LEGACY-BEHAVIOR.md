# What the legacy system actually does

Every claim in this document was produced by **running the compiled COBOL program**
and recording its output. Nothing here is inferred from reading the source. The
evidence lives in [`parity/golden/`](../parity/golden) and in the `expectLegacy`
fields of [`spec/scenarios.json`](../spec/scenarios.json).

Reproduce any of it:

```bash
npm run build:cobol
npm run parity:record -- --filter Q-05     # or any scenario id
```

Recorded with GnuCOBOL 3.1.2 on Ubuntu 24.04. GnuCOBOL 4.0-early-dev was checked
against the same 24 scenarios and produced **byte-identical** output, so these
findings are properties of the program, not of one compiler.

---

## Severity summary

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| [L-01](#l-01) | 🔴 Critical | An overflowing credit silently destroys money and reports success | `Q-05` |
| [L-07](#l-07) | 🔴 Critical | End of input causes an unbounded loop | `Q-07` |
| [L-09](#l-09) | 🔴 Critical | The balance does not survive a restart | `Q-11` |
| [L-10](#l-10) | 🔴 Critical | `data.cob` is dead code — the documented architecture is fiction | probe, below |
| [L-02](#l-02) | 🟠 High | The minus sign on an amount is silently discarded | `Q-01`, `Q-02` |
| [L-03](#l-03) | 🟠 High | Non-numeric input silently becomes zero and reports success | `Q-03`, `Q-10` |
| [L-04](#l-04) | 🟠 High | Input longer than the field is silently truncated before parsing | `Q-04`, `Q-08` |
| [L-05](#l-05) | 🟡 Medium | Sub-cent value is truncated, not rounded | `Q-06` |
| [L-06](#l-06) | 🟡 Medium | Zero-value transactions are accepted and reported as successful | `TC-2.2`, `TC-3.3` |
| [L-08](#l-08) | ⚪ Low | The balance is rendered zero-padded; the README documents it wrongly | `TC-1.2` |

---

## L-01

### An overflowing credit silently destroys money and reports success

**Severity:** 🔴 Critical — unbounded, undetectable financial loss.

**Observed.** Opening balance `1000.00`, credit `999000.00`:

```
Enter credit amount:
Amount credited. New balance: 000000.00
```

Recorded facts (`Q-05`): `credited:0.00 | balance:0.00 | exit`

**Why.** `FINAL-BALANCE` is `PIC 9(6)V99`, which holds at most `999999.99`. The
statement is:

```cobol
ADD AMOUNT TO FINAL-BALANCE
```

There is no `ON SIZE ERROR` clause. `1000.00 + 999000.00 = 1000000.00`, which needs
seven integer digits. COBOL discards the high-order digit, leaving `000000.00`. The
program then reports the credit as successful.

**Impact if ported blindly.** A JavaScript port using `balance += amount` will *not*
reproduce this — it will produce `1000000.00`. That looks like a fix, but it is an
undeclared behaviour change: any downstream system that relied on the 6-digit ceiling
now receives a value it cannot represent. The correct action is to make the limit
explicit and refuse the transaction, which is what `expectModern` for `Q-05` requires.

---

## L-02

### The minus sign on an amount is silently discarded

**Severity:** 🟠 High — a negative credit becomes a positive one.

**Observed.** Balance `1000.00`, credit `-100.00` → balance `1100.00`.
Balance `1000.00`, debit `-100.00` → balance `900.00`.

Recorded facts (`Q-01`): `credited:1100.00 | balance:1100.00 | exit`

**Why.** `AMOUNT` is `PIC 9(6)V99` — unsigned. There is no `S` in the picture clause,
so the sign is not stored and `ACCEPT` simply drops it. There is no validation.

**Impact if ported blindly.** A modern port that parses `-100.00` with `Number()` gets
`-100`, and `balance += -100` *debits* the account through the credit path, bypassing
the insufficient-funds guard entirely. The legacy bug and the naive port produce
**opposite** results. This is the single most dangerous line to port carelessly.

---

## L-03

### Non-numeric input silently becomes zero and reports success

**Severity:** 🟠 High — input validation does not exist.

**Observed.** Credit `abc` → `Amount credited. New balance: 001000.00`.
Credit `1e3` → same. Both report success having done nothing.

Recorded facts (`Q-03`, `Q-10`): `credited:1000.00 | balance:1000.00 | exit`

**Why.** There is no `IF AMOUNT IS NUMERIC` class test. `ACCEPT` into a numeric field
converts whatever it can and yields zero for the rest. Scientific notation is not
COBOL numeric syntax, so `1e3` is zero, not 1000.

**Impact if ported blindly.** `Number('abc')` is `NaN`; `balance + NaN` is `NaN`, and
`NaN` serialises to `null` in JSON. The account balance becomes unrecoverable rather
than merely wrong.

---

## L-04

### Input longer than the field is silently truncated before it is parsed

**Severity:** 🟠 High — the user's number is not the number that is used.

**Observed.** Balance `1000.00`, credit `12345678.99` → balance `346678.00`.
Menu choice `12` → the balance is displayed, that is, option 1 is selected.

Recorded facts (`Q-04`): `credited:346678.00 | balance:346678.00 | exit`

**Why.** `ACCEPT` fills the receiving field from the left and discards the remainder.
`AMOUNT` is 8 bytes, so `12345678.99` becomes `12345678`, which is then moved into
`PIC 9(6)V99` and overflows down to `345678.00`. `1000.00 + 345678.00 = 346678.00`.

`USER-CHOICE` is `PIC 9` — one byte — so `12` becomes `1`.

Two independent confirmations of the same mechanism: `999999.99` (9 characters)
truncates to `999999.9`, producing `999999.90`, not `999999.99`.

**Impact if ported blindly.** A modern port reads the whole line and gets a completely
different number. Whether that is a fix or a regression is a business decision that
someone must make explicitly — see `Q-04`'s `expectModern`.

---

## L-05

### Sub-cent value is truncated, not rounded

**Severity:** 🟡 Medium — small, systematic, one-directional loss.

**Observed.** Credit `10.999` → balance `1010.99`. Credit `0.005` → balance unchanged.

**Why.** `PIC 9(6)V99` has two decimal places and there is no `ROUNDED` clause, so the
third decimal is discarded. Truncation always favours the institution, which is
precisely the pattern auditors look for.

---

## L-06

### Zero-value transactions are accepted and reported as successful

**Severity:** 🟡 Medium — the ledger records movements that did not happen.

**Observed.** Credit `0` → `Amount credited. New balance: 001000.00`.
Debit `0` → `Amount debited. New balance: 001000.00`.

**Why.** No guard. This one is arguably intentional, which is why `TC-2.2` and `TC-3.3`
exist in the original test plan asserting exactly this. It is recorded as a `quirk`
rather than `strict` because an accounting system should refuse a no-op movement.

---

## L-07

### End of input causes an unbounded loop

**Severity:** 🔴 Critical — availability and disk exhaustion.

**Observed.** Feeding the program `1` with no `4` afterwards produced **107 MB of
output in under 10 seconds** before it was killed, cycling:

```
Enter your choice (1-4):
Invalid choice, please select 1-4.
```

Recorded facts (`Q-07`): `balance:1000.00 | invalid_choice | runaway`

**Why.** `ACCEPT USER-CHOICE` at end of file leaves the field unchanged and does not
signal EOF. `PERFORM UNTIL CONTINUE-FLAG = 'NO'` therefore never terminates. Any batch
invocation, redirected input file, or piped driver that does not end with `4` will
spin until the disk fills.

**Note for anyone building tooling around this program:** every process must be given
both a byte cap and a timeout. The parity harness in this repository does exactly that,
and that is why `Q-07` is a normal passing scenario rather than a hung test run.

---

## L-08

### The balance is rendered zero-padded, and the README documents it wrongly

**Severity:** ⚪ Low — presentation only, but it misleads every reader.

**Observed.** `Current balance: 001000.00`

The upstream README's "Program Interaction Example" claims:

```
Current balance: 1000.00
```

**Why.** `DISPLAY FINAL-BALANCE` on a `PIC 9(6)V99` field emits the raw field
contents, including leading zeros and without a thousands separator. Producing
`1000.00` would require an edited picture such as `PIC ZZZ,ZZ9.99`.

**Impact.** Anyone porting from the README rather than from the running program
produces output that does not match, and only discovers it if something compares the
two. That is the entire argument for a recorded golden master.

---

## L-09

### The balance does not survive a restart

**Severity:** 🔴 Critical — for an accounting system, there is no persistence at all.

**Observed.** Two consecutive runs of the same binary:

```
run 1:  Amount credited. New balance: 001500.00
        Current balance: 001500.00
run 2:  Current balance: 001000.00
```

Recorded facts (`Q-11`):
`credited:1500.00 | balance:1500.00 | exit | session_end | balance:1000.00 | exit`

**Why.** The balance lives in `WORKING-STORAGE`, which is process memory. Nothing is
written to a file or a database. Every restart silently reopens the account at
`1000.00`.

---

## L-10

### `data.cob` is dead code, and the documented architecture is fiction

**Severity:** 🔴 Critical — the system does not have the design it claims to have.

The upstream README describes a three-tier structure and ships a sequence diagram
showing `DataProgram` returning the balance to `Operations`. **None of that happens.**
`DataProgram` is called four times per session and does nothing on every call.

**Evidence 1 — what `DataProgram` actually receives.** Instrumenting a copy of
`data.cob` to display its `PIC X(6)` linkage item, with `operations.cob` unmodified:

```
  [probe] received <READ^@C>
  [probe] NO MATCH
  [probe] received <WRITE^@>
  [probe] NO MATCH
Amount credited. New balance: 001200.00
```

`^@` is a NUL byte. Neither `IF OPERATION-TYPE = 'READ'` nor `= 'WRITE'` is true, and
`data.cob` has no `ELSE`, so both calls fall through in silence.

**Evidence 2 — changing `data.cob` has no effect.** Setting
`STORAGE-BALANCE VALUE 7777.77` in `data.cob` and changing nothing else:

```
Current balance: 001000.00
```

If `DataProgram` were the source of truth this would read `007777.77`. It does not.
The balance actually lives in `operations.cob`'s own
`01 FINAL-BALANCE PIC 9(6)V99 VALUE 1000.00`, which persists across `CALL`s because
`WORKING-STORAGE` in a called subprogram survives for the life of the process.

**Why.** `operations.cob` passes literals that are shorter than the receiving field:

```cobol
CALL 'DataProgram' USING 'READ', FINAL-BALANCE      *> 4 characters
CALL 'DataProgram' USING 'WRITE', FINAL-BALANCE     *> 5 characters
```

`data.cob` declares `01 PASSED-OPERATION PIC X(6)`. GnuCOBOL passes the literal by
reference as a C string, so the callee reads six bytes from a five- or six-byte
allocation and picks up the NUL terminator plus a byte of whatever follows it in
read-only data — here the `C` of `"CREDIT"`.

Compare `main.cob`, which gets it right by padding every literal to exactly six
characters: `'TOTAL '`, `'CREDIT'`, `'DEBIT '`. That is why the `Operations` dispatch
works and the `DataProgram` dispatch does not.

**Impact if ported blindly.** This is the finding that makes the case for
characterisation testing better than any argument. A faithful reading of the source —
or of the README, or of the sequence diagram, or of an LLM summarising either —
produces a port with a working data layer that the original never had. The port would
be *more correct* and *behaviourally different*, and nobody would know which
differences were intentional.

`L-09` is a direct consequence: state is process memory in `operations.cob`, so it
cannot survive a restart.

---

## Coverage gaps

Behaviour that is **not** yet characterised. Anyone extending this lab should start here:

- Concurrent access. There is none, and there is no locking. Not exercised.
- Terminal interaction. All scenarios drive stdin from a pipe. `ACCEPT` behaves
  differently against a TTY in some GnuCOBOL configurations.
- `cobc` dialect flags. Everything is recorded under default settings; `-std=cobol85`
  or `-std=ibm` may change `ACCEPT` and `MOVE` semantics.
- Locale. Recorded under the default C locale. A locale with a comma decimal separator
  is untested.
