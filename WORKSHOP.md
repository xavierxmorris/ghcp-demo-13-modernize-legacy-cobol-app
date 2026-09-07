# Workshop: characterize, port, and declare every behavior change

**Audience:** modernization engineers, testers, and technical leads.
**Time:** 75 minutes after toolchain setup.
**Outcome:** a trace from a recorded legacy observation to a modern behavior,
plus a defensible remediation decision.

This is the original Node-focused workshop. The
[Java/.NET extension](docs/JAVA-DOTNET-MODERNIZATION.md) uses the same scenarios
with additional SDKs and an optional multi-language container; it does not
replace this track. Read actual pass/skip counts when those targets are present.

## 1. Choose full or Node-only evidence - 8 minutes

The repository requires **Node >=20.11** and has no npm dependencies.
Do not add an installation step that is not needed.

| Track | Commands | Evidence boundary |
| --- | --- | --- |
| Full, in a configured Linux/devcontainer environment | `npm run build:cobol`, then `npm test` | Fresh legacy execution plus modern checks |
| Windows container runner | `.\go.ps1 -Check` | Full checks if the GnuCOBOL/Docker path is available |
| Node-only | `npm run parity:node` | Port versus committed expectations, not fresh legacy reproduction |

`npm test` can skip COBOL tests when the binary is absent. A green result with
skips is not evidence that the current compiler reproduced the golden master.
A Linux binary created through Docker must run inside that environment, not
directly from a Windows Node process.

The container uses the repository's GnuCOBOL 3.1.2/Node 22 setup. Record actual
versions, platform, and skips rather than adopting a historical total.

## 2. Read the oracle before the implementation - 12 minutes

| Artifact | Purpose |
| --- | --- |
| [main.cob](main.cob), [operations.cob](operations.cob), [data.cob](data.cob) | Read-only legacy specification |
| [scenarios.json](spec/scenarios.json) | Inputs, parity class, recorded and approved modern expectations |
| [golden transcripts](parity/golden/) | Recorded stdout, not manually editable fixtures |
| [facts.mjs](parity/lib/facts.mjs) | Shared normalization and outcome vocabulary |
| [spec.mjs](parity/lib/spec.mjs) | Policy selection and isolated per-scenario storage |
| [LEGACY-BEHAVIOR.md](docs/LEGACY-BEHAVIOR.md) | Findings and reproducible evidence |

```powershell
npm run parity:list
```

Pick `TC-2.1` (ordinary credit), `Q-05` (overflow), and `Q-11` (restart).
Read their input and expectations. Follow `Q-05` to
[its transcript](parity/golden/Q-05.txt), which records a successful credit
message with a zero balance. Do not infer fresh execution from reading that file.

```text
Explain the three selected scenarios using their inputs, recorded transcripts,
and finding IDs. Separate direct observations from the explanation of why the
compiler produced them. Do not edit COBOL, golden output, or expectLegacy.
```

## 3. Understand two independent meanings of strict - 10 minutes

| Setting | Meaning |
| --- | --- |
| Scenario `parity: "strict"` | A modern target must preserve the recorded normalized behavior |
| Scenario `parity: "quirk"` | An approved modern expectation may replace a legacy defect |
| `--policy modernized` | Select approved modern facts for applicable quirks; preserve strict scenarios |
| `--policy bug-for-bug` | Compare the port with legacy facts, quirks included |
| CLI `--strict` | Additionally compare raw stdout bytes with golden transcripts |

Do not confuse a strict scenario with the `--strict` flag. The normalizer
deliberately allows presentation differences such as leading zeroes and grouping.
Byte-exact mode adds a different requirement and is useful for legacy
reproducibility, not automatically appropriate for the modern presentation.

The normalizer itself is part of the trusted test system. Review its handling
of malformed amounts, negated outcomes, and unrecognized outcome vocabulary.
Ignoring output that should have produced a fact can create a false pass.

