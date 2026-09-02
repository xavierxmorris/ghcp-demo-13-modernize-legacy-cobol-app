/**
 * Reduces raw program output to an ordered list of normalised "facts".
 *
 * This is the piece that lets a 1985 COBOL binary and a 2026 Node.js port be
 * compared at all. COBOL prints `Current balance: 001000.00`; a modern port may
 * print `Current balance: $1,000.00`. Both reduce to `balance:1000.00`.
 *
 * Contract: at most one fact per line of output. See spec/scenarios.json.
 */

/** Turn `001200.00`, `1,200.00` or `$1,200.00` into `1200.00`. */
export function normaliseAmount(raw) {
  const digits = raw.replace(/[$,\s]/g, '');
  const [whole, fraction = '00'] = digits.split('.');
  const trimmed = whole.replace(/^0+(?=\d)/, '');
  return `${trimmed === '' ? '0' : trimmed}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

const AMOUNT = String.raw`\$?\s*([\d,]+\.\d{2})`;

// Priority order matters: the most specific pattern must win. `Amount credited.
// New balance: 001200.00` contains the word "balance", so the credit pattern is
// tested before the plain balance pattern.
const PATTERNS = [
  { fact: () => 'insufficient_funds', re: /insufficient\s+funds/i },
  { fact: () => 'invalid_choice', re: /invalid\s+choice/i },
  { fact: () => 'exit', re: /exiting the program/i },
  { fact: (m) => `credited:${normaliseAmount(m[1])}`, re: new RegExp(String.raw`credited\b[^\n]*?balance:\s*${AMOUNT}`, 'i') },
  { fact: (m) => `debited:${normaliseAmount(m[1])}`, re: new RegExp(String.raw`debited\b[^\n]*?balance:\s*${AMOUNT}`, 'i') },
  { fact: () => 'rejected', re: /\b(rejected|refused|declined|must be|not a valid|invalid amount)\b/i },
  { fact: (m) => `balance:${normaliseAmount(m[1])}`, re: new RegExp(String.raw`balance:\s*${AMOUNT}`, 'i') },
];

/** Extract the fact sequence from one process's stdout. */
export function extractFacts(stdout) {
  const facts = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    for (const { re, fact } of PATTERNS) {
      const match = line.match(re);
      if (match) {
        facts.push(fact(match));
        break;
      }
    }
  }
  return facts;
}

/**
 * Collapse the tail of a runaway program into a single repetition plus a
 * `runaway` marker, so a non-terminating scenario still yields a deterministic,
 * diffable fact list.
 */
export function markRunaway(facts) {
  const collapsed = [];
  for (const fact of facts) {
    if (collapsed[collapsed.length - 1] !== fact) collapsed.push(fact);
  }
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
