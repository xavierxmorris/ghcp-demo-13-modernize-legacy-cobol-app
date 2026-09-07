# Taxation-office modernization: start with original COBOL evidence

Reviewed: **7 September 2026**. This guide uses public Australian/ATO-style
process context, but the repository's original COBOL is a **generic accounting
sample**, not a taxation-office application. Nothing here implements tax law
or establishes ATO certification.

## The rule for every runnable example

```text
Original COBOL and source symbols
  -> recorded input/output scenario and golden transcript
  -> explicit preserved behavior or existing declared remediation
  -> the existing Java/.NET accounting implementation
  -> fresh replay and a traceable evidence report
```

The [evidence map](../examples/tax-office/evidence-map.json) partitions the
original 26 scenarios into five taxation-relevant engineering areas. It does
not contain another set of inputs or expected outputs. A guard rejects
invented scenario IDs, a changed original-source fingerprint, missing cases,
or another oracle hidden in the map.

On Windows, the easiest complete starting point is:

```powershell
npm run tax:check -- --docker
```

To focus on one language, use `tax:java` or `tax:dotnet` with the same
`-- --docker` option. Native Linux use needs GnuCOBOL plus the selected SDK;
modern-port-only success is not accepted as fresh original evidence.

## What can be demonstrated from the original source?

| Taxation-relevant area | Original source and cases | What the modern ports demonstrate | What must not be inferred |
| --- | --- | --- | --- |
| Account enquiry controls | `main.cob` selection 1, `operations.cob` TOTAL; `TC-1.1`, `TC-1.2` | Balance display and the established fact/format contract | Taxpayer identity, tax type, period, or an authorized tax-account view |
| Posting mechanics | CREDIT/DEBIT branches; `TC-2.*`, `TC-3.*`, `TC-5.1` | Same core movements/guards and the existing zero-movement remediation | A CREDIT is not automatically a tax receipt; it increases this generic balance |
| Amount representation | `AMOUNT`/`FINAL-BALANCE PIC 9(6)V99`; `Q-01`-`Q-06`, `Q-10`, `Q-12`-`Q-14` | Exact cents, explicit width/limit checks, and declared input remediations | The sample's ceiling or rounding choice is not a statutory rule |
| Batch/operator lifecycle | `USER-CHOICE`, `ACCEPT`, exit loop; `TC-4.1`, `Q-07`-`Q-09` | Controlled EOF/exit and input handling instead of runaway output | A real tax batch protocol, scheduler, retry checkpoint, or message contract |
| State and data boundaries | WORKING-STORAGE, READ/WRITE calls; `TC-5.2`, `Q-11`, `L-10` probe | Within-process state and the declared modern persistence behavior | A concurrent ledger, VSAM locking, CICS unit of work, or durable receipt deduplication |

The exact IDs and source/target files live in the executable map rather than
in duplicated examples. [`examples/tax-office/README.md`](../examples/tax-office/README.md)
explains the gate and generated report.

## What is better and easier to do first?

These are relative engineering judgments, not guaranteed schedules or costs.

1. **An evidence-backed enquiry seam.** Keep the current system authoritative;
   expose only a small, correctly mapped view. In this lab, start with
   `TAX-ENQUIRY`, not a fabricated multi-taxpayer API.
2. **Numeric and boundary behavior already covered by original recordings.**
   Work through `TAX-AMOUNTS` before adding frameworks or persistence features.
3. **Lifecycle and storage seams.** Use the existing EOF/restart recordings and
   the assertion-backed `L-10` probe to challenge the documented architecture.
4. **An isolated replacement under the same oracle.** Compile the existing
   Java or .NET target and compare the same original inputs.
5. **New tax capabilities only after evidence acquisition.** Obtain approved
   tax-specific source, copybooks, interfaces, sample data, and observations
   before claiming a migrated payment, refund, or assessment workflow.

Choose the language already supported by the delivery/operations team. Java 25
is the JVM target here; .NET 10 fits the companion CardDemo implementation.
The lab compares both to support a decision. It does not recommend maintaining
two independently writable production tax ledgers.

## Modernization paths

| Path | When it is attractive | Evidence and caution |
| --- | --- | --- |
| Retain and wrap | A stable original rule or enquiry can be exposed safely | Keep legacy behavior authoritative; define exact type, authorization, timeout, and error contracts |
| Incrementally replace | A bounded capability has original recordings and clear dependencies | Use adapter/Strangler Fig boundaries; validate a complete vertical slice, not just one source file |
| Rehost with a compatible runtime | Source retention is preferable to extensive rewriting | Evaluate dialect, data, CICS/IMS/VSAM, batch, licensing, and recovery with a representative proof of concept |
| Broad rewrite | Only with a strong business case and sufficient evidence | Do not use fluent AI output as a substitute for unrecorded behavior or tax-policy decisions |

