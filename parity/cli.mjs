#!/usr/bin/env node
/**
 * Golden-master parity harness.
 *
 *   node parity/cli.mjs list
 *   node parity/cli.mjs record --target cobol
 *   node parity/cli.mjs verify --target cobol
 *   node parity/cli.mjs verify --target node --policy modernized
 *
 * `record` captures what the legacy system actually does. `verify` proves a
 * port still does it. Nothing here asks a model to judge equivalence: the
 * comparison is a byte diff and a string-array diff.
 */
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { factsForScenario } from './lib/facts.mjs';
import { runScenario } from './lib/run.mjs';
import { resolveTarget, ROOT } from './lib/targets.mjs';
import { GOLDEN_DIR, expectedFacts, goldenPath, loadSpec, saveSpec, selectScenarios } from './lib/spec.mjs';

/**
 * Give each scenario its own private data directory.
 *
 * The COBOL programs keep the balance in WORKING-STORAGE and ignore this, but
 * any port with durable storage would otherwise leak state between scenarios
 * and make results order-dependent.
 */
function withIsolatedStore(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'parity-'));
  try {
    return fn({ ACCOUNT_STORE: path.join(dir, 'account.json') });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const [command = 'verify', ...rest] = argv;
  const options = { target: 'cobol', policy: 'modernized', filter: null, strict: false, verbose: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--target') options.target = rest[++i];
    else if (arg === '--policy') options.policy = rest[++i];
    else if (arg === '--filter') options.filter = rest[++i];
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else throw new Error(`Unrecognised argument: ${arg}`);
  }
  if (!['bug-for-bug', 'modernized'].includes(options.policy)) {
    throw new Error(`--policy must be 'bug-for-bug' or 'modernized', got '${options.policy}'`);
  }
  return { command, options };
}

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';
const colour = process.env.NO_COLOR ? (_, text) => text : (code, text) => `${code}${text}${RESET}`;

function diffFacts(expected = [], actual = []) {
  const lines = [];
  const length = Math.max(expected.length, actual.length);
  for (let i = 0; i < length; i += 1) {
    const want = expected[i];
    const got = actual[i];
    if (want === got) lines.push(`    ${colour(DIM, `  ${i}: ${want}`)}`);
    else {
      if (want !== undefined) lines.push(`    ${colour(RED, `- ${i}: ${want}`)}`);
      if (got !== undefined) lines.push(`    ${colour(GREEN, `+ ${i}: ${got}`)}`);
    }
  }
  return lines.join('\n');
}

async function commandList() {
  const spec = loadSpec();
  const widest = Math.max(...spec.scenarios.map((s) => s.id.length));
  for (const scenario of spec.scenarios) {
    const level = scenario.parity === 'quirk' ? colour(YELLOW, 'quirk ') : colour(DIM, 'strict');
    const finding = scenario.finding ? colour(DIM, ` [${scenario.finding}]`) : '';
    console.log(`${scenario.id.padEnd(widest)}  ${level}  ${scenario.title}${finding}`);
  }
  console.log(`\n${spec.scenarios.length} scenarios.`);
  return 0;
}

async function commandRecord(options) {
  if (options.target !== 'cobol') {
    throw new Error('Only the COBOL target may be recorded. The legacy system defines the golden master.');
  }
  const target = resolveTarget('cobol');
  const problem = target.check();
  if (problem) {
    console.error(colour(RED, problem));
    return 1;
  }

  const spec = loadSpec();
  mkdirSync(GOLDEN_DIR, { recursive: true });

  for (const scenario of selectScenarios(spec, options.filter)) {
    const results = await withIsolatedStore((env) => runScenario(target, scenario, env));
    results.forEach((result, index) => {
      writeFileSync(goldenPath(scenario.id, index, results.length), result.stdout, 'utf8');
    });
    scenario.expectLegacy = factsForScenario(results);
    console.log(`${colour(GREEN, 'recorded')} ${scenario.id}  ${scenario.expectLegacy.join(' | ')}`);
  }

  saveSpec(spec);
  console.log(`\nGolden master written to ${path.relative(ROOT, GOLDEN_DIR)} and spec/scenarios.json.`);
  return 0;
}

