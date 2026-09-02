/**
 * Durable balance storage - the modern replacement for data.cob.
 *
 * data.cob is called `DataProgram` and holds `STORAGE-BALANCE` in
 * WORKING-STORAGE, which is process memory. It looks like a data layer but
 * stores nothing: every restart silently reopens the account at 1000.00
 * (finding L-09). This module keeps the same READ/WRITE seam so the mapping to
 * the original stays obvious, but actually persists.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const OPENING_BALANCE_CENTS = 100_000; // 1000.00, as hard-coded in data.cob

export function storePath() {
  return process.env.ACCOUNT_STORE ?? path.join(APP_ROOT, '.account-store.json');
}

/** READ - return the current balance in cents, seeding the account on first use. */
export function readBalance() {
  const file = storePath();
  if (!existsSync(file)) return OPENING_BALANCE_CENTS;
  try {
    const { balanceCents } = JSON.parse(readFileSync(file, 'utf8'));
    return Number.isSafeInteger(balanceCents) && balanceCents >= 0 ? balanceCents : OPENING_BALANCE_CENTS;
  } catch {
    // A corrupt store must not silently become a different balance. Fail loud.
    throw new Error(`Account store at ${file} is unreadable. Refusing to guess the balance.`);
  }
}

/** WRITE - persist the balance atomically so a crash cannot leave a torn file. */
export function writeBalance(balanceCents) {
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ balanceCents, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
  renameSync(temporary, file);
}
