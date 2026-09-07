# PROMPTS

The prompts that produce this workflow. The reusable ones are committed as prompt
files under [`.github/prompts/`](.github/prompts) — invoke them in a supported
VS Code extension-host session, or paste the body with explicit file context.
Current Agent Host sessions do not use prompt files. These are here so you can read what they do without opening
each file, and so the demo narration has something to point at.

---

## The anti-pattern, for contrast

Use this only in a disposable exercise clone if you want to assess a source-only
translation. Keep the legacy files and recorded evidence read-only:

```text
Convert main.cob, operations.cob and data.cob to a Node.js application.
```

A source-only translation may make these mistakes; measure the actual result
instead of promising that every model will reproduce them:

- use `balance += amount`, so it will not reproduce the overflow that destroys
  money (`L-01`) — an undeclared behaviour change;
- parse `-100.00` with `Number()`, so a negative credit will *debit* the account
  where the original *credits* it (`L-02`);
- build the three-tier data layer the README describes, which the original never
  actually had (`L-10`).

None of that is a model failure. The model was asked to translate a program it had no
way to observe.

---

## 1. Establish ground truth

Prompt file: [`/characterize-legacy`](.github/prompts/characterize-legacy.prompt.md)

```text
/characterize-legacy What happens when a credit would take the balance past the
six-digit limit of the field?
```

Runs the compiled binary, records the transcript, and writes the finding up. The rule
it enforces: **never assert legacy behaviour from reading the source.**

Good follow-ups, all of which found real defects:

```text
What does the program do when stdin ends without choosing Exit?
What happens if the amount has more characters than the field can hold?
Is the balance still there after a restart?
Does data.cob actually do anything?
```

---

## 2. Port a module

Prompt file: [`/port-module`](.github/prompts/port-module.prompt.md)

```text
/port-module operations.cob
```

Requires the agent to list which scenarios cover the module *before* writing code, and
gates on `npm run parity:node`.

---

## 3. Diagnose a red scenario

Prompt file: [`/triage-parity-failure`](.github/prompts/triage-parity-failure.prompt.md)

```text
/triage-parity-failure Q-05
```

Forces a classification — regression, undeclared remediation, vocabulary drift, or
stale baseline — before anything is changed. The rule it enforces: **a failing
scenario is diagnosed, never silenced by weakening the spec.**

---

## 4. Report honestly

Prompt file: [`/migration-status`](.github/prompts/migration-status.prompt.md)

```text
/migration-status
```

Asks for coverage *gaps* as well as passes. Uncharacterised behaviour is the real risk
in a migration and it is invisible in a green test run.

---

## The agents

Three, with different scopes. Handoffs are wired into the frontmatter.

```text
@legacy-archaeologist  Find out what data.cob actually does when it is called.
@migration-engineer    Port operations.cob, remediating L-01 and L-02.
@parity-auditor        Audit the migration on this branch.
```

The auditor is the interesting one to demo. Ask it:

```text
@parity-auditor Did this branch change any behaviour that was not declared?
```

It runs `--policy bug-for-bug` itself and cross-checks the failure list against what
the author claimed. That is a review question a human cannot answer by reading a diff.

---

## Delegating to the cloud agent

Open an issue with the [migration task template](.github/ISSUE_TEMPLATE/migration-task.yml)
and assign it to Copilot. It works because
[`copilot-setup-steps.yml`](.github/workflows/copilot-setup-steps.yml) installs
GnuCOBOL into the agent's environment — so it can compile and *run* the legacy system,
not just read it.

Without that file, the agent is reduced to reasoning about COBOL it cannot execute,
which is the exact failure this repository exists to prevent.
