# Migration playbook

How to drive this migration with GitHub Copilot, and — more importantly — why the
workflow is shaped this way.

For the practical division of work between Copilot, the reference program,
the automated gates, and reviewers, see [What Copilot adds](COPILOT-VALUE.md).

## The problem with "ask an LLM to port this"

The naive workflow is: paste the COBOL into chat, ask for JavaScript, run it, eyeball
the output. It produces plausible code quickly and it is how most COBOL modernisation
demos work.

It also fails on this 90-line program, in ways that are invisible without execution:

- A faithful-looking port would `balance += amount` and **not** reproduce the silent
  overflow that destroys money (`L-01`) — an undeclared behaviour change.
- A port that parses `-100.00` with `Number()` **debits** through the credit path,
  where the original **credits** (`L-02`). Opposite results, same input.
- A port would build the three-tier data layer the README describes — which the
  original never actually had, because `data.cob` never matches an operation (`L-10`).

The model was asked to translate source without evidence of its runtime behavior.
A fluent translation can still be wrong. This repository is not a benchmark
showing that stronger models perform worse; its lesson is to ground generation
and review in observable behavior.

For taxation-office work, use the [taxation knowledgebase](TAX-OFFICE-KNOWLEDGEBASE.md)
and its original-source evidence pack. Do not relabel the generic accounting
program as a real taxation system or add independently invented tax expectations.

## The fix: make behaviour executable before you migrate

```
  characterise  →  record  →  port  →  verify  →  declare
       │             │          │         │          │
   add scenario   run the    write the  golden-   say which
   for the input  binary,    modern     master    changes were
   you care about capture it code       diff      intentional
```

The unit of progress is not "a file was translated". It is "a behaviour was recorded,
reproduced or deliberately changed, and the difference was declared".

This is what makes agentic work safe here. The agent has an **oracle** — a command that
returns a truthful pass/fail — so it can iterate without a human reading every diff.
Without one, an agent optimises for code that looks right.

## What ships in this repository to support that

| Capability | Where | What it does |
| --- | --- | --- |
| Repository instructions | [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | Always-on conventions for every Copilot surface |
| Agent instructions | [`AGENTS.md`](../AGENTS.md) | Setup, verification loop and hard rules for autonomous agents |
| Path-specific instructions | [`.github/instructions/`](../.github/instructions) | COBOL, Node and test rules that apply only to matching files |
| Prompt files | [`.github/prompts/`](../.github/prompts) | The workflow steps, versioned and reviewable instead of pasted from a README |
| Custom agents | [`.github/agents/`](../.github/agents) | Archaeologist → engineer → auditor, with tool restrictions and handoffs |
| Agent skill | [`.github/skills/cobol-parity-check/`](../.github/skills/cobol-parity-check) | Loaded on demand when a task touches parity; also used by Copilot code review |
| Cloud agent environment | [`.github/workflows/copilot-setup-steps.yml`](../.github/workflows/copilot-setup-steps.yml) | Pre-installs GnuCOBOL so the agent can *run* the legacy system |
| CI gate | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Parity on every PR, plus a guard that recorded evidence was not hand-edited |

The single most important entry in that table is `copilot-setup-steps.yml`. Without a
COBOL compiler in its environment, an agent is reduced to reasoning about the legacy
system instead of executing it — the exact failure this repository is built to prevent.

## The three-agent workflow

Each agent has a different role and tool selection. These conventions guide
the work; they are not a sandbox or a substitute for review and CI controls.

### 1. `legacy-archaeologist` — authors evidence, not application code

Can read anything, add scenarios and record them. **Cannot** write application code or
touch the `.cob` files. Its output is findings with recorded evidence.

```
@legacy-archaeologist What happens when a credit overflows the balance field?
```

### 2. `migration-engineer` — writes the port under a parity gate

Implements against recorded behaviour. **Cannot** edit `expectLegacy` or
`parity/golden/`. Must declare every remediation.

```
@migration-engineer Port operations.cob, remediating L-01 and L-02.
```

### 3. `parity-auditor` — read-only, verifies the claims

Runs everything itself, cross-checks the `bug-for-bug` failure list against the
declared remediations, and hunts for undeclared behaviour changes and weakened specs.

```
@parity-auditor Audit the migration on this branch.
```

Handoffs are wired in the agent frontmatter, so the chain is one click each way.

## The two-policy trick

Every scenario is `strict` (real business behaviour) or `quirk` (a defect). A port is
verified under a **policy**:

```bash
node parity/cli.mjs verify --target node --policy modernized     # what you ship
node parity/cli.mjs verify --target node --policy bug-for-bug    # what you changed
```

Under `bug-for-bug`, the port is compared with legacy expectations, including
defects. Failures establish differences, not intent. Compare the failed IDs
with declared `expectModern` changes and findings, then classify unexplained
differences as possible regressions, vocabulary drift, or environment issues.
Only the reviewed, intended differences form a remediation manifest.
The flag changes the oracle, not the application behavior.

## Guardrails that survive contact with an agent

Instructions are advisory; an agent under pressure to make tests pass may still edit
the spec. So the important rules are checked mechanically:

- `spec/scenarios.json`'s `expectLegacy` and everything in `parity/golden/` are
  **recorded output**. The `guard-recorded-artefacts` CI job re-runs
  `npm run parity:record` against a freshly compiled binary and fails if the result
  differs from what was committed, if a golden file is missing, or if an orphan golden
  file appears. Editing a golden file to turn a red scenario green is caught.

  Be clear about what this is: a **reproducibility check**, not provenance
  enforcement. It proves the committed evidence matches what the committed COBOL
  produces. A pull request that changes the `.cob` files *and* the baselines together
  is self-consistent and would pass — which is why the job also fails outright on any
  change to a `.cob` file, and why branch protection and `CODEOWNERS` are the real
  control for that case.
- Every spawned process has a byte cap and a timeout, because the legacy binary loops
  forever on end of input (`L-07`). Without both, an agent running the suite hangs or
  fills the disk.
- Every session's exit status is checked. A target that prints a perfect transcript
  and then exits nonzero fails, rather than passing on the strength of its output.
- Output that uses the contract vocabulary but cannot be parsed becomes an `unparsed:`
  fact, so wording drift shows up as a diff instead of a silent omission.
- Each scenario runs with a private data store, so results cannot depend on order.

## Running the exercise yourself

Keep the reference ports and recorded evidence intact. Use a separate exercise
clone and branch rather than deleting maintained source:

```bash
git clone https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app.git cobol-exercise
cd cobol-exercise
git switch -c exercise-tax-reconciliation
```

Work through `characterize-legacy`, the target-specific port prompt,
`triage-parity-failure`, and `migration-status`. For the taxation supplement,
start with `tax-office-seam` and one selected-language evidence gate. Every
runnable example must remain tied to the original recorded COBOL oracle;
unsupported tax behavior is a requirement/evidence gap, not a completed port.