Microsoft describes incremental integration and Strangler Fig approaches [K4].
Its Raincode reference [K5] illustrates a commercial .NET rehosting option,
not proof that this GnuCOBOL sample or a whole taxation estate will move
unchanged. Product/version support claims require separate verification.

## Common issues: diagnosis, mitigation, and proof

| Issue | How to overcome it | Evidence boundary |
| --- | --- | --- |
| Opposite debit/credit sign conventions | Trace the original field meaning before mapping it to amount owed, credit, or refund state | This original balance is unsigned; an actual tax liability mapping is not supplied |
| Silent overflow or sign loss | Reproduce the original behavior, retain its evidence, and make any remediation explicit | `L-01`, `L-02`, `Q-01`, `Q-02`, `Q-05`; use the existing `expectModern`, not a new tax rule |
| Truncation, sub-cent input, or wrong field width | Trace `PIC`, sign, scale, receiving width, and compiler options; use exact cents here | `L-03`-`L-06`, `Q-03`, `Q-04`, `Q-06`, `Q-10`, `Q-13`, `Q-14` |
| Cosmetic output hides behavioral drift | Compare the original stdout with its golden file, and compare modern normalized facts separately | The evidence gate makes both checks; modern output is not claimed byte-identical |
| EOF makes unattended execution loop forever | Use byte caps/timeouts in the harness and an explicit modern EOF outcome | `L-07`, `Q-07`; do not silently skip a killed or unavailable reference |
| A diagram invents a functioning data tier | Trace calls and execute a targeted probe, rather than trusting filenames | `L-10`: DataProgram is called but neither branch matches; the hardened probe now asserts its observations |
| State disappears on restart | Compare separate process sessions; distinguish original RAM state from declared persistence remediation | `Q-11`; the modern single-writer file is still not a transactional ledger |
| Runtime helpers silently change encoding | Specify the interchange contract and decode it explicitly | M-01 below is an actual Java/.NET port-hardening discrepancy, not a new COBOL observation |
| Character offsets are applied to binary copybooks | Define byte layout, code page, numeric representation, and bounds before decoding | [K6]; no EBCDIC/COMP-3 taxation parser is demonstrated here |
| Linkage lengths, `REDEFINES`, or occurrence counts are guessed | Trace caller/callee layouts and all supported variants; test invalid sizes | `L-10` supports the linkage lesson; real additional layouts require new authorized evidence |
| Retry, duplicate, reversal, or partial-batch semantics are invented | Obtain the original receipt/transaction protocol and failure/recovery observations first | These capabilities are absent from the original sample and remain unproven |
| Processed date, effective date, period, and cutoff are collapsed | Preserve distinct meanings and use an approved timezone/calendar policy | Public ATO enquiry context [K1]; no date policy is encoded in this program |
| A green port is mistaken for business approval | Classify preserved facts versus existing remediations, then review tax-domain meaning separately | The report names each classification; it does not approve statutory behavior |
| Raw identifiers leak into tooling | Use authorized synthetic fixtures and restricted, purpose-specific logs | Do not add real TFNs, ABNs, PRNs, bank details, or private knowledgebase material |

### M-01: a real encoding discrepancy in the modern codebase

The managed accounting stores were intended to use the same tiny UTF-8
integer-cent format. A probe wrote UTF-8-BOM and UTF-16LE-BOM versions of
`100000` plus LF. Java rejected them, while .NET returned `balance:1000.00`.

The cause is documented: `File.ReadAllText(path, encoding)` also detects
encoding from BOMs [K7]. Supplying a UTF-8 encoding was not a strict UTF-8
boundary.

Both modern stores now enforce their existing nine-byte format with a
ten-byte bounded read, explicit decoding, and no BOM/alternate-encoding
fallback. Regressions cover short BOM files, invalid UTF-8, oversized files,
and the largest valid value. Java uses `readNBytes` [K8]; .NET uses
`ReadAtLeast` [K9]. Invalid files are not rewritten or reset.

This hardens the **modern persistence implementation** associated with the
existing restart remediation; it does not invent a legacy tax-file rule.
The original 26 recorded facts and COBOL sources remain unchanged. Real
interchange files may legitimately use a different declared encoding, which
needs its own approved converter and evidence.

