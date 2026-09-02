---
description: 'Discover and record what the legacy COBOL system actually does with a given input, then write it up as a finding.'
mode: agent
---

# Characterise a legacy behaviour

You are adding empirical knowledge about the COBOL system. **Never assert legacy
behaviour from reading the source — record it.**

## Input

The behaviour to investigate: `${input:behaviour:e.g. what happens when a credit overflows the balance field}`

## Steps

1. Build the legacy binary if it is not already built:

   ```bash
   npm run build:cobol
   ```

   If GnuCOBOL is unavailable, stop and say so. Do not continue by reasoning about
   the source — that is exactly the failure mode this workflow exists to prevent.

2. Read [`spec/scenarios.json`](../../spec/scenarios.json) and check the behaviour is
   not already covered. Reuse an existing scenario id if it is.

3. Add a scenario. Choose `parity: "strict"` only if this is genuine business
   behaviour a port must preserve; choose `"quirk"` if it is an accident of the COBOL
   implementation. Give a quirk a `finding` id continuing the `L-NN` sequence in
   [`docs/LEGACY-BEHAVIOR.md`](../../docs/LEGACY-BEHAVIOR.md), and an `expectModern`
   fact list describing what a correct system should do instead.

   The input list must end with `"4"` so the program exits — the legacy binary never
   terminates on end of input.

4. Record the actual behaviour:

   ```bash
   npm run parity:record -- --filter <SCENARIO-ID>
   ```

5. Read the recorded `expectLegacy` and the transcript in `parity/golden/`. If the
   result surprises you, that is the interesting part — investigate *why* in terms of
   COBOL semantics (field widths, `PIC` clauses, missing `ON SIZE ERROR`, `ACCEPT`
   truncation).

6. Write the finding up in `docs/LEGACY-BEHAVIOR.md` using the existing format:
   severity, what happens, why, the evidence, and the impact if migrated blindly.

7. Confirm nothing else moved:

   ```bash
   npm test
   ```

## Output

Report the recorded fact sequence verbatim, the COBOL mechanism that explains it, and
whether it is a `strict` behaviour or a `quirk`. Quote the command output you relied
on. If you did not run the binary, say that the finding is unverified.
