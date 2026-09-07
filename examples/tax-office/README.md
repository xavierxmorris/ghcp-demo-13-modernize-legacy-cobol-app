# Original COBOL evidence for taxation-office modernization

This pack follows **original COBOL source -> recorded observation -> Java/.NET
implementation -> executable comparison**. It does not introduce another tax
application or another expected-output oracle.

The original source is a small generic account-management program, **not ATO
code or a tax-law implementation**. Taxation context explains why its controls
matter; it does not change the meaning of its balance or invent absent features.

## Run the complete evidence path

On Windows, with Node and Docker Desktop:

```powershell
npm run tax:check -- --docker
```

This builds the existing Linux/amd64 toolchain image and runs both modern
targets. For just one modern target:

```powershell
npm run tax:java -- --docker
npm run tax:dotnet -- --docker
```

On Linux with Node, GnuCOBOL, Bash/coreutils, and the selected SDK installed,
omit `--docker`. `tax:java` needs JDK 25; `tax:dotnet` needs .NET SDK 10.
Both still require the original COBOL compiler. There is **no recorded-only
fallback** in these commands and no acceptance of an external `COBOL_BIN`.

## What the gate actually does

1. Verify the original `main.cob`, `operations.cob`, and `data.cob` fingerprints.
   SHA-256 normalization changes CRLF to LF only.
2. Require the evidence map to cover every original recorded scenario exactly
   once, with no invented IDs or copied/new expectations.
3. Rebuild the original COBOL and run the assertion-backed `L-10` linkage and
   balance-owner probe. The probe instruments temporary copies, not originals.
4. Compile the selected **existing accounting port**, not a new taxation engine.
5. Run the same original input sessions through COBOL and Java/.NET using the
   existing bounded process runner.
6. Compare original COBOL facts and byte-exact stdout with the recorded golden
   transcripts. Compare the modern targets with the existing `modernized` policy.
7. Check that source and evidence inputs did not change during execution, then
   write a report. A failed run does not write a success report.

The original COBOL's 26 scenarios remain the source of truth. The map contains
only references, source/target paths, relevance, and limitations.

## Source-to-target trace

| Group | Original evidence | Modern implementation |
| --- | --- | --- |
| `TAX-ENQUIRY` | `MainProgram` selection 1; `Operations` TOTAL branch | Existing `Main`/`Program`, `Money`, and `AccountStore` |
| `TAX-MOVEMENTS` | CREDIT/DEBIT branches and insufficient-funds guard | Existing `Operations.credit/debit` / `Operations.Credit/Debit` |
| `TAX-AMOUNTS` | `PIC 9(6)V99`, `ACCEPT AMOUNT`, arithmetic and recorded quirks | Existing `Money` validation and operation bounds |
| `TAX-LIFECYCLE` | Menu width, EOF, exit, and recorded runaway behavior | Existing modern entry points |
| `TAX-STATE` | WORKING-STORAGE lifetime, READ/WRITE linkage, and restart scenario | Existing `AccountStore`; the already-declared persistence remediation |

Full scenario IDs, file paths, source symbols, and gaps are in
[`evidence-map.json`](evidence-map.json).

## Read the generated proof

The complete run writes:

```text
build/tax-office/evidence-java-dotnet.json
```

Single-target runs write `evidence-java.json` or `evidence-dotnet.json`.
Reports include source/evidence hashes, compiler/runtime versions, golden
transcript paths, actual legacy and target facts, and per-case classification:

- `preserved-normalized-facts`: no change in the existing fact contract.
- `existing-declared-remediation`: the target matches a previously declared
  `expectModern` difference, not a newly invented tax decision.

For example, `Q-05` records a credit overflow that returns a successful
`0.00` balance in COBOL. The existing modernized contract rejects it and retains
`1000.00`. The report shows both observations and cites `L-01`.

Modern formatting is not byte-identical to COBOL. The byte-exact comparison
applies to **fresh original COBOL versus its golden transcript**; modern
targets are compared by the established normalized facts and policy.

## What is not proven

The original has no taxpayer IDs, PRNs, multiple tax accounts, tax periods,
receipt IDs, idempotent payment posting, reversal protocol, refund eligibility,
offsetting, tax rates, or real CICS/VSAM transaction semantics. Those are
**evidence gaps**, not shipped modernization examples.

Do not reinterpret a legacy CREDIT as a payment reducing tax debt: this
program's CREDIT increases its generic balance. An actual tax-account mapping
needs authorized source, field meanings, and domain approval.

See the [taxation knowledgebase](../../docs/TAX-OFFICE-KNOWLEDGEBASE.md) for
easier migration paths, common pitfalls, public process context, and the
evidence needed to add a real taxation capability.