async function commandVerify(options) {
  const target = resolveTarget(options.target);
  const problem = target.check();
  if (problem) {
    console.error(colour(RED, problem));
    return 1;
  }

  const spec = loadSpec();
  const scenarios = selectScenarios(spec, options.filter);
  const missingBaseline = scenarios.filter((scenario) => !scenario.expectLegacy);
  if (missingBaseline.length > 0) {
    console.error(colour(RED, `No recorded baseline for: ${missingBaseline.map((s) => s.id).join(', ')}`));
    console.error("Run 'npm run parity:record' against the COBOL binary first.");
    return 1;
  }

  console.log(`Target : ${target.label}`);
  console.log(`Policy : ${options.policy}${options.target === 'cobol' ? colour(DIM, ' (ignored for the legacy target)') : ''}`);
  console.log(`Compare: facts${options.strict ? ' + byte-exact stdout' : ''}\n`);

  const failures = [];
  let remediated = 0;

  for (const scenario of scenarios) {
    const results = await withIsolatedStore((env) => runScenario(target, scenario, env));
    const actual = factsForScenario(results);
    const expected = expectedFacts(scenario, { targetId: target.id, policy: options.policy });
    const factsMatch = JSON.stringify(actual) === JSON.stringify(expected);

    let byteMatch = true;
    const byteProblems = [];
    if (options.strict) {
      results.forEach((result, index) => {
        const file = goldenPath(scenario.id, index, results.length);
        if (!existsSync(file)) {
          byteMatch = false;
          byteProblems.push(`missing golden file ${path.relative(ROOT, file)}`);
          return;
        }
        if (readFileSync(file, 'utf8') !== result.stdout) {
          byteMatch = false;
          byteProblems.push(`stdout differs from ${path.relative(ROOT, file)}`);
        }
      });
    }

    const passed = factsMatch && byteMatch;
    const isRemediation = scenario.parity === 'quirk' && expected !== scenario.expectLegacy;
    if (passed && isRemediation) remediated += 1;

    const badge = passed ? colour(GREEN, 'PASS') : colour(RED, 'FAIL');
    const tag = isRemediation ? colour(YELLOW, ' [remediated]') : '';
    console.log(`${badge} ${scenario.id.padEnd(7)} ${scenario.title}${tag}`);

    if (!passed) {
      failures.push(scenario.id);
      if (!factsMatch) {
        console.log(colour(DIM, '    expected vs actual facts:'));
        console.log(diffFacts(expected, actual));
      }
      for (const message of byteProblems) console.log(colour(RED, `    ${message}`));
      if (scenario.finding) console.log(colour(DIM, `    see docs/LEGACY-BEHAVIOR.md finding ${scenario.finding}`));
    } else if (options.verbose) {
      console.log(colour(DIM, `    ${actual.join(' | ')}`));
    }
  }

  console.log(
    `\n${scenarios.length - failures.length}/${scenarios.length} scenarios matched` +
      (remediated > 0 ? `, ${remediated} legacy defect(s) deliberately remediated` : '') +
      '.',
  );
  if (failures.length > 0) {
    console.log(colour(RED, `Parity broken: ${failures.join(', ')}`));
    return 1;
  }
  console.log(colour(GREEN, 'Parity holds.'));
  return 0;
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  switch (command) {
    case 'list':
      return commandList();
    case 'record':
      return commandRecord(options);
    case 'verify':
      return commandVerify(options);
    default:
      throw new Error(`Unknown command '${command}'. Expected list, record or verify.`);
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(colour(RED, error.message));
    process.exit(1);
  },
);
