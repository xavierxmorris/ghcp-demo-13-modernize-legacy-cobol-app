/**
 * Durable balance storage - the modern replacement for data.cob.
 *
 * data.cob is called `DataProgram` and holds `STORAGE-BALANCE` in
 * WORKING-STORAGE, which is process memory. It looks like a data layer but
 * stores nothing: every restart silently reopens the account at 1000.00
 * (finding L-09). This module keeps the same READ/WRITE seam so the mapping to
 * the original stays obvious, but actually persists.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const OPENING_BALANCE_CENTS = 100_000; // 1000.00, as hard-coded in data.cob

/**
 * Upper bound inherited from the COBOL `PIC 9(6)V99` field, enforced here so a
 * store that somehow holds an impossible balance is rejected rather than used.
 */
const MAX_CENTS = 99_999_999;

export function storePath() {
  return process.env.ACCOUNT_STORE ?? path.join(APP_ROOT, '.account-store.json');
}

class AccountStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AccountStoreError';
  }
}

function assertValidBalance(balanceCents, source) {
  if (!Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > MAX_CENTS) {
    throw new AccountStoreError(
      `${source} holds an invalid balance (${JSON.stringify(balanceCents)}). ` +
        'Refusing to guess. Expected a whole number of cents between 0 and 99999999.',
    );
  }
  return balanceCents;
}

/**
 * READ - return the current balance in cents, seeding the account on first use.
 *
 * Any store that exists but is not exactly what we wrote is an error. Falling
 * back to the opening balance would silently reset someone's account to
 * 1000.00, which is the legacy defect this module exists to fix (L-09).
 */
export function readBalance() {
  const file = storePath();
  if (!existsSync(file)) return OPENING_BALANCE_CENTS;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    throw new AccountStoreError(`Account store at ${file} is not readable JSON: ${cause.message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AccountStoreError(`Account store at ${file} is not an object.`);
  }
  return assertValidBalance(parsed.balanceCents, `Account store at ${file}`);
}

/** WRITE - persist the balance atomically so a crash cannot leave a torn file. */
export function writeBalance(balanceCents) {
  assertValidBalance(balanceCents, 'The balance being written');
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  // A unique temporary name keeps two processes from colliding on the same
  // scratch file. It does not make the read-modify-write sequence atomic -
  // this port is single-process by design; see node-accounting-app/README.md.
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(
      temporary,
      `${JSON.stringify({ balanceCents, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      'utf8',
    );
    renameSync(temporary, file);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

export { AccountStoreError };
