# AI-assisted COBOL modernization: Java and .NET

Reviewed: **7 September 2026**. These are executable learning examples, not a
production banking platform or a general COBOL transpiler.

Use the [front-page navigation](../README.md#start-here) to choose a track and
the [Copilot value guide](COPILOT-VALUE.md) to understand who proposes changes,
who supplies evidence, and who approves the business meaning.

For taxation-office use cases, start with the
[taxation knowledgebase](TAX-OFFICE-KNOWLEDGEBASE.md) and the separate
[original-evidence pack](../examples/tax-office/README.md). The generic
accounting program is not relabeled as a taxation-office legacy system.

## Recommendation for this repository family

Use **one behavioral contract, independent target implementations, and small
replacement slices**. Do not start by translating every COBOL file.

| Repository | Best role | Java / .NET path |
| --- | --- | --- |
| [Demo 12: COBOL/C interoperability](https://github.com/xavierxmorris/ghcp-demo-12-cobol-c-interop) | Preserve a trusted rule behind an explicit boundary | Keep COBOL ownership; design a serialized integration contract before moving the rule |
| This repository | Learn how to replace behavior without silently changing it | Run the same scenarios against Node.js, Java 25, and .NET 10 |
| [CardDemo](https://github.com/xavierxmorris/azure-mainframe-modernization-carddemo) | Apply the method to mainframe-shaped data and dependencies | Keep the existing ASP.NET Core 10 slice; use its shared Java/.NET overpunch fixtures before attempting a Java service |

**For CardDemo, .NET 10 is the lowest-change default:** the application, tests,
container, and Azure infrastructure already exist. Choose Java 25 with Spring
Boot for a team with an established JVM estate, Java libraries, and operational
expertise. Compare both in the lab; do not introduce two production stacks just
to demonstrate two languages.

## What the AI tools actually do

There are two different tasks:

1. **COBOL language replacement:** use Copilot with the repository's evidence,
   instructions, and tests to implement a bounded behavior in another language.
   The tests, not the model's confidence, decide whether it conforms.
2. **Java/.NET platform upgrades:** use the supported GitHub Copilot modernization
   or upgrade experience after a Java/.NET application exists.

The current [supported-language documentation][supported] describes Java/.NET
upgrades and migration scenarios; it does **not** document a COBOL-to-Java or
COBOL-to-C# conversion capability. Containerizing COBOL is not translating it.
The [separate modernization-agent CLI][overview] is public preview; it is not
required for these examples. Do not confuse it with the Copilot CLI plugin.

The Java example deliberately has no Maven/Gradle dependencies. The Java
modernization plugin expects a discoverable Java project such as one with
`pom.xml` or `build.gradle`; use the repository agent for this small example.
Use the plugin when a real framework/build project is introduced.

## Best development setup

| Layer | Recommended setup | Why |
| --- | --- | --- |
| Workspace | Separate clone and reviewable branch per repository | Preserve the legacy baseline and avoid mixing independent histories |
| Windows execution | Docker Desktop Linux containers, optionally WSL2 | Run GnuCOBOL, Java, .NET, and the harness in one consistent environment |
| Editor | VS Code with Copilot, a COBOL extension, Extension Pack for Java, C# Dev Kit, and Dev Containers | Read the old and new implementations together |
| Java | A maintained **JDK 25 LTS** distribution | The examples compile with `--release 25`; support duration depends on the vendor |
| .NET | **.NET 10 LTS SDK** | Matches CardDemo's current target; do not begin a new migration on .NET 8 near end of support |
| Harness | Node 24 in the multi-language container | Node runs the comparison, not the Java/.NET business logic |
| Legacy compiler | Ubuntu 24.04 `gnucobol3`, GnuCOBOL 3.1.2 | Matches the recorded lab baseline; do not silently swap compilers |
| Future HTTP host | Spring Boot 4.1.x or ASP.NET Core 10 | Add a host after the domain contract passes, not before |
| AI execution | Existing `legacy-archaeologist`, `migration-engineer`, and `parity-auditor` roles | Separate evidence gathering, implementation, and review |

Open Copilot from the **repository root**, not `C:\Windows` or the whole home
directory. Keep normal tool approvals. Do not grant blanket permissions,
connect production datasets, or install unrelated MCP servers for this lab.
Public framework questions can use documentation tools; use approved internal
systems for private source and synthetic fixtures for examples.

### One container for the complete exercise

For a one-command original-COBOL-to-Java/.NET evidence run:

```powershell
npm run verify:modern -- --docker
```

`verify:java` and `verify:dotnet` select one modern target. These are aliases
of the same engine used by the `tax:*` evidence commands, not a separate
oracle. The lower-level command sequence below also runs the broader suite.

From this repository in PowerShell:

```powershell
$repo = (Get-Location).Path
docker build --file .\scripts\Dockerfile.modern --tag cobol-modernization:local .
docker run --rm --mount "type=bind,source=$repo,target=/work" --workdir /work `
  cobol-modernization:local bash -c `
  "npm run build:cobol && npm run build:ports && npm test && npm run parity:cobol -- --strict"
```

Alternatively, select **COBOL to Java and .NET modernization** when opening the
repository in a dev container. Its configuration is
[`.devcontainer/modernization/devcontainer.json`](../.devcontainer/modernization/devcontainer.json).
The original Node-only container and `go.ps1` presenter track remain available.

The container uses maintained major-version image tags so patch versions can
move. It is repeatable tooling, not a bit-for-bit frozen environment. Record
`java --version`, `dotnet --version`, `node --version`, and `cobc --version`
with evidence; pin reviewed image digests for a controlled migration.

### Native SDKs: run one language or both

These commands work from the repository root when the named SDKs are on PATH:

```powershell
npm run build:java
npm run parity:java

npm run build:dotnet
npm run parity:dotnet

npm run test:ports
```

`test:ports` builds both implementations, verifies the shared scenarios, and
exercises malformed storage and input. It also runs three deterministic
sequences of 134 operations per port against an independently calculated
BigInt oracle. These are authored modern-policy regressions, not additional
recorded COBOL evidence. A missing tool or failed build makes
this explicit command fail. Ordinary `npm test` retains optional-target skips
when a compiled target/runtime is unavailable; **skipped is not verified**.
Inspect target-availability messages as well as aggregate counts: a skipped
suite does not necessarily contribute to the runner's skipped-test total.

No Maven, Spring, EF Core, NuGet package, npm package, AI key, or Azure account
is required by the language examples. SDKs are toolchain requirements, not
application dependencies.

### Optional: install the Java modernization plugin

For a subsequent Java framework application, the [official CLI guide][java-cli]
documents:

```powershell
copilot plugin marketplace add microsoft/github-copilot-modernization
copilot plugin install github-copilot-modernization@github-copilot-modernization
copilot --agent=github-copilot-modernization:modernize
```

The plugin requires Node 22+ and an eligible Copilot plan/policy. Request
assessment and planning first. The documented execution workflow can create
commits and route tasks to other agents; review its scope and Git strategy
before execution. Installation is optional and changes user-level tooling.

For existing .NET applications, follow the [current .NET upgrade guide][dotnet-upgrade]
and its host-specific installation prerequisites. Its documented entry points
include `@Modernize` in Visual Studio and `@upgrade` in supported VS Code/CLI
configurations. Do not assume an agent is installed merely because its name
appears here. CardDemo already targets .NET 10; this is not a reason to run an
unnecessary framework upgrade.

## The runnable example: one contract, three independent ports

| Legacy responsibility | Node.js | Java | .NET |
| --- | --- | --- | --- |
| `main.cob`: menu and I/O | `src/main.js` | `src/Main.java` | `Program.cs` |
| `operations.cob`: credit/debit | `src/operations.js` | `src/Operations.java` | `Operations.cs` |
| `data.cob`: intended storage | `src/data.js` | `src/AccountStore.java` | `AccountStore.cs` |
| Numeric boundary | `src/money.js` | `src/Money.java` | `Money.cs` |

These paths are relative to `node-accounting-app/`, `java-accounting-app/`, and
`dotnet-accounting-app/`, respectively. Java and .NET do not shell out to Node
or COBOL. The harness in `parity/lib/targets.mjs` launches each real process.

All implementations use **integer cents**, preserve the `PIC 9(6)V99`
capacity, and reject rather than truncate invalid input. For example,
`Q-05` credits `999000.00` to the opening `1000.00`:

| Oracle policy | Required observation |
| --- | --- |
| Recorded COBOL | Reports a successful credit and a `0.00` balance |
| Existing modernized contract | Rejects the credit and keeps `1000.00` |

The new ports implement the existing **modernized** policy. They are not
bug-for-bug emulators. `--policy bug-for-bug` changes the comparison oracle,
not the application's behavior:

```powershell
node parity\cli.mjs verify --target java --policy bug-for-bug
node parity\cli.mjs verify --target dotnet --policy bug-for-bug
```

Expect differences; reconcile each failed scenario with the declared
`expectModern` change. A failure by itself does not establish intent or
business approval. Do not change `expectLegacy` or golden transcripts to make
a new language pass.

### Persistence is deliberately limited

Java and .NET store one unsigned integer-cent value followed by LF. Their
defaults are `build/java-account.cents` and `build/dotnet-account.cents`.
Reads accept an optional final LF, at most nine bytes, and no BOM or alternate
encoding. Unexpected input is rejected rather than silently decoded or reset.
`ACCOUNT_STORE` overrides the path, and the harness supplies a private path
per scenario, shared only by that scenario's process restarts.

Node's existing JSON-object store is a **different storage format**. Do not
point a Java/.NET port at it; incompatible or corrupt files are errors, not
an invitation to reset the opening balance.

Writes use a temporary sibling file and rename. This is a single-writer
teaching store: no concurrent transaction isolation, durable ledger, audit,
database migration, or crash/power-loss guarantee is claimed. Do not turn it
into a multi-user API by placing an HTTP endpoint in front of it.

## A practical AI-assisted migration path

1. **Inventory and trace.** List entry points, calls, copybooks, data stores,
   transactions, jobs, integrations, encodings, and runtime assumptions.
   Label unknown behavior instead of inventing requirements.
2. **Characterize.** Record happy, boundary, invalid, restart, and failure
   cases from the actual source runtime. Protect the legacy sources and
   recorded evidence in review and CI.
3. **Choose a policy.** Preserve business invariants; explicitly approve any
   change to a legacy defect, numeric rule, error response, or persistence
   behavior. The lab's choices are examples, not production approval.
4. **Replace one seam.** Give Copilot one module, its covered scenario IDs,
   the target language, and prohibited files. Keep pure operations separate
   from storage, HTTP, and platform adapters.
5. **Compare independently.** Rebuild the target, run the common oracle,
   and retain failures. Have a reviewer inspect uncovered paths as well as
   the machine-readable results.
6. **Add production capabilities separately.** Choose a transactional store,
   authentication/authorization, idempotency, audit, reconciliation, and a
   rollback design before introducing writes or routing production traffic.

For a real CICS/VSAM/Db2/IMS/MQ estate, a passing GnuCOBOL console lab is not
runtime compatibility evidence. Validate transaction and recovery semantics
on an authorized representative environment, and evaluate specialist
mainframe tooling where needed.

## Copy-paste AI tasks

Use [`port-java-dotnet.prompt.md`](../.github/prompts/port-java-dotnet.prompt.md)
in a supported prompt-file host, or paste its body into the CLI. Select the
repository's `migration-engineer` with `/agent` when appropriate.

```text
Target: java. Read spec/scenarios.json, the Q-05 golden transcript, the
findings register, and java-accounting-app/src/Operations.java.
Explain the strict invariants and the already-declared L-01 remediation.
Implement only a necessary change in the Java target, using integer cents.
Do not edit legacy sources, expectLegacy, golden files, or the Node target.
Build the Java target and run its parity gate. Report observed differences,
missing coverage, and whether fresh COBOL replay was possible.
```

For .NET, select `dotnet` and `dotnet-accounting-app/Operations.cs`. A useful
independent review task is:

```text
Compare the selected target with recorded behavior, not another port's code.
Inspect numeric widths, rounding, EOF, rejected operations, and restarts.
Distinguish regression from the existing declared expectModern changes.
Do not repair a failed test by editing its oracle.
```

## Current sources and version boundaries

| Item | Version/date | Source |
| --- | --- | --- |
| JDK 25 | GA 16 September 2025; LTS from most vendors | [OpenJDK release page][jdk] |
| Spring Boot | System-requirements page reported **4.1.1** on 7 September 2026; Java 17-26 | [Spring requirements][spring] |
| .NET 10 | GA 11 November 2025; LTS through 14 November 2028 | [.NET policy][dotnet-policy] |
| .NET policy | Updated 11 August 2026; .NET 8 support ends 10 November 2026 | [.NET policy][dotnet-policy] |
| Copilot modernization | Supported languages and availability reviewed 7 September 2026 | [Language scope][supported], [overview][overview] |
| Java CLI plugin | Setup and prerequisites reviewed 7 September 2026 | [Official CLI guide][java-cli] |
| .NET upgrade | Host-specific workflow reviewed 7 September 2026 | [Official upgrade guide][dotnet-upgrade] |

Use the current supported patch when adopting a framework. The plain Java
example does not establish Spring Boot compatibility or Java/.NET performance
equivalence.

[jdk]: https://openjdk.org/projects/jdk/25/
[spring]: https://docs.spring.io/spring-boot/system-requirements.html
[dotnet-policy]: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
[supported]: https://learn.microsoft.com/azure/developer/github-copilot-app-modernization/languages
[overview]: https://learn.microsoft.com/azure/developer/github-copilot-app-modernization/overview
[java-cli]: https://learn.microsoft.com/azure/developer/java/migration/github-copilot-app-modernization-for-java-copilot-cli
[dotnet-upgrade]: https://learn.microsoft.com/dotnet/core/porting/how-to-upgrade-with-github-copilot
