/**
 * Integration tests: replay the recorded legacy behaviour against both targets.
 *
 * These are the tests that actually protect the migration. The unit tests check
 * the new code in isolation; this file checks it against what the COBOL system
 * demonstrably does.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { factsForScenario } from '../parity/lib/facts.mjs';
import { runScenario } from '../parity/lib/run.mjs';
import { TARGETS } from '../parity/lib/targets.mjs';
import { expectedFacts, loadSpec } from '../parity/lib/spec.mjs';

const spec = loadSpec();

async function factsFor(target, scenario) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'parity-test-'));
  try {
    const results = await runScenario(target, scenario, { ACCOUNT_STORE: path.join(dir, 'account.json') });
    return factsForScenario(results);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
});

describe('Node.js port matches the specification (modernized policy)', () => {
  const target = TARGETS.node;
  const unavailable = target.check();

  for (const scenario of spec.scenarios) {
    it(`${scenario.id} ${scenario.title}`, { skip: unavailable ?? false }, async () => {
      const actual = await factsFor(target, scenario);
      const expected = expectedFacts(scenario, { targetId: 'node', policy: 'modernized' });
      assert.deepEqual(actual, expected);
    });
  }
});

describe('legacy COBOL binary still matches its recorded golden master', () => {
  const target = TARGETS.cobol;
  // Skipped unless the binary has been built - see `npm run build:cobol`.
  const unavailable = target.check();

  for (const scenario of spec.scenarios) {
    it(`${scenario.id} ${scenario.title}`, { skip: unavailable ?? false }, async () => {
      const actual = await factsFor(target, scenario);
      assert.deepEqual(actual, scenario.expectLegacy);
    });
  }
});