## 4. Run a small comparison - 12 minutes

```powershell
npm run parity:node -- --filter TC-2.1,Q-05,Q-11 --verbose
```

Read the target, policy, selected scenario IDs, and actual facts. Modernized
policy should preserve ordinary credit while accepting the declared overflow
rejection and persistent restart behavior.

Now isolate the intentional difference:

```powershell
node parity\cli.mjs verify --target node --policy bug-for-bug --filter Q-05 --verbose
```

This command should exit nonzero for the shipped modern port: legacy overflow
success and modern rejection differ. That red result is useful only after
checking that it matches the declared `expectModern` and finding `L-01`.
Do not classify an arbitrary failure as intentional.

For fresh legacy reproduction, run the corresponding COBOL command **inside
the environment where the binary was built**, optionally with `--strict`.
Do not re-record the baseline merely because a comparison failed.

## 5. Make one bounded port change - 15 minutes

The completed port is a reference. Work on an exercise branch or a separate
target selected with `NODE_ENTRY`; preserve the original as a comparison.
Choose a small behavior and its coverage before asking for edits.

```text
Read the selected scenarios and existing money/operations modules. Propose one
bounded modernization change using integer cents. Identify the strict scenarios
that must remain unchanged and any behavior requiring explicit remediation.
Do not modify the legacy source, recorded expectations, or dependencies.
```

Relevant existing focused checks are:

```powershell
node --test tests\money.test.mjs tests\operations.test.mjs tests\data.test.mjs tests\facts.test.mjs
npm run parity:node
```

**Failure drill:** on the exercise target, introduce a one-cent error in an
ordinary credit. The strict credit scenario must fail. Restore that deliberate
edit and confirm recovery without modifying the spec.

If you add characterization knowledge, first add an agreed scenario and
record it with the real COBOL binary using the repository's recording command.
Review the resulting spec/transcript diff. Never hand-type `expectLegacy`.

## 6. Produce a remediation record - 10 minutes

| Field | Required content |
| --- | --- |
| Scenario and finding | Exact IDs; several scenarios may share one root cause |
| Legacy observation | Recorded input/output and compiler context |
| Modern outcome | Approved expectation and actual port result |
| Classification | Preserved behavior, declared remediation, regression, vocabulary drift, or environment issue |
| Business approval | Why the behavior change is acceptable |
| Remaining gaps | Inputs or operational properties not characterized |

The harness's "14 legacy defect(s)" summary counts scenario-level
remediations, not fourteen independent root causes. Explain that distinction
when presenting the result.

Keep unchanged strict cases in the report too: a list of approved fixes alone
does not show what was preserved.

## Production limits, troubleshooting, and reset

The store is atomic at file replacement, not transactional across simultaneous
processes. A concurrent read-modify-write can still lose updates. Do not call
this a production ledger or infer durability guarantees beyond the tests.

| Symptom | Diagnose before changing expectations |
| --- | --- |
| No scenarios selected | Exact filter ID/tag; an empty selection is an error |
| Legacy replay fails | Compiler, platform, binary, source, and baseline |
| Correct-looking amount still fails | Outcome vocabulary, process exit, and normalization |
| Node-only tests pass | Check whether legacy execution was skipped |
| Restart scenario differs | `ACCOUNT_STORE` isolation and intended persistence |

Use a fresh clone or preserve the current branch for a reset. Never discard
uncommitted port work or regenerate golden files to silence a failure.

## Current sources

Guide reviewed **2026-09-07** against package version **2.0.0** and the shipped
26 scenarios. Node-side parity was observed with Node **24.13.0**; that is
separate from the repository's container/compiler evidence.
[GnuCOBOL's project page](https://gnucobol.sourceforge.io/) lists stable
**3.2**, released **2023-07-28**; this lab intentionally retains its recorded
3.1.2 baseline. Consult [the migration playbook](docs/MIGRATION-PLAYBOOK.md)
for the broader method and declared coverage gaps.
