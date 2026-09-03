import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  AccountStoreError,
  OPENING_BALANCE_CENTS,
  readBalance,
  writeBalance,
} from '../node-accounting-app/src/data.js';

let dir;
let file;
const previous = process.env.ACCOUNT_STORE;

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'store-test-'));
  file = path.join(dir, 'account.json');
  process.env.ACCOUNT_STORE = file;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (previous === undefined) delete process.env.ACCOUNT_STORE;
  else process.env.ACCOUNT_STORE = previous;
});

describe('readBalance', () => {
  it('seeds a new account at the legacy opening balance', () => {
    assert.equal(readBalance(), OPENING_BALANCE_CENTS);
  });

  it('round-trips a written balance', () => {
    writeBalance(123_456);
    assert.equal(readBalance(), 123_456);
  });

  // Falling back to the opening balance for a damaged store would silently
  // reset someone's account to 1000.00 - the exact legacy defect (L-09) this
  // module exists to fix.
  const corruptions = [
    ['malformed JSON', 'not json at all'],
    ['an array rather than an object', '[]'],
    ['null', 'null'],
    ['a missing balanceCents field', '{"updatedAt":"2026-01-01T00:00:00.000Z"}'],
    ['a string balance', '{"balanceCents":"1000"}'],
    ['a fractional balance', '{"balanceCents":1000.5}'],
    ['a negative balance', '{"balanceCents":-1}'],
    ['a balance beyond the account limit', '{"balanceCents":100000000}'],
  ];

  for (const [description, contents] of corruptions) {
    it(`refuses to guess when the store has ${description}`, () => {
      writeFileSync(file, contents, 'utf8');
      assert.throws(() => readBalance(), AccountStoreError);
    });
  }
});

describe('writeBalance', () => {
  it('refuses to persist an impossible balance', () => {
    assert.throws(() => writeBalance(-1), AccountStoreError);
    assert.throws(() => writeBalance(100_000_000), AccountStoreError);
    assert.throws(() => writeBalance(1.5), AccountStoreError);
  });

  it('leaves no temporary file behind', () => {
    writeBalance(50_000);
    assert.deepEqual(readdirSync(dir).filter((entry) => entry.includes('.tmp')), []);
  });
});
