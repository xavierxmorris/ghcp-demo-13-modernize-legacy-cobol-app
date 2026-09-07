import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { factsForScenario } from '../parity/lib/facts.mjs';
import { exitedCleanly, runScenario } from '../parity/lib/run.mjs';
import { withIsolatedStore } from '../parity/lib/spec.mjs';
import { TARGETS } from '../parity/lib/targets.mjs';

const MAX_CENTS = 99_999_999n;
const format = (cents) => `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;

// Authored modern-policy arithmetic, not new evidence about the COBOL runtime.
function makeSequence(seed) {
  let state = BigInt(seed);
  let balance = 100_000n;
  const input = ['1'];
  const expected = ['balance:1000.00'];
  const next = () => {
    state = (1_664_525n * state + 1_013_904_223n) % 4_294_967_296n;
    return state;
  };
  const move = (choice, amount) => {
    input.push(choice, format(amount), '1');
    if (amount <= 0n || amount > MAX_CENTS || (choice === '2' && balance + amount > MAX_CENTS)) {
      expected.push('rejected');
    } else if (choice === '3' && amount > balance) {
      expected.push('insufficient_funds');
    } else {
      balance = choice === '2' ? balance + amount : balance - amount;
      expected.push(`${choice === '2' ? 'credited' : 'debited'}:${format(balance)}`);
    }
    expected.push(`balance:${format(balance)}`);
  };

  move('2', 99_899_999n);
  move('2', 1n);
  move('3', MAX_CENTS);
  move('3', 1n);
  move('2', 110n);
  move('3', 10n);
  for (let index = 0; index < 128; index++) {
    const sample = next();
    const amounts = [1n, balance, MAX_CENTS - balance, balance + 1n, sample % 10_000n + 1n, sample % MAX_CENTS + 1n];
    const amount = amounts[Number((sample >> 16n) % BigInt(amounts.length))];
    const choice = ((next() >> 8n) & 1n) === 0n ? '2' : '3';
    move(choice, amount);
  }
  input.push('4');
  expected.push('exit');
  return { input, expected };
}

for (const target of [TARGETS.node, TARGETS.java, TARGETS.dotnet]) {
  const unavailable = target.check();
  describe(`${target.label} independent arithmetic sequences`, { skip: unavailable ?? false }, () => {
    for (const seed of [1, 42, 20260907]) {
      it(`matches a BigInt oracle through 134 boundary/seeded operations (seed ${seed})`, async () => {
        const { input, expected } = makeSequence(seed);
        await withIsolatedStore(async (env) => {
          const results = await runScenario(target, { input }, env);
          assert.ok(results.every(exitedCleanly), 'the process must exit without a timeout or output cap');
          assert.deepEqual(factsForScenario(results), expected);
        });
      });
    }
  });
}
