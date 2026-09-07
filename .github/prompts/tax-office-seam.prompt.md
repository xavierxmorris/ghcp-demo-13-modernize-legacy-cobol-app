---
description: 'Trace a taxation-relevant modernization task from original COBOL evidence to Java/.NET.'
mode: agent
---

# Taxation-office modernization seam

Use case: `${input:case:one evidence-map group or a specific recorded scenario}`.
Target: `${input:target:java or dotnet}`.

1. Read `AGENTS.md`, the taxation knowledgebase, `evidence-map.json`, the
   original COBOL, relevant golden transcripts, and applicable instructions.
2. Identify original source symbols, scenario IDs, actual recorded behavior,
   modern files, and the preserved/declared-remediation classification.
3. If the requested tax behavior is absent from original source/evidence,
   stop implementation and describe the evidence required. Do not invent it.
4. Change only the existing target port or necessary verification tooling.
   Do not introduce a separate tax engine or expected-output oracle.
5. Run `npm run tax:java` / `tax:dotnet`, or `tax:check` for both. Add
   `-- --docker` on Windows. Fresh original COBOL replay is mandatory.

Never infer tax law, claim ATO certification, add real taxpayer data, call ATO
services, post transactions, automatically refund credits, modify original
COBOL/golden evidence, or deploy resources.

Report the source-to-scenario-to-port trace, actual generated evidence,
declared differences, source URLs/dates, and unproven tax capabilities.
