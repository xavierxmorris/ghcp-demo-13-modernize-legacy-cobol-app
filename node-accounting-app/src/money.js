/**
 * Money as integer cents.
 *
 * The COBOL original stores the balance in `PIC 9(6)V99` - a fixed-point,
 * unsigned, 6-integer-digit, 2-decimal field. Two consequences drive this
 * module:
 *
 *  1. Never use a JavaScript float for money. `0.1 + 0.2 !== 0.3`, and an
 *     accounting system that drifts by a cent is worse than one that crashes.
 *  2. The 999999.99 ceiling is preserved as an explicit, enforced business
 *     rule. The legacy system had the same limit but enforced it by silently
 *     discarding the overflowing digit (finding L-01).
 */

export const MAX_CENTS = 99_999_999; // 999999.99, the capacity of PIC 9(6)V99

/** Matches an unsigned decimal with at most two fractional digits. */
const AMOUNT_PATTERN = /^\d{1,6}(?:\.\d{1,2})?$/;

export class AmountError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AmountError';
  }
}

/**
 * Parse user input into cents, or throw AmountError with an explanation.
 *
 * Every rejection here corresponds to a legacy defect that silently corrupted
 * data instead of refusing the input. See docs/LEGACY-BEHAVIOR.md.
 */
export function parseAmount(raw) {
  const text = String(raw ?? '').trim();

  if (text === '') throw new AmountError('an amount is required');
  if (text.startsWith('-') || text.startsWith('+')) {
    // Legacy L-02: the sign was discarded, so "-100" credited 100.
    throw new AmountError('the amount must not be signed');
  }
  if (!AMOUNT_PATTERN.test(text)) {
    // Legacy L-03 / L-04 / L-06: "abc", "1e3" and over-long input all became a
    // silent 0 or a truncated value.
    throw new AmountError('the amount must be a number with at most 6 digits and 2 decimal places');
  }

  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (cents === 0) {
    // Legacy L-06: a zero movement was recorded and reported as a success.
    throw new AmountError('the amount must be greater than zero');
  }
  return cents;
}

/** Render cents as a grouped decimal string, for example 346678_00 -> "346,678.00". */
export function formatCents(cents) {
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, '0');
  return `${whole.toLocaleString('en-US')}.${fraction}`;
}
