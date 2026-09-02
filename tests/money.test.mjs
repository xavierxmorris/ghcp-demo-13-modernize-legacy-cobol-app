import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AmountError, MAX_CENTS, formatCents, parseAmount } from '../node-accounting-app/src/money.js';

describe('parseAmount', () => {
  it('accepts a plain decimal amount', () => {
    assert.equal(parseAmount('200.00'), 20_000);
  });

  it('accepts an integer amount', () => {
    assert.equal(parseAmount('500'), 50_000);
  });

  it('accepts a single decimal place', () => {
    assert.equal(parseAmount('10.5'), 1_050);
  });

  it('tolerates surrounding whitespace, matching legacy scenario Q-12', () => {
    assert.equal(parseAmount(' 200 '), 20_000);
  });

  it('accepts the largest representable amount', () => {
    assert.equal(parseAmount('999999.99'), MAX_CENTS);
  });

  // Each rejection below is a legacy defect that silently corrupted data.
  const rejections = [
    ['a negative amount (legacy L-02 credited it as positive)', '-100.00'],
    ['a signed positive amount', '+100.00'],
    ['a non-numeric amount (legacy L-03 treated it as zero)', 'abc'],
    ['scientific notation (legacy L-03 treated it as zero)', '1e3'],
    ['a third decimal place (legacy L-05 truncated it)', '10.999'],
    ['an over-long amount (legacy L-04 truncated the input)', '12345678.99'],
    ['zero (legacy L-06 reported a successful no-op)', '0'],
    ['zero with decimals', '0.00'],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ];

  for (const [description, input] of rejections) {
    it(`rejects ${description}`, () => {
      assert.throws(() => parseAmount(input), AmountError);
    });
  }
});

describe('formatCents', () => {
  it('formats a whole amount with grouping', () => {
    assert.equal(formatCents(34_667_800), '346,678.00');
  });

  it('always shows two decimal places', () => {
    assert.equal(formatCents(100_000), '1,000.00');
    assert.equal(formatCents(0), '0.00');
    assert.equal(formatCents(5), '0.05');
  });
});
