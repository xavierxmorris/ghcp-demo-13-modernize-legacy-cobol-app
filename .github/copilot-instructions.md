# Modernising a legacy COBOL accounting system

## What this repository is

A hands-on lab for migrating a COBOL account management system to Node.js, Java,
or .NET **without regressing behaviour**. It is deliberately small so the interesting part is the
*method*, not the domain.

- `main.cob`, `operations.cob`, `data.cob` — the legacy system. **Treat as read-only.**
  It is the specification. Changing it invalidates the recorded golden master.
- `spec/scenarios.json` — the executable behavioural contract. Single source of truth.
- `parity/` — the golden-master harness that replays scenarios against any target.
- `node-accounting-app/` — the modern port.
- `java-accounting-app/`, `dotnet-accounting-app/` — independent Java 25 and .NET 10
  ports using the same oracle, with no application dependencies.
- `docs/LEGACY-BEHAVIOR.md` — findings register (`L-01` … `L-10`), each empirically verified.
- `examples/tax-office/` - source-to-scenario-to-port evidence mapping for the
  original COBOL. It does not define a second oracle or a new tax application.

## The rule that matters most

**Never assert what the legacy system does. Run it and record it.**

COBOL semantics are full of surprises that no amount of reading catches: `ACCEPT`
truncates input to the receiving field's width, unsigned `PIC` clauses silently
discard minus signs, and `ADD` without `ON SIZE ERROR` silently destroys the
overflowing digit. Every claim in this repository about legacy behaviour is backed
by a recorded run in `parity/golden/`.

If you need to know what the original does with some input, add a scenario and record
it. Do not reason about it from the source.

## Commands

```bash
npm run build:cobol      # compile the COBOL into build/accountsystem (needs GnuCOBOL)
npm run parity:list      # list all scenarios
npm run parity:record    # re-record the golden master from the COBOL binary
npm run parity:cobol     # prove the COBOL still matches its own golden master
npm run parity:node      # prove the Node port matches the spec (modernized policy)
npm test                 # unit tests + both parity suites
npm run test:ports       # rebuild Java/.NET and run their explicit gates
npm run verify:modern    # fresh original COBOL evidence against both modern targets
npm run tax:check        # rebuild original COBOL and trace its cases to Java/.NET
```

`verify:java` / `verify:dotnet` select one modern target. Add `-- --docker`
on Windows. The `verify:*` and `tax:*` commands share the same evidence engine.

The COBOL parity suites skip automatically when `build/accountsystem` is absent, so
`npm test` works on a machine with no COBOL compiler.
Unavailable managed targets also skip in ordinary `npm test`; their explicit
`test:ports` gate must pass before claiming Java/.NET support. Follow
`.github/instructions/managed-ports.instructions.md` for those targets.

## Parity levels — read this before changing the spec

Every scenario is either:

- **`strict`** — real business behaviour. A port must reproduce `expectLegacy` exactly.
  A diff here is a regression, full stop.
- **`quirk`** — a defect of the COBOL implementation. A port may either reproduce it
  (`--policy bug-for-bug`) or fix it (`--policy modernized`, asserting `expectModern`).

Promoting a `quirk` to `strict`, or changing an `expectLegacy` array by hand, is
almost always wrong. `expectLegacy` is *recorded output*, not an opinion.

## Code conventions

**COBOL** — read-only. If you must illustrate a fix, add a sibling file, never edit
the originals.

**JavaScript**

- ES modules, Node 20+, no transpiler, no bundler, no runtime dependencies.
- **Money is integer cents.** Never a float, never a `Number` holding `12.34`.
  See `node-accounting-app/src/money.js`.
- Validation rejects rather than coerces. Coercing bad input to zero is how the
  legacy system lost money (`L-03`, `L-06`).
- Keep the `main` / `operations` / `data` module split so the mapping to the COBOL
  programs stays legible.
- Comments explain *why*, and cite the finding id when the code exists because of a
  legacy defect. Do not narrate what the code plainly does.

**Tests** — `node:test` + `node:assert/strict`. Test names read as behaviour
statements. Unit tests cover the new modules; parity tests cover equivalence.

## Output vocabulary contract

The harness reduces both programs' stdout to normalised facts using one shared
extractor (`parity/lib/facts.mjs`). A port may change layout, grouping and currency
formatting freely, but must keep the message keywords: `balance`, `credited`,
`debited`, `Insufficient funds`, `Invalid choice`, `Exiting the program`. Rejections
must be recognisable (`Rejected: …`). Changing that vocabulary means updating the
extractor and re-verifying both targets.

## When you finish a change

Run `npm test`. If a parity scenario fails, do not edit the spec to make it pass —
work out whether you introduced a regression or made a deliberate, documented
remediation, and say which in your summary.
