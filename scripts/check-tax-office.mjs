import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEvidence, MAP_PATH, PORT_FILES, textHash } from '../examples/tax-office/evidence.mjs';
import { factsForScenario } from '../parity/lib/facts.mjs';
import { exitedCleanly, runScenario } from '../parity/lib/run.mjs';
import { expectedFacts, expectedGoldenFiles, goldenPath, SPEC_PATH, withIsolatedStore } from '../parity/lib/spec.mjs';
import { ROOT, TARGETS } from '../parity/lib/targets.mjs';
import { buildDotnet, buildJava, run } from './lib/build.mjs';

const [selected = 'all', ...extra] = process.argv.slice(2);
if (!['all', 'java', 'dotnet'].includes(selected) || extra.length > 1
    || (extra.length === 1 && extra[0] !== '--docker')) {
  throw new Error('Usage: node scripts/check-tax-office.mjs [all|java|dotnet] [--docker]');
}
const ids = selected === 'all' ? ['java', 'dotnet'] : [selected];

function version(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message ?? result.stderr}`);
  }
  return (result.stdout + result.stderr).trim().split(/\r?\n/)[0];
}

async function check() {
  const outputDirectory = path.join(ROOT, 'build', 'tax-office');
  mkdirSync(outputDirectory, { recursive: true });
  const reportPath = path.join(outputDirectory, `evidence-${ids.join('-')}.json`);
  rmSync(reportPath, { force: true });
  if (extra.includes('--docker')) {
    run('docker', ['build', '--load', '--platform', 'linux/amd64', '--file', path.join(ROOT, 'scripts', 'Dockerfile.modern'),
      '--tag', 'cobol-modernization:local', ROOT]);
    run('docker', ['run', '--rm', '--platform', 'linux/amd64', '--mount', `type=bind,source=${ROOT},target=/work`,
      '--workdir', '/work', 'cobol-modernization:local', 'node', 'scripts/check-tax-office.mjs', selected]);
    return;
  }
  if (process.platform !== 'linux') {
    throw new Error('Fresh original COBOL replay uses the Linux toolchain. Add --docker; no recorded-only fallback is accepted.');
  }
  if (process.env.COBOL_BIN !== undefined) {
    throw new Error('Unset COBOL_BIN: this gate must execute the original binary it builds, not an external override.');
  }

  const { map, spec } = loadEvidence();
  const inputs = [MAP_PATH, SPEC_PATH, ...map.sources.map((source) => path.join(ROOT, source.path)),
    path.join(ROOT, 'scripts', 'build-cobol.sh'), path.join(ROOT, 'scripts', 'probes', 'data-cob-is-dead-code.sh'),
    ...expectedGoldenFiles(spec), ...ids.flatMap((id) => PORT_FILES[id].map((file) => path.join(ROOT, file)))];
  const snapshot = () => Object.fromEntries(inputs.map((file) => [path.relative(ROOT, file), textHash(file)]));
  const before = snapshot();

  run('bash', ['scripts/build-cobol.sh']);
  run('bash', ['scripts/probes/data-cob-is-dead-code.sh']);
  run(process.execPath, ['--test', 'tests/tax-office.test.mjs']);
  for (const id of ids) {
    if (id === 'java') buildJava(path.join(ROOT, 'java-accounting-app', 'src'), path.join(ROOT, 'build', 'java'));
    else buildDotnet(path.join(ROOT, 'dotnet-accounting-app', 'Accounting.csproj'), path.join(ROOT, 'build', 'dotnet'));
    const problem = TARGETS[id].check();
    if (problem) throw new Error(problem);
  }

  const report = {
    version: 1,
    evidence: 'fresh-original-cobol-replay',
    baselineCommit: map.baselineCommit,
    createdAt: new Date().toISOString(),
    policy: 'modernized',
    compiler: version('cobc', ['--version']),
    runtimes: Object.fromEntries(ids.map((id) => [id, version(id === 'java' ? 'java' : 'dotnet', ['--version'])])),
    inputSha256Lf: before,
    scope: map.scope,
    unprovenTaxCapabilities: map.unprovenTaxCapabilities,
    scenarios: [],
  };

  for (const scenario of spec.scenarios) {
    const legacy = await withIsolatedStore((env) => runScenario(TARGETS.cobol, scenario, env));
    assert.ok(legacy.every((result) => exitedCleanly(result) || result.killedByHarness), `${scenario.id}: unhealthy legacy process`);
    const legacyFacts = factsForScenario(legacy);
    assert.deepEqual(legacyFacts, scenario.expectLegacy, `${scenario.id}: original COBOL no longer matches recorded facts`);
    const goldenFiles = legacy.map((result, index) => {
      const file = goldenPath(scenario.id, index, legacy.length);
      assert.equal(result.stdout, readFileSync(file, 'utf8'), `${scenario.id}: original stdout differs from the golden transcript`);
      return path.relative(ROOT, file);
    });
    const comparison = {
      id: scenario.id,
      group: map.groups.find((group) => group.scenarioIds.includes(scenario.id)).id,
      finding: scenario.finding ?? null,
      goldenFiles,
      byteExactLegacy: true,
      legacyFacts,
      targets: {},
    };
    for (const id of ids) {
      const results = await withIsolatedStore((env) => runScenario(TARGETS[id], scenario, env));
      assert.ok(results.every(exitedCleanly), `${scenario.id}: ${id} did not exit cleanly`);
      const actual = factsForScenario(results);
      const expected = expectedFacts(scenario, { targetId: id, policy: 'modernized' });
      assert.deepEqual(actual, expected.facts, `${scenario.id}: ${id} differs from the existing recorded/declared contract`);
      comparison.targets[id] = {
        facts: actual,
        classification: expected.remediates ? 'existing-declared-remediation' : 'preserved-normalized-facts',
      };
    }
    report.scenarios.push(comparison);
    console.log(`PASS ${scenario.id}: original COBOL bytes + ${ids.join('/')} policy facts`);
  }
  assert.deepEqual(snapshot(), before, 'source or evidence changed during the run; no report will be written');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`PASS: ${report.scenarios.length} original COBOL scenarios traced to ${ids.join('/')}.`);
  console.log(`Evidence: ${path.relative(ROOT, reportPath)}`);
}

await check();
