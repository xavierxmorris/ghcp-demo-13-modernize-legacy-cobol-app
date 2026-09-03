# RUN-SHEET

Ten minutes, four beats. The punchline is beat 4.

## 0. Setup (before the audience arrives)

```powershell
cd ghcp-demo-13-modernize-legacy-cobol-app
.\go.ps1 -Check
```

Expect: toolchain → compile → `26/26 Parity holds` twice → `106 pass`. Leave the
terminal open.

On Windows there is no GnuCOBOL, so `go.ps1` builds a container. First run takes
about a minute. **Do that before the demo, not during it.**

---

## Beat 1 — "Everyone already knows how to do this badly" (90s)

Open `main.cob`, `operations.cob`, `data.cob`. Ninety lines, three files.

**Say:** "The standard demo is: paste this into Copilot, ask for JavaScript, run it,
looks fine, ship it. Any model here does that in about four seconds, and the code it
writes is genuinely good."

Then open `README.md` and point at the table near the top.

**Say:** "It is also wrong in at least three ways, and none of them are visible in
code review."

---

## Beat 2 — "The reason is that nobody ran the original" (2 min)

```powershell
npm run parity:list
```

Twenty-six behaviours, graded `strict` or `quirk`.

**Say:** "The upstream repo had seven manual test cases in a markdown table, with the
'Actual Result' column left blank. These are the same seven, plus nineteen we found by
running the program and reading what came out."

Show two, live:

```powershell
node parity/cli.mjs verify --target cobol --filter Q-05 --verbose
```

**Say:** "Credit nine hundred and ninety-nine thousand onto a balance of one thousand.
The balance becomes **zero**, and the program prints 'Amount credited'. `PIC 9(6)V99`
holds six integer digits, `ADD` has no `ON SIZE ERROR`, so the seventh digit is thrown
away. The money is gone and the system says it worked."

```powershell
node parity/cli.mjs verify --target cobol --filter Q-01 --verbose
```

**Say:** "Credit *minus* one hundred. The balance goes **up**. The field is unsigned,
so the minus sign is discarded. Now — a modern port parses that with `Number()`, gets
`-100`, and *debits* the account through the credit path, skipping the
insufficient-funds check. The bug and the naive fix point in opposite directions."

---

## Beat 3 — "So make behaviour executable first" (2 min)

```powershell
npm run parity:node
```

`26/26 scenarios matched, 14 legacy defect(s) deliberately remediated.`

**Say:** "Same twenty-six scenarios, replayed against the Node.js port. The COBOL
prints `001000.00`; the port prints `1,000.00`. A shared normaliser reduces both to
the same fact, so presentation is free to modernise and behaviour is not."

Point at `parity/golden/` — real transcripts, captured from the binary, checked by CI.

---

## Beat 4 — "And here is what it changed on purpose" (3 min) — *the money shot*

```powershell
node parity/cli.mjs verify --target node --policy bug-for-bug
```

Fourteen failures. Let them land before explaining.

**Say:** "Under `bug-for-bug` the port is *required* to reproduce the legacy defects.
So every failure on this screen is a behaviour somebody changed deliberately. That
list is the sign-off document — generated, not remembered. And if something shows up
in it that you did not intend to change, you just found a regression without reading a
single diff."

Then the one that always lands:

```powershell
bash scripts/probes/data-cob-is-dead-code.sh     # in the container, or a Codespace
```

**Say:** "`data.cob` is the data layer. The README has a sequence diagram of it. It
never runs. `operations.cob` passes a four-character `'READ'` into a six-character
field, it matches neither branch, there is no `ELSE`, so it silently returns. Change
its opening balance to 7777.77 and nothing happens. No human and no model finds that
by reading. Ten seconds of running finds it immediately."

Close on `.github/`:

**Say:** "Instructions, prompt files, three agents, a skill — and
`copilot-setup-steps.yml`, which installs a COBOL compiler into Copilot's cloud agent
environment. That is the whole trick. An agent that can *run* the legacy system
behaves completely differently to one that can only read it."

---

## Recovery

| Problem | Fix |
| --- | --- |
| `cobc` not found on Windows | Expected. `go.ps1` uses Docker automatically; start Docker Desktop first |
| Docker daemon not running | `.\go.ps1 -Check` says so explicitly; start it, or use a Codespace |
| First run is slow | The lab image builds once. Pre-build with `.\go.ps1 -Check` |
| `parity:cobol` fails | Something changed the `.cob` files. `git status` |
| A scenario hangs | It should not — every process has a byte cap and a timeout (`L-07`) |
| Want to reset the port | `git checkout node-accounting-app` |
