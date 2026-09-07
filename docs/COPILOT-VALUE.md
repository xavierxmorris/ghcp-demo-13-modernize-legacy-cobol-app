# What GitHub Copilot adds to COBOL modernization

Reviewed: **7 September 2026**.

The value in this lab is **assisted engineering with traceable results**,
not an assertion that AI can safely translate a mainframe estate in one step.
You can run the supplied programs and comparison gates without Copilot.
Copilot becomes useful when you investigate, change, or extend the work.

## Separate the responsibilities

| Responsibility | Owner | Concrete artifact |
| --- | --- | --- |
| Define existing behavior | Original program and recorded observations | `main.cob`, `operations.cob`, `data.cob`, scenarios and golden transcripts |
| Propose an explanation, case, or code change | Engineer assisted by Copilot or another coding agent | Source citations, a proposed scenario, a scoped diff |
| Execute and compare | Compiler, runtime, and deterministic tooling | Build output, exit status, fact/byte differences, evidence report |
| Approve business meaning and deliberate change | Accountable engineers and domain owners | Reviewed requirements, declared remediation, acceptance decision |

An AI-written test is not automatically a trustworthy oracle. Its expected
behavior must come from recorded execution or an explicitly approved new
requirement. Keep those origins visible.

## Tasks worth giving Copilot

| Task | A bounded request | What makes the result useful |
| --- | --- | --- |
| Trace a flow | Identify the source branches and calls used by `Q-05` | File/symbol references that a reviewer can inspect |
| Characterize an edge case | Propose an input, then record what the original binary does | Reproducible observations rather than a source-only guess |
| Port one capability | Implement the existing `expectModern` contract in Java or .NET | A narrow change with original behavior and declared differences visible |
| Diagnose a failure | Classify regression, declared remediation, vocabulary drift, or environment failure | A specific cause and a reproducible fix, not a weakened test |
| Maintain the engineering workflow | Align commands, instructions, source mappings, and CI | The same work can be repeated locally and by a coding agent |

The [migration playbook](MIGRATION-PLAYBOOK.md), [agent profiles](../.github/agents),
and [prompts](../PROMPTS.md) package these tasks so each request does not have
to reconstruct the entire project context.

## Two examples from this lab

### Preserve the evidence before improving the behavior

The original overflow case `Q-05` reports a successful credit and a `0.00`
balance. The existing modernized contract rejects that credit and retains
`1000.00`. Copilot can help trace and implement the change, but it cannot
silently redefine the original observation or authorize a new financial rule.

Run:

```powershell
npm run verify:modern -- --docker
```

The report records the original result, modern result, source hashes, and
whether the difference matches an existing declared remediation.

### Resolve a cross-language edge case with current documentation

The .NET store accepted BOM-marked UTF-16 input while Java rejected it.
Investigation of the documented `File.ReadAllText` behavior explained the
implicit encoding detection. The focused fix made both stores enforce their
declared format with bounded reads and explicit decoding.

This illustrates a useful AI-assisted loop: form a hypothesis, consult the
relevant SDK reference, reproduce the discrepancy, implement a small fix,
and keep a regression case. See [M-01](TAX-OFFICE-KNOWLEDGEBASE.md#m-01-a-real-encoding-discrepancy-in-the-modern-codebase).
It does not demonstrate automatic tax-law interpretation or full data migration.

## The role of each repository

| Lab | Engineering decision | Copilot contribution |
| --- | --- | --- |
| [COBOL/C interoperability](https://github.com/xavierxmorris/ghcp-demo-12-cobol-c-interop) | Retain COBOL ownership behind an explicit ABI | Help trace ownership, review widths/lifetimes, and draft boundary cases |
| [This Java/.NET/Node lab](../README.md) | Replace bounded behavior under an original-source oracle | Help characterize, implement, diagnose, and document declared changes |
| [CardDemo](https://github.com/xavierxmorris/azure-mainframe-modernization-carddemo) | Expose a read-only seam over mainframe-shaped data | Help trace copybook mappings, preserve masking, and develop reviewed application/infrastructure changes |

GnuCOBOL's generated C is compiler output, not an AI-authored maintained
replacement. The CardDemo read-only slice is not full CICS transaction parity.
These distinctions keep the learning path honest.

## Coding assistance versus modernization tooling

General Copilot coding assistance can help author and investigate a bounded
COBOL migration task using repository context and tools.

The documented **GitHub Copilot modernization** experience separately supports
upgrading existing Java/.NET runtimes/frameworks and supported migration
scenarios. Its supported-language documentation does not establish a direct
COBOL-to-Java/C# conversion guarantee. Use the appropriate upgrade tooling
after the supported application/build project exists.

Current references:

- [GitHub: modernizing Java applications](https://docs.github.com/en/copilot/tutorials/modernize-java-applications)
- [Microsoft: supported modernization languages and frameworks](https://learn.microsoft.com/azure/developer/github-copilot-app-modernization/languages)
- [Microsoft: .NET upgrade workflow](https://learn.microsoft.com/dotnet/core/porting/how-to-upgrade-with-github-copilot)

These references were reviewed on the date above. The lab targets Java 25 and
.NET 10; the [setup guide](JAVA-DOTNET-MODERNIZATION.md) records version and
support sources.

## Measure value without inventing a benchmark

For an actual engagement, record time spent, cases covered, unexplained
differences, defects found, review effort, and operational outcomes. Compare
like-for-like tasks and include the cost of investigation and corrections.

This repository demonstrates a workflow and its artifacts. It does not supply
a controlled productivity benchmark, a percentage saving, proof that one model
is superior, or permission to omit business/security review.
