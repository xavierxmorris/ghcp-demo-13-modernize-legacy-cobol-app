# AGENTS.md

Instructions for any coding agent working in this repository — Copilot cloud agent,
Copilot CLI, Copilot in the IDE, or another agent that reads `AGENTS.md`.

Repository-wide conventions live in [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
This file adds the operational rules an autonomous agent needs.

## Setup

```bash
sudo apt-get update && sudo apt-get install -y gnucobol3   # not `gnucobol`, see below
npm run build:cobol
npm test
```

There is no `npm install` step: the project has zero runtime and zero dev
dependencies. Node 20.11 or newer is required.

> The Ubuntu package is `gnucobol3` (GnuCOBOL 3.1.2) or `gnucobol4`. Plain
> `gnucobol` is a transitional package that pulls the 4.0 pre-release. Both compile
> this program to byte-identical behaviour, verified; CI pins `gnucobol3`.

In Copilot cloud agent sessions this is already done for you by
[`.github/workflows/copilot-setup-steps.yml`](.github/workflows/copilot-setup-steps.yml).

## Verification loop — run this before you claim anything works

```bash
npm test                 # baseline and available-target tests; inspect skips
npm run parity:node      # just the migration check, with a readable diff
```

`npm test` is the gate. It is fast (a few seconds). Run it after every change.

Java/.NET work additionally requires `npm run test:ports` (JDK 25 and .NET 10).
It rebuilds both ports and fails on unavailable tools rather than accepting a
skipped target. Use `scripts/Dockerfile.modern` or the modernization devcontainer
for all languages. See `docs/JAVA-DOTNET-MODERNIZATION.md`; preserve the original
Node track and never infer fresh COBOL execution from a port-only comparison.

## Hard rules

1. **Do not modify `main.cob`, `operations.cob` or `data.cob`.** They are the
   specification. If a task appears to require editing them, stop and say so.
2. **Do not hand-edit `expectLegacy` in `spec/scenarios.json`, or anything in
   `parity/golden/`.** Those are recorded output. Regenerate them with
   `npm run parity:record`, which requires the COBOL binary, and show the diff.
3. **Do not make a failing parity scenario pass by weakening the spec.** A red
   scenario is information. Diagnose it first.
4. **Do not introduce dependencies.** If you believe one is genuinely required,
   propose it and explain what it replaces.
5. **Do not use floating point for money.** Integer cents only.

## Adding knowledge about the legacy system

Claims about COBOL behaviour must be empirical:

1. Add a scenario to `spec/scenarios.json` with the input you want to understand.
2. Run `npm run parity:record -- --filter <ID>` against the built binary.
3. Read the recorded `expectLegacy` and the golden transcript.
4. Only then write it up in `docs/LEGACY-BEHAVIOR.md` with a finding id.

If you cannot compile the COBOL in your environment, say that the claim is
unverified rather than asserting it.

## Reporting

When you finish, state explicitly:

- which scenarios changed status, and why;
- whether any change was a **regression** or a **deliberate remediation**;
- the exact command output you used as evidence.

Do not report success on the basis of code that was never executed.
