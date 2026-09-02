# What changed, and why

This fork rebuilds [`continuous-copilot/modernize-legacy-cobol-app`](https://github.com/continuous-copilot/modernize-legacy-cobol-app)
around two ideas that did not exist, or were not practical, when the original was
written:

1. **Migration correctness should be executable**, not reviewed by eye.
2. **Copilot is now configurable at the repository level** — instructions, prompt
   files, custom agents, skills, and a cloud agent environment you control.

The original is a good demonstration of chat-driven translation. Its limitation is that
nothing in it can tell you whether the translation was right.

---

## Factual corrections to the original

These are things the original repository states that turn out not to be true. Each was
found by running the program.

| Original claim | Reality | Evidence |
| --- | --- | --- |
| The app prints `Current balance: 1000.00` | It prints `001000.00`, zero-padded | [`L-08`](LEGACY-BEHAVIOR.md#l-08) |
| A three-tier design where `DataProgram` reads and writes the balance, per the sequence diagram | `data.cob` is dead code. It never matches an operation and returns having done nothing | [`L-10`](LEGACY-BEHAVIOR.md#l-10) |
| `sudo apt-get install gnucobol` | Installs a transitional package pulling the 4.0 pre-release; on Ubuntu 20.04 it installs GnuCOBOL 2.2. Pin `gnucobol3` | `.github/workflows/ci.yml` |
| `node-accounting-app/*` in `.gitignore` | Made it impossible to commit, review, test or CI the migration output | `.gitignore` |
| The devcontainer pins `github.copilot@insiders` and `markdown-lint.markdownlinter` | Neither is a valid marketplace identifier; Copilot Chat was absent | `.devcontainer/devcontainer.json` |

The COBOL sources themselves are **unchanged**. They are the specification.

---

## What was added

### An executable behavioural specification

`spec/scenarios.json` — 24 scenarios covering the original 7 manual test cases plus 17
discovered by experiment. Each is `strict` (business behaviour) or `quirk` (a defect),
and each quirk names a finding and a proposed modern behaviour.

`TESTPLAN.md` previously had empty "Actual Result" columns waiting for a human. Those
columns are now filled with recorded output.

### A golden-master parity harness

`parity/` replays every scenario against the COBOL binary and against the Node port,
reducing both to a normalised fact sequence so a 1985 program and a 2026 one can be
compared despite different formatting.

Two policies, which is the useful part:

```bash
node parity/cli.mjs verify --target node --policy modernized     # what you ship
node parity/cli.mjs verify --target node --policy bug-for-bug    # what you changed
```

Under `bug-for-bug`, every failure is a deliberate behaviour change. That list is the
remediation manifest a stakeholder signs off — generated, not remembered.

### A findings register

`docs/LEGACY-BEHAVIOR.md` — ten findings, `L-01` to `L-10`, four of them critical, each
with observed output, the COBOL mechanism that explains it, and the consequence of
porting it blindly.

### A working Node.js port

`node-accounting-app/` is committed, tested and CI-verified rather than gitignored.
Money is integer cents, input is rejected rather than coerced, and the module split
mirrors the COBOL so the mapping stays legible.

### GitHub Copilot configuration

| Capability | Location |
| --- | --- |
| Repository instructions | `.github/copilot-instructions.md` |
| Agent instructions | `AGENTS.md` |
| Path-specific instructions | `.github/instructions/*.instructions.md` |
| Prompt files | `.github/prompts/*.prompt.md` |
| Custom agents with handoffs | `.github/agents/*.agent.md` |
| Agent skill | `.github/skills/cobol-parity-check/SKILL.md` |
| Cloud agent environment | `.github/workflows/copilot-setup-steps.yml` |

The original kept its prompts as prose code blocks in the README, to be copied by hand.
They are now versioned, reviewable artefacts that Copilot loads itself.

`copilot-setup-steps.yml` is the entry that matters most: it pre-installs GnuCOBOL so
Copilot cloud agent can *run* the legacy system. Without it the agent can only reason
about COBOL it cannot execute, which is the failure mode this repository exists to
prevent.

### CI that cannot be talked around

`.github/workflows/ci.yml` runs parity on every pull request, and adds a
`guard-recorded-artefacts` job that re-runs `npm run parity:record` and fails if the
result differs from what was committed.

That job exists because instructions are advisory. An agent — or a person — under
pressure to turn a suite green can edit `expectLegacy` or a golden file and replace a
failing test with a false assurance. The guard makes that mechanically impossible.

---

## Verified environment claims

Things asserted in this repository were checked rather than assumed:

- GnuCOBOL **3.1.2** and **4.0-early-dev** produce **byte-identical** output across all
  24 scenarios, so the golden master is a property of the program, not the compiler.
- `apt-get install gnucobol` on Ubuntu 24.04 resolves to a transitional package for
  GnuCOBOL 4.0-early-dev; Ubuntu 20.04, the base of `devcontainers/universal:2`, only
  offers GnuCOBOL 2.2. Hence the pin to `gnucobol3` and the new devcontainer base.
- Feeding the original binary input that does not end in `4` produced **107 MB of
  output in under 10 seconds**, which is how `L-07` was found.

---

## What was deliberately not done

- **The COBOL was not "fixed".** Correcting `'READ'` to `'READ  '` would make
  `data.cob` live and change behaviour, invalidating the golden master. The defects are
  the exercise.
- **No test framework, no linter, no build tool, no dependencies.** `node:test` and the
  standard library are sufficient, and a zero-dependency repository is much easier to
  reason about in an agent session.
- **The images and MIT licence are retained** from the original.
