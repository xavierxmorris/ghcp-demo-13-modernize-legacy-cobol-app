import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import path from 'node:path';
import { factsForScenario } from '../parity/lib/facts.mjs';
import { exitedCleanly, runScenario } from '../parity/lib/run.mjs';
import { withIsolatedStore } from '../parity/lib/spec.mjs';
import { TARGETS } from '../parity/lib/targets.mjs';

for (const target of [TARGETS.java, TARGETS.dotnet]) {
  const unavailable = target.check();
  describe(`${target.label} storage and input contract`, { skip: unavailable ?? false }, () => {
    it('preserves exact cents through a credit and debit', async () => {
      await withIsolatedStore(async (env) => {
        const results = await runScenario(target, { input: ['2', '0.01', '3', '1.1', '1', '4'] }, env);
        assert.ok(results.every(exitedCleanly));
        assert.deepEqual(factsForScenario(results), [
          'credited:1000.01', 'debited:998.91', 'balance:998.91', 'exit',
        ]);
        assert.equal(readFileSync(env.ACCOUNT_STORE, 'utf8'), '99891\n');
      });
    });

    for (const amount of ['+1', '1e3', '1.', '.50', '1,000', 'NaN', '0000000.01']) {
      it(`rejects ${JSON.stringify(amount)} without creating a store`, async () => {
        await withIsolatedStore(async (env) => {
          const results = await runScenario(target, { input: ['2', amount, '1', '4'] }, env);
          assert.ok(results.every(exitedCleanly));
          assert.deepEqual(factsForScenario(results), ['rejected', 'balance:1000.00', 'exit']);
          assert.equal(existsSync(env.ACCOUNT_STORE), false);
        });
      });
    }

    it('ends cleanly if EOF arrives at the amount prompt', async () => {
      await withIsolatedStore(async (env) => {
        const results = await runScenario(target, { input: ['2'] }, env);
        assert.ok(results.every(exitedCleanly));
        assert.deepEqual(factsForScenario(results), ['exit']);
        assert.equal(existsSync(env.ACCOUNT_STORE), false);
      });
    });

    for (const stored of ['', '-1\n', '100000000\n', '1.5\n', 'not-a-balance\n', '{"balanceCents":100000}']) {
      it(`refuses invalid persisted state ${JSON.stringify(stored)} without resetting it`, async () => {
        await withIsolatedStore(async (env) => {
          writeFileSync(env.ACCOUNT_STORE, stored);
          const [result] = await runScenario(target, { input: ['2', '1', '4'] }, env);
          assert.equal(result.code, 1);
          assert.equal(result.killedByHarness, false);
          assert.match(result.stderr, /account store/i);
          assert.deepEqual(factsForScenario([result]), []);
          assert.equal(readFileSync(env.ACCOUNT_STORE, 'utf8'), stored);
        });
      });
    }

    it('does not mistake a directory for a new account', async () => {
      await withIsolatedStore(async (env) => {
        mkdirSync(env.ACCOUNT_STORE);
        const [result] = await runScenario(target, { input: ['1', '4'] }, env);
        assert.equal(result.code, 1);
        assert.equal(result.killedByHarness, false);
        assert.deepEqual(factsForScenario([result]), []);
      });
    });

    it('rejects a store whose parent is a regular file', async () => {
      await withIsolatedStore(async (env) => {
        writeFileSync(env.ACCOUNT_STORE, 'not-a-directory');
        const [result] = await runScenario(target, { input: ['1', '4'] }, {
          ACCOUNT_STORE: path.join(env.ACCOUNT_STORE, 'nested', 'account.cents'),
        });
        assert.equal(result.code, 1);
        assert.equal(result.killedByHarness, false);
        assert.deepEqual(factsForScenario([result]), []);
        assert.equal(readFileSync(env.ACCOUNT_STORE, 'utf8'), 'not-a-directory');
      });
    });

    it('can initialize a new store below a missing parent directory', async () => {
      await withIsolatedStore(async (env) => {
        const file = path.join(env.ACCOUNT_STORE, 'nested', 'account.cents');
        const results = await runScenario(target, { input: ['1', '2', '1', '4'] }, { ACCOUNT_STORE: file });
        assert.ok(results.every(exitedCleanly));
        assert.deepEqual(factsForScenario(results), ['balance:1000.00', 'credited:1001.00', 'exit']);
        assert.equal(readFileSync(file, 'utf8'), '100100\n');
      });
    });

    it('refuses invalid UTF-8 without replacing the stored bytes', async () => {
      await withIsolatedStore(async (env) => {
        const invalid = Buffer.from([0xff]);
        writeFileSync(env.ACCOUNT_STORE, invalid);
        const [result] = await runScenario(target, { input: ['1', '4'] }, env);
        assert.equal(result.code, 1);
        assert.equal(result.killedByHarness, false);
        assert.match(result.stderr, /Fatal:/);
        assert.deepEqual(factsForScenario([result]), []);
        assert.deepEqual(readFileSync(env.ACCOUNT_STORE), invalid);
      });
    });
  });
}
