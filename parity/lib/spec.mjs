import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './targets.mjs';

export const SPEC_PATH = path.join(ROOT, 'spec', 'scenarios.json');
export const GOLDEN_DIR = path.join(ROOT, 'parity', 'golden');

export function loadSpec() {
  return JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
}

export function saveSpec(spec) {
  writeFileSync(SPEC_PATH, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
}

export function goldenPath(scenarioId, sessionIndex, sessionCount) {
  const suffix = sessionCount > 1 ? `.session${sessionIndex + 1}` : '';
  return path.join(GOLDEN_DIR, `${scenarioId}${suffix}.txt`);
}

/** All golden files a spec should produce, as absolute paths. */
export function expectedGoldenFiles(spec) {
  const files = [];
  for (const scenario of spec.scenarios) {
    const count = (scenario.sessions ?? [scenario.input]).length;
    for (let i = 0; i < count; i += 1) files.push(goldenPath(scenario.id, i, count));
  }
  return files;
}

/**
 * Which fact sequence a target is required to produce, and why.
 *
 * - The COBOL binary is always measured against the recorded legacy behaviour.
 * - A port under `bug-for-bug` must reproduce the legacy behaviour exactly,
 *   defects included.
 * - A port under `modernized` must still match legacy on `strict` scenarios
 *   (that is real business logic) but is expected to fix `quirk` scenarios.
 *
 * `mode` is returned explicitly rather than inferred from array identity by the
 * caller, and `remediates` compares by value: a quirk whose modern expectation
 * happens to equal the legacy one is not a behaviour change.
 */
export function expectedFacts(scenario, { targetId, policy }) {
  const legacy = scenario.expectLegacy;
  if (targetId === 'cobol' || policy === 'bug-for-bug') {
    return { facts: legacy, mode: 'legacy', remediates: false };
  }
  if (scenario.parity === 'quirk' && Array.isArray(scenario.expectModern)) {
    const differs = JSON.stringify(scenario.expectModern) !== JSON.stringify(legacy);
    return { facts: scenario.expectModern, mode: differs ? 'modern' : 'legacy', remediates: differs };
  }
  return { facts: legacy, mode: 'legacy', remediates: false };
}

export function selectScenarios(spec, filter) {
  if (filter === null || filter === undefined) return spec.scenarios;
  const wanted = filter
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value !== '');
  if (wanted.length === 0) throw new Error('--filter was given no usable value.');

  const selected = spec.scenarios.filter(
    (scenario) =>
      wanted.includes(scenario.id.toLowerCase()) ||
      (scenario.tags ?? []).some((tag) => wanted.includes(tag.toLowerCase())),
  );
  // Silently matching nothing would report "0/0 scenarios matched. Parity holds."
  if (selected.length === 0) {
    throw new Error(`--filter '${filter}' matched no scenario id or tag. Try 'npm run parity:list'.`);
  }
  return selected;
}

/**
 * Give a scenario its own private data directory.
 *
 * The COBOL programs keep the balance in WORKING-STORAGE and ignore this, but
 * any port with durable storage would otherwise leak state between scenarios
 * and make results order-dependent.
 *
 * This must be awaited: deleting the directory while the child process is still
 * running would race with its writes.
 */
export async function withIsolatedStore(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'parity-'));
  try {
    return await fn({ ACCOUNT_STORE: path.join(dir, 'account.json') });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
