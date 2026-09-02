# What this changes

<!-- One or two sentences. What behaviour is different afterwards? -->

## Evidence

<!-- Paste real output. A claim without output is not evidence. -->

```text
$ npm test

```

## Behaviour changes

<!--
Run this and paste the result. Every failure it prints is a legacy defect this
branch deliberately fixes:

    node parity/cli.mjs verify --target node --policy bug-for-bug

Anything in that list you did not intend to change is a regression.
Write "none" if this change is behaviour-preserving.
-->

| Finding | Legacy behaviour | New behaviour |
| --- | --- | --- |
|  |  |  |

## Checklist

- [ ] `npm test` passes
- [ ] The `.cob` files are unmodified
- [ ] `expectLegacy` and `parity/golden/` were regenerated with `npm run parity:record`, not hand-edited — or were not touched
- [ ] No parity scenario was made to pass by weakening the specification
- [ ] Money arithmetic is integer cents throughout
- [ ] New findings are written up in `docs/LEGACY-BEHAVIOR.md` with recorded evidence
