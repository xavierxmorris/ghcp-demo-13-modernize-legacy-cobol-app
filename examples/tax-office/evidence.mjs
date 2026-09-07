import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../parity/lib/targets.mjs';
import { loadSpec } from '../../parity/lib/spec.mjs';

export const MAP_PATH = path.join(ROOT, 'examples', 'tax-office', 'evidence-map.json');
export const ORIGINAL_FILES = ['main.cob', 'operations.cob', 'data.cob'];
export const PORT_FILES = {
  java: ['Main.java', 'Money.java', 'Operations.java', 'AccountStore.java'].map((name) => `java-accounting-app/src/${name}`),
  dotnet: ['Program.cs', 'Money.cs', 'Operations.cs', 'AccountStore.cs', 'Accounting.csproj'].map((name) => `dotnet-accounting-app/${name}`),
};

export function textHash(file) {
  return createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
}

export function validateEvidenceMap(map, spec) {
  assert.equal(map.evidence, 'original-cobol-replay');
  assert.match(map.baselineCommit, /^[a-f0-9]{40}$/);
  assert.deepEqual(map.sources.map((source) => source.path).sort(), [...ORIGINAL_FILES].sort());
  for (const source of map.sources) {
    assert.equal(textHash(path.join(ROOT, source.path)), source.sha256Lf, `${source.path}: original COBOL fingerprint changed`);
  }
  assert.ok(map.groups.length > 0);
  assert.equal(new Set(map.groups.map((group) => group.id)).size, map.groups.length);
  const covered = [];
  const allowedKeys = new Set(['id', 'title', 'scenarioIds', 'sourceFiles', 'sourceSymbols', 'javaFiles', 'dotnetFiles', 'taxRelevance', 'limit']);
  for (const group of map.groups) {
    assert.ok(Object.keys(group).every((key) => allowedKeys.has(key)), `${group.id}: the map must not define another oracle`);
    assert.ok(group.scenarioIds.length > 0);
    assert.ok(group.sourceFiles.length > 0 && group.sourceFiles.every((file) => ORIGINAL_FILES.includes(file)));
    for (const target of ['java', 'dotnet']) {
      const files = group[`${target}Files`];
      assert.ok(files.length > 0);
      assert.ok(files.every((file) => PORT_FILES[target].includes(file) && existsSync(path.join(ROOT, file))));
    }
    assert.ok(group.sourceSymbols.length > 0 && group.taxRelevance && group.limit);
    covered.push(...group.scenarioIds);
  }
  assert.equal(new Set(covered).size, covered.length, 'each recorded scenario needs one primary evidence group');
  assert.deepEqual([...covered].sort(), spec.scenarios.map((scenario) => scenario.id).sort(),
    'taxation examples must cover exactly the original recorded scenarios, with no invented case IDs');
  assert.ok(map.unprovenTaxCapabilities.length > 0);
  for (const scenario of spec.scenarios) {
    assert.ok(Array.isArray(scenario.expectLegacy), `${scenario.id}: missing recorded oracle`);
  }
}

export function loadEvidence() {
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const spec = loadSpec();
  validateEvidenceMap(map, spec);
  return { map, spec };
}
