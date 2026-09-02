import { readFileSync, writeFileSync } from 'node:fs';
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

/**
 * Which fact sequence a target is required to produce.
 *
 * - The COBOL binary is always measured against the recorded legacy behaviour.
 * - A port under `bug-for-bug` must reproduce the legacy behaviour exactly,
 *   defects included.
 * - A port under `modernized` must still match legacy on `strict` scenarios
 *   (that is real business logic) but is expected to fix `quirk` scenarios.
 */
export function expectedFacts(scenario, { targetId, policy }) {
  if (targetId === 'cobol' || policy === 'bug-for-bug') return scenario.expectLegacy;
  if (scenario.parity === 'quirk' && scenario.expectModern) return scenario.expectModern;
  return scenario.expectLegacy;
}

export function selectScenarios(spec, filter) {
  if (!filter) return spec.scenarios;
  const wanted = filter.split(',').map((value) => value.trim().toLowerCase());
  return spec.scenarios.filter(
    (scenario) =>
      wanted.includes(scenario.id.toLowerCase()) ||
      (scenario.tags ?? []).some((tag) => wanted.includes(tag.toLowerCase())),
  );
}
