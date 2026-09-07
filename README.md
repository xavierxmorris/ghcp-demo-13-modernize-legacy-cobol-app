# COBOL to Java and .NET with GitHub Copilot

[![CI](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app/actions/workflows/ci.yml/badge.svg)](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app/actions/workflows/ci.yml)
[![Copilot setup](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app/actions/workflows/copilot-setup-steps.yml/badge.svg)](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app/actions/workflows/copilot-setup-steps.yml)

**Modernize behavior you can demonstrate, not just code that looks plausible.**
This hands-on lab preserves the original COBOL accounting program and compares
independent **Java 25, .NET 10, and Node.js** implementations with its recorded
behavior. GitHub Copilot assists the engineering; executable evidence keeps
the work accountable.

[Start here](#start-here) · [Run it](#quick-start) · [Evidence](#follow-the-evidence) ·
[Copilot value](#where-github-copilot-adds-value) · [Guides](#browse-the-guides) ·
[Limits](#scope-and-honesty)

## Start here

| I want to... | Start with | What I get |
| --- | --- | --- |
| Run original COBOL against Java and .NET | [Quick start](#quick-start) | Fresh reference execution and a traceable comparison report |
| Choose a target language or setup | [Java/.NET modernization guide](docs/JAVA-DOTNET-MODERNIZATION.md) | SDK/container options and a staged migration path |
| Understand Copilot's practical value | [Copilot value guide](docs/COPILOT-VALUE.md) | Concrete tasks, artifacts, and responsibilities |
| Use a taxation-office context | [Taxation knowledgebase](docs/TAX-OFFICE-KNOWLEDGEBASE.md) | Original-evidence mapping, common issues, and explicit gaps |
| Inspect what the COBOL actually does | [Legacy findings](docs/LEGACY-BEHAVIOR.md) | Recorded cases, transcripts, and the linkage/state probe |
| Teach or follow the lab | [Workshop](WORKSHOP.md) / [presenter run sheet](RUN-SHEET.md) | Participant exercises or the short Node-based presentation |

## Quick start

### Full original-evidence path: Windows or Docker

Prerequisites: **Git, Node, and a running Linux Docker environment**. Node 24
is the recommended starting point. You do not need local Java, .NET, or
GnuCOBOL installations when using this route.

```powershell
git clone https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app.git
Set-Location ghcp-demo-13-modernize-legacy-cobol-app
npm run verify:modern -- --docker
```

The command builds the toolchain image, rebuilds the **original COBOL**, runs
the linkage/state probe, compiles Java and .NET, and compares the same original
input scenarios. It does not fall back to a modern-port-only success.

Choose one modern language if preferred:

```powershell
npm run verify:java -- --docker
npm run verify:dotnet -- --docker
```

On a configured Linux host, omit `--docker`. You need Node, GnuCOBOL,
Bash/coreutils, and the selected SDK. The applications have **no external
runtime or development packages**.

The report is written to `build/tax-office/evidence-java-dotnet.json`, or the
corresponding single-target filename. That existing report location is shared
with the [taxation evidence pack](examples/tax-office/README.md); the `tax:*`
commands remain compatible aliases. The program is still generic accounting
code, not a tax application.

### Original Node workshop

```powershell
.\go.ps1 -Check
```

This is the original COBOL/Node presenter track, not the complete Java/.NET
evidence workflow. For a lightweight comparison with committed expectations:

```powershell
npm run parity:node
```

That Node-only command does **not** constitute fresh COBOL replay. Full
setup, native commands, and storage limitations are in the
[Java/.NET guide](docs/JAVA-DOTNET-MODERNIZATION.md).

## Follow the evidence

| Stage | Open this artifact | Responsibility |
| --- | --- | --- |
| Original source | [`main.cob`](main.cob), [`operations.cob`](operations.cob), [`data.cob`](data.cob) | Preserved reference programs |
| Recorded behavior | [`spec/scenarios.json`](spec/scenarios.json), [`parity/golden/`](parity/golden) | Inputs, original observations, and declared modern expectations |
| Modern implementations | [`java-accounting-app/`](java-accounting-app), [`dotnet-accounting-app/`](dotnet-accounting-app), [`node-accounting-app/`](node-accounting-app) | Independent ports, not wrappers calling the old program |
| Traceability | [`evidence-map.json`](examples/tax-office/evidence-map.json) | Source symbols and scenario IDs mapped to modern files |
| Run results | `build/tax-office/` and the [CI evidence artifact](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app/actions/workflows/ci.yml) | Actual comparisons, source hashes, and runtime versions |

### A small example with a large consequence

For `Q-05`, the account starts at `1000.00` and receives a credit of `999000.00`:

| Original recorded COBOL | Existing declared modern behavior |
| --- | --- |
| Reports success and a `0.00` balance after field overflow | Rejects the credit and retains `1000.00` |

That difference is not something to hide. It is the declared `L-01`
remediation, backed by the [original finding](docs/LEGACY-BEHAVIOR.md#l-01).
The report separates **preserved normalized facts** from **existing declared
remediations**. A failing comparison alone does not establish intent.

For the deeper data-layer investigation, see
[`L-10`](docs/LEGACY-BEHAVIOR.md#l-10) and its
[assertion-backed probe](scripts/probes/data-cob-is-dead-code.sh).

## Where GitHub Copilot adds value

Use Copilot to help trace the source, propose characterization cases,
implement a bounded change, and investigate a failing comparison. Do not ask
it to invent the business rules or judge equivalence from a fluent explanation.

| Engineering task | Repository support |
| --- | --- |
| Establish original behavior | [`legacy-archaeologist`](.github/agents/legacy-archaeologist.agent.md), source and recorded evidence |
| Implement one supported target change | [`migration-engineer`](.github/agents/migration-engineer.agent.md), scoped instructions and port prompts |
| Review differences and missing coverage | [`parity-auditor`](.github/agents/parity-auditor.agent.md), actual commands and comparison output |
| Make the work repeatable | [`AGENTS.md`](AGENTS.md), [Copilot instructions](.github/copilot-instructions.md), [setup workflow](.github/workflows/copilot-setup-steps.yml), CI |

**Copilot proposes and implements; the compiler/runtime executes; the gates
produce evidence; people approve business meaning and intentional changes.**
The [value guide](docs/COPILOT-VALUE.md) explains this division with concrete
examples and distinguishes COBOL migration from Java/.NET framework upgrades.

## Browse the guides

| Guide | Use it for |
| --- | --- |
| [Migration playbook](docs/MIGRATION-PLAYBOOK.md) | Characterize, record, port, compare, and declare |
| [Java/.NET setup and target choices](docs/JAVA-DOTNET-MODERNIZATION.md) | Toolchains, language paths, and production boundaries |
| [Taxation knowledgebase](docs/TAX-OFFICE-KNOWLEDGEBASE.md) | Taxation-relevant controls grounded in original evidence |
| [Evidence-pack reference](examples/tax-office/README.md) | Fingerprints, gate behavior, report fields, and limitations |
| [Legacy behavior register](docs/LEGACY-BEHAVIOR.md) | Findings `L-01` through `L-10` and their sources |
| [Prompts](PROMPTS.md) | Copy-paste engineering tasks and reusable prompt files |
| [Workshop](WORKSHOP.md) / [run sheet](RUN-SHEET.md) | Participant and presenter tracks |
| [Test plan](TESTPLAN.md) / [changes from upstream](docs/WHATS-NEW.md) | Coverage intent and repository provenance |

## Scope and honesty

- This is a small generic accounting sample. Taxpayer identity, PRNs, refunds,
  offsetting, assessments, and tax law are **not** implemented or proven.
- COBOL-to-golden comparison is byte-exact. Modern targets use the existing
  normalized fact contract and declared policy, not byte-identical formatting.
- The pinned source and recorded cases cover specific compiler/build behavior,
  not every COBOL dialect, CICS/VSAM estate, concurrency case, or production
  transaction boundary.
- The modern file stores are single-writer teaching implementations, not
  transactional ledgers. Inspect availability/skips; unavailable is not passed.
- Copilot instructions and review roles are not security sandboxes. This lab
  does not establish a productivity percentage, model ranking, or compliance
  certification.

## Related modernization labs

[COBOL/C boundary lab](https://github.com/xavierxmorris/ghcp-demo-12-cobol-c-interop)
keeps the rule in COBOL. [CardDemo](https://github.com/xavierxmorris/azure-mainframe-modernization-carddemo)
adds a read-only .NET application over preserved mainframe-shaped records.
The [demo index](https://github.com/xavierxmorris/ghcp-demos) connects the learning paths.

## License and upstream

MIT - see [LICENSE](LICENSE). Derived from
[`continuous-copilot/modernize-legacy-cobol-app`](https://github.com/continuous-copilot/modernize-legacy-cobol-app);
original attribution is retained. This repository adds evidence-driven
modernization examples and GitHub Copilot workflows.
