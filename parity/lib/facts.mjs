/**
 * Reduces raw program output to an ordered list of normalised "facts".
 *
 * This is the piece that lets a 1985 COBOL binary and a 2026 Node.js port be
 * compared at all. COBOL prints `Current balance: 001000.00`; a modern port may
 * print `Current balance: $1,000.00`. Both reduce to `balance:1000.00`.
 *
 * Contract: at most one fact per line of output, highest-priority pattern wins.
 * A line that clearly *should* have produced a fact but did not yields an
 * `unparsed:` fact rather than being dropped, so output drift surfaces as a
 * visible diff instead of a silent pass.
 */

/**
 * An unsigned amount with exactly two decimals, either ungrouped (`001000.00`)
 * or correctly grouped (`1,000.00`). Malformed grouping such as `1,0.00` is
 * rejected, and the trailing boundary stops `1000.000` matching the `1000.00`
 * prefix.
 */
const AMOUNT = String.raw`\$?\s*(\d+\.\d{2}|\d{1,3}(?:,\d{3})+\.\d{2})(?!\d)`;

/** Turn `001200.00` or `1,200.00` into `1200.00`. */
export function normaliseAmount(raw) {
  const digits = raw.replace(/[$,\s]/g, '');
  const [whole, fraction = '00'] = digits.split('.');
  const trimmed = whole.replace(/^0+(?=\d)/, '');
  return `${trimmed === '' ? '0' : trimmed}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

// Priority order matters: the most specific pattern must win. `Amount credited.
// New balance: 001200.00` contains the word "balance", so the credit pattern is
// tested before the plain balance pattern.
const PATTERNS = [
  { fact: () => 'insufficient_funds', re: /insufficient\s+funds/i },
  { fact: () => 'invalid_choice', re: /invalid\s+choice/i },
  { fact: () => 'exit', re: /exiting the program/i },
  {
    fact: (m) => `credited:${normaliseAmount(m[1])}`,
    re: new RegExp(String.raw`credited\b[^\n]*?balance:\s*${AMOUNT}`, 'i'),
  },
  {
    fact: (m) => `debited:${normaliseAmount(m[1])}`,
    re: new RegExp(String.raw`debited\b[^\n]*?balance:\s*${AMOUNT}`, 'i'),
  },
  { fact: () => 'rejected', re: /\b(rejected|refused|declined|must be|not a valid|invalid amount)\b/i },
  { fact: (m) => `balance:${normaliseAmount(m[1])}`, re: new RegExp(String.raw`balance:\s*${AMOUNT}`, 'i') },
];

/**
 * Lines using the contract vocabulary must produce a fact. If one does not, the
 * target's wording has drifted or its number is malformed, and silently
 * ignoring it would let a broken port pass.
 *
 * Deliberately narrow: the menu prints "1. View Balance" and "2. Credit
 * Account", which are not outcome statements and must not trip this.
 */
const SHOULD_HAVE_MATCHED = /balance:|credited|debited|insufficient|invalid choice|rejected/i;

/**
 * A negated outcome must never fall through to a weaker pattern.
 *
 * "Amount not credited. New balance: 1200.00" would otherwise be classified as
 * a plain balance display, quietly turning a failed transaction into a passing
 * scenario.
 */
const NEGATED_OUTCOME = /\b(?:not|never|failed to|unable to)\s+(?:been\s+)?(?:credit|debit)(?:ed)?\b/i;

/** Extract the fact sequence from one process's stdout. */
export function extractFacts(stdout) {
  const facts = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    if (NEGATED_OUTCOME.test(line)) {
      facts.push(`unparsed:${line.trim()}`);
      continue;
    }
    let matched = false;
    for (const { re, fact } of PATTERNS) {
      const match = line.match(re);
      if (match) {
        facts.push(fact(match));
        matched = true;
        break;
      }
    }
    if (!matched && SHOULD_HAVE_MATCHED.test(line)) {
      facts.push(`unparsed:${line.trim()}`);
    }
  }
  return facts;
}

/**
 * Canonicalise a runaway program's fact list.
 *
 * Only the repeating *suffix* is collapsed. Collapsing every consecutive
 * duplicate would discard legitimate repeated business events that occurred
 * before the program started spinning.
 */
export function markRunaway(facts) {
  const collapsed = [...facts];
  const last = collapsed[collapsed.length - 1];
  while (collapsed.length > 1 && collapsed[collapsed.length - 2] === last) collapsed.pop();
  return [...collapsed, 'runaway'];
}

/** Build the fact list for a whole scenario, including multi-session runs. */
export function factsForScenario(results) {
  const facts = [];
  results.forEach((result, index) => {
    if (index > 0) facts.push('session_end');
    const extracted = extractFacts(result.stdout);
    facts.push(...(result.truncated || result.timedOut ? markRunaway(extracted) : extracted));
  });
  return facts;
}
