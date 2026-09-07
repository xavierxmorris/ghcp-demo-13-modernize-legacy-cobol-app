import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { loadEvidence, validateEvidenceMap } from '../examples/tax-office/evidence.mjs';
import { ROOT } from '../parity/lib/targets.mjs';

const { map, spec } = loadEvidence();

describe('taxation framing stays anchored to original COBOL evidence', () => {
  it('pins the original three source files and covers every recorded case', () => {
    assert.doesNotThrow(() => validateEvidenceMap(map, spec));
    assert.equal(map.sources.length, 3);
    assert.equal(map.groups.flatMap((group) => group.scenarioIds).length, spec.scenarios.length);
  });

  it('rejects an invented taxation case with no original recorded evidence', () => {
    const modified = structuredClone(map);
    modified.groups[0].scenarioIds.push('TAX-INVENTED-REFUND');
    assert.throws(() => validateEvidenceMap(modified, spec), /exactly the original recorded scenarios/);
  });

  it('rejects a copied or newly authored oracle in the taxation map', () => {
    const modified = structuredClone(map);
    modified.groups[0].expected = ['balance:0.00'];
    assert.throws(() => validateEvidenceMap(modified, spec), /must not define another oracle/);
  });

  it('rejects silently dropping a recorded edge case from the migration scope', () => {
    const modified = structuredClone(map);
    modified.groups[0].scenarioIds.pop();
    assert.throws(() => validateEvidenceMap(modified, spec), /exactly the original recorded scenarios/);
  });

  it('rejects a changed original-source fingerprint', () => {
    const modified = structuredClone(map);
    modified.sources[0].sha256Lf = '0'.repeat(64);
    assert.throws(() => validateEvidenceMap(modified, spec), /original COBOL fingerprint changed/);
  });

  it('rejects tracing an example to an unrelated modern application', () => {
    const modified = structuredClone(map);
    modified.groups[0].javaFiles = ['examples/tax-office/invented/TaxOffice.java'];
    assert.throws(() => validateEvidenceMap(modified, spec));
  });

  it('does not present tax identity, refund or posting capabilities as proven', () => {
    assert.ok(map.unprovenTaxCapabilities.some((gap) => gap.includes('PRN')));
    assert.ok(map.unprovenTaxCapabilities.some((gap) => gap.includes('Refund')));
    assert.ok(map.unprovenTaxCapabilities.some((gap) => gap.includes('idempotent')));
  });

  for (const args of [['invented-tax-target'], ['java', '--recorded-only']]) {
    it(`refuses an unsupported evidence invocation: ${args.join(' ')}`, () => {
      const result = spawnSync(process.execPath, ['scripts/check-tax-office.mjs', ...args], {
        cwd: ROOT, encoding: 'utf8', timeout: 10_000,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Usage:/);
    });
  }
});
