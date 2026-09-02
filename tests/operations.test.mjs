import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OUTCOME, credit, debit } from '../node-accounting-app/src/operations.js';
import { MAX_CENTS } from '../node-accounting-app/src/money.js';

describe('credit', () => {
  it('adds the amount to the balance', () => {
    assert.deepEqual(credit(100_000, 20_000), { outcome: OUTCOME.OK, balanceCents: 120_000 });
  });

  it('allows a credit that lands exactly on the account limit', () => {
    assert.deepEqual(credit(MAX_CENTS - 1, 1), { outcome: OUTCOME.OK, balanceCents: MAX_CENTS });
  });

  // Legacy L-01: 1000.00 + 999000.00 wrapped to 0.00 and still reported success.
  it('refuses a credit that would exceed the account limit, leaving the balance intact', () => {
    assert.deepEqual(credit(100_000, 99_900_000), { outcome: OUTCOME.EXCEEDS_LIMIT, balanceCents: 100_000 });
  });
});

describe('debit', () => {
  it('subtracts the amount from the balance', () => {
    assert.deepEqual(debit(100_000, 30_000), { outcome: OUTCOME.OK, balanceCents: 70_000 });
  });

  it('allows draining the account to exactly zero, preserving the legacy >= guard', () => {
    assert.deepEqual(debit(100_000, 100_000), { outcome: OUTCOME.OK, balanceCents: 0 });
  });

  it('refuses a debit one cent beyond the balance', () => {
    assert.deepEqual(debit(100_000, 100_001), { outcome: OUTCOME.INSUFFICIENT_FUNDS, balanceCents: 100_000 });
  });

  it('refuses any debit against an empty account', () => {
    assert.deepEqual(debit(0, 1), { outcome: OUTCOME.INSUFFICIENT_FUNDS, balanceCents: 0 });
  });
});

describe('arithmetic integrity', () => {
  // The whole reason money is stored as integer cents.
  it('does not accumulate floating point drift over many small movements', () => {
    let balance = 0;
    for (let i = 0; i < 1000; i += 1) balance = credit(balance, 10).balanceCents; // 0.10 each
    assert.equal(balance, 10_000); // exactly 100.00
  });
});
