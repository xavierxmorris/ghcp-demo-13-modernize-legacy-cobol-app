---
description: 'Produce a migration status report: what is characterised, what is ported, what is still unknown.'
mode: agent
---

# Migration status report

Produce an honest, evidence-backed status report for this migration. No optimism.

## Gather evidence

```bash
npm run parity:list
npm run parity:cobol                                            # legacy baseline healthy?
npm run parity:node                                             # port under modernized policy
node parity/cli.mjs verify --target node --policy bug-for-bug   # remediation manifest
npm test
```

If the COBOL binary cannot be built in this environment, say so — a report that omits
the legacy baseline is incomplete, not merely shorter.

## Report

1. **Coverage.** How many scenarios, split by `strict` and `quirk`. Which COBOL code
   paths have *no* scenario covering them — read the three `.cob` files and name the
   gaps explicitly. Uncharacterised behaviour is the real risk in a migration, and it
   is invisible in a green test run.

2. **Parity.** Pass/fail per target and policy, quoting real output.

3. **Remediations.** Every `quirk` the port deliberately fixed, with its finding id and
   the new behaviour. This is the list a business stakeholder must sign off, because
   each one is an intentional behaviour change.

4. **Open findings.** Anything in `docs/LEGACY-BEHAVIOR.md` with no corresponding
   scenario, or a scenario with no `expectModern`.

5. **Risks.** Be specific and ranked. "Needs more tests" is not a risk statement;
   "no scenario covers a debit against a zero balance after a restart" is.

## Format

A short markdown report. Tables where they help. Every claim traceable to a command
you ran, quoted. Mark anything you could not verify as **unverified** rather than
leaving it out.
