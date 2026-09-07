/**
 * Integration tests: replay the recorded legacy behaviour against both targets.
 *
 * These are the tests that actually protect the migration. The unit tests check
 * the new code in isolation; this file checks it against what the COBOL system
 * demonstrably does.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { factsForScenario } from '../parity/lib/facts.mjs';
import { exitedCleanly, runScenario } from '../parity/lib/run.mjs';
import { TARGETS } from '../parity/lib/targets.mjs';
import { expectedFacts, expectedGoldenFiles, GOLDEN_DIR, loadSpec, withIsolatedStore } from '../parity/lib/spec.mjs';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const spec = loadSpec();

async function runIsolated(target, scenario) {
  return withIsolatedStore((env) => runScenario(target, scenario, env));
}

describe('spec integrity', () => {
  it('every scenario has a recorded legacy baseline', () => {
    const missing = spec.scenarios.filter((scenario) => !Array.isArray(scenario.expectLegacy));
    assert.deepEqual(missing.map((s) => s.id), [], 'run `npm run parity:record` against the COBOL binary');
  });

  it('every quirk scenario names the finding it documents and states a modern expectation', () => {
    for (const scenario of spec.scenarios.filter((s) => s.parity === 'quirk')) {
      assert.ok(scenario.finding, `${scenario.id} is a quirk but names no finding`);
      assert.ok(Array.isArray(scenario.expectModern), `${scenario.id} is a quirk but has no expectModern`);
    }
  });

  it('scenario ids are unique', () => {
    const ids = spec.scenarios.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('the golden file set matches the specification exactly', () => {
    const expected = expectedGoldenFiles(spec);
    const missing = expected.filter((file) => !existsSync(file));
    assert.deepEqual(missing, [], 'golden files named by the spec are missing');

    // An orphan golden file means a scenario was renamed or removed without
    // re-recording, leaving stale evidence in the repository.
    const wanted = new Set(expected.map((file) => path.basename(file)));
    const orphans = readdirSync(GOLDEN_DIR)
      .filter((name) => name.endsWith('.txt'))
      .filter((name) => !wanted.has(name));
    assert.deepEqual(orphans, [], 'golden files exist that no scenario accounts for');
  });
});

for (const target of [TARGETS.node, TARGETS.java, TARGETS.dotnet]) {
  describe(`${target.label} matches the specification (modernized policy)`, () => {
    const unavailable = target.check();

    for (const scenario of spec.scenarios) {
      it(`${scenario.id} ${scenario.title}`, { skip: unavailable ?? false }, async () => {
        const results = await runIsolated(target, scenario);
        for (const [index, result] of results.entries()) {
          assert.ok(
            exitedCleanly(result) || result.killedByHarness,
            `session ${index + 1} exited with status ${result.code} / signal ${result.signal}: ${result.stderr}`,
          );
        }
        const { facts: expected } = expectedFacts(scenario, { targetId: target.id, policy: 'modernized' });
        assert.deepEqual(factsForScenario(results), expected);
      });
    }
  });
}

describe('legacy COBOL binary still matches its recorded golden master', () => {
  const target = TARGETS.cobol;
  // Skipped unless the binary has been built - see `npm run build:cobol`.
  const unavailable = target.check();

  for (const scenario of spec.scenarios) {
    it(`${scenario.id} ${scenario.title}`, { skip: unavailable ?? false }, async () => {
      const results = await runIsolated(target, scenario);
      assert.deepEqual(factsForScenario(results), scenario.expectLegacy);
    });
  }
});