## Tax-specific evidence gaps: do not present these as working ports

Public ATO guidance explains account sequence numbers and processed/effective
dates [K1], account-specific PRNs [K2], and circumstances in which credits are
offset rather than refunded [K3]. Those facts are context, **not executable
specifications for this repository**.

| Desired tax use case | What must be obtained from the original system before implementation |
| --- | --- |
| Multi-account taxpayer enquiry | Identity/authorization model, account/tax-type/branch/period mapping, source fields, and captured enquiry outcomes |
| Receipt matching and duplicate handling | Actual reference mappings, source event keys, duplicate/conflict policy, and replay/failure observations |
| Payment reversal or reconciliation | Original links, ordering rules, batch controls, partial-failure behavior, and ledger transaction semantics |
| Refund or offset workflow | Current authorized policy, holds/debts/account relationships, original decisions and reasons, and payment controls |
| Assessment, interest, or debt collection | Versioned rules and legal basis, effective dates, approved calculations, historical examples, and domain review |
| CICS/VSAM/Db2/IMS/MQ replacement | Representative platform behavior, commit/locking/recovery semantics, interfaces, operational objectives, and cutover evidence |

A CREDIT in this original program increases the balance. Do not simply call
it a tax payment reducing debt. Likewise, a credit balance is not authority
to issue a refund. Those domain mappings are precisely what needs evidence.

## Safe AI workflow

Use [tax-office-seam.prompt.md](../.github/prompts/tax-office-seam.prompt.md).
Require the agent to identify the original source symbol, scenario ID, golden
transcript, modern file, and intended classification before editing code.
If a tax feature has no original source or recorded case, report it as a gap;
do not manufacture a tax implementation and call it migrated.

Run `tax:java`, `tax:dotnet`, or `tax:check` with `-- --docker` when needed.
Inspect the report under `build/tax-office/`. The report is written only after
fresh original replay, modern comparisons, and stable-input checks succeed.
It records facts and provenance, not tax compliance or production readiness.

## Public sources and currency

Sources were checked on **7 September 2026**. No publication/update date is
invented where the retrieved page did not expose one.

| ID | Source | Version/date boundary |
| --- | --- | --- |
| K1 | [ATO: Tax accounts][K1] | Live process guidance; update date not exposed in retrieved text |
| K2 | [ATO: Other payment details][K2] | Live account-specific PRN guidance; no payment-fee rules implemented |
| K3 | [ATO: Offsetting][K3] | Live process context, not an implemented refund/offset policy |
| K4 | [Microsoft: mainframe modernization with Logic Apps][K4] | Architecture guidance; no Logic Apps deployment performed |
| K5 | [Microsoft: Raincode reference architecture][K5] | Commercial rehosting example, not a tested product-version claim |
| K6 | [Microsoft: data type conversion planning][K6] | Host Integration Server mapping guidance |
| K7 | [.NET File.ReadAllText][K7] | .NET 10 API, including BOM detection |
| K8 | [Java InputStream.readNBytes][K8] | Java SE 25 API; available since Java 11 |
| K9 | [.NET Stream.ReadAtLeast][K9] | .NET 10 API |

The [ATO DSP operational framework portal](https://softwaredevelopers.ato.gov.au/operational_framework)
timed out during retrieval. This guide does not enumerate its current
requirements or claim compliance. Confirm current onboarding/security
requirements directly before any real integration.

[K1]: https://www.ato.gov.au/tax-and-super-professionals/digital-services/online-services-for-agents/online-services-for-agents-user-guide/accounts-and-payments/tax-accounts
[K2]: https://www.ato.gov.au/individuals-and-families/paying-the-ato/how-to-pay/other-payment-details
[K3]: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/bas-and-gst-tips/bas-refund/offsetting
[K4]: https://learn.microsoft.com/azure/logic-apps/mainframe-modernization-overview
[K5]: https://learn.microsoft.com/azure/architecture/reference-architectures/app-modernization/raincode-reference-architecture
[K6]: https://learn.microsoft.com/host-integration-server/core/data-type-conversion-planning-1
[K7]: https://learn.microsoft.com/dotnet/api/system.io.file.readalltext?view=net-10.0
[K8]: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/InputStream.html#readNBytes(int)
[K9]: https://learn.microsoft.com/dotnet/api/system.io.stream.readatleast?view=net-10.0
