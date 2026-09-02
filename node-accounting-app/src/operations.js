/**
 * Account operations - the modern replacement for operations.cob.
 *
 * Kept as pure functions over a balance so they can be unit tested without
 * spawning a process. operations.cob interleaved I/O, validation and
 * arithmetic in one paragraph, which is exactly why it was untestable.
 */
import { MAX_CENTS } from './money.js';

export const OUTCOME = {
  OK: 'ok',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  EXCEEDS_LIMIT: 'exceeds_limit',
};

/**
 * Credit the account.
 *
 * The legacy `ADD AMOUNT TO FINAL-BALANCE` had no ON SIZE ERROR clause, so a
 * credit that overflowed PIC 9(6)V99 discarded the leading digit and reported
 * success - 1000.00 + 999000.00 became 0.00 (finding L-01). Here the overflow
 * is detected and the transaction is refused.
 */
export function credit(balanceCents, amountCents) {
  const next = balanceCents + amountCents;
  if (next > MAX_CENTS) return { outcome: OUTCOME.EXCEEDS_LIMIT, balanceCents };
  return { outcome: OUTCOME.OK, balanceCents: next };
}

/**
 * Debit the account.
 *
 * The `IF FINAL-BALANCE >= AMOUNT` guard is the one thing operations.cob got
 * right, so it is preserved exactly: draining the account to zero is allowed,
 * one cent beyond is not.
 */
export function debit(balanceCents, amountCents) {
  if (amountCents > balanceCents) return { outcome: OUTCOME.INSUFFICIENT_FUNDS, balanceCents };
  return { outcome: OUTCOME.OK, balanceCents: balanceCents - amountCents };
}
