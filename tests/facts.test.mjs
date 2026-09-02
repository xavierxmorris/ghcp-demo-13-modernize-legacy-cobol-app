import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractFacts, markRunaway, normaliseAmount } from '../parity/lib/facts.mjs';

describe('normaliseAmount', () => {
  it('strips the zero padding COBOL emits for PIC 9(6)V99', () => {
    assert.equal(normaliseAmount('001000.00'), '1000.00');
    assert.equal(normaliseAmount('000000.00'), '0.00');
  });

  it('strips grouping separators and currency symbols a modern port may add', () => {
    assert.equal(normaliseAmount('1,000.00'), '1000.00');
    assert.equal(normaliseAmount('$346,678.00'), '346678.00');
  });
});

describe('extractFacts', () => {
  it('reads the legacy COBOL transcript', () => {
    const cobol = [
      '--------------------------------',
      'Account Management System',
      '1. View Balance',
      'Enter your choice (1-4): ',
      'Amount credited. New balance: 001200.00',
      'Current balance: 001200.00',
      'Insufficient funds for this debit.',
      'Invalid choice, please select 1-4.',
      'Exiting the program. Goodbye!',
    ].join('\n');

    assert.deepEqual(extractFacts(cobol), [
      'credited:1200.00',
      'balance:1200.00',
      'insufficient_funds',
      'invalid_choice',
      'exit',
    ]);
  });

  it('reads a modernised transcript with different formatting to the same facts', () => {
    const modern = [
      'Amount credited. New balance: 1,200.00',
      'Current balance: 1,200.00',
      'Rejected: the amount must be greater than zero.',
      'Exiting the program. Goodbye!',
    ].join('\n');

    assert.deepEqual(extractFacts(modern), ['credited:1200.00', 'balance:1200.00', 'rejected', 'exit']);
  });

  it('prefers the credit and debit patterns over the bare balance pattern', () => {
    assert.deepEqual(extractFacts('Amount debited. New balance: 000700.00'), ['debited:700.00']);
  });

  it('does not mistake an invalid menu choice for a rejected amount', () => {
    assert.deepEqual(extractFacts('Invalid choice, please select 1-4.'), ['invalid_choice']);
  });
});

describe('markRunaway', () => {
  it('collapses a repeating tail into a deterministic, diffable sequence', () => {
    const spinning = ['balance:1000.00', ...Array(500).fill('invalid_choice')];
    assert.deepEqual(markRunaway(spinning), ['balance:1000.00', 'invalid_choice', 'runaway']);
  });
});
