#!/usr/bin/env node
/**
 * Account Management System - the modern replacement for main.cob.
 *
 * Behavioural contract: spec/scenarios.json. Run `npm run parity:node` to
 * check this port against the recorded behaviour of the COBOL original.
 */
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import { readBalance, writeBalance } from './data.js';
import { credit, debit, OUTCOME } from './operations.js';
import { AmountError, formatCents, parseAmount } from './money.js';

const MENU = [
  '--------------------------------',
  'Account Management System',
  '1. View Balance',
  '2. Credit Account',
  '3. Debit Account',
  '4. Exit',
  '--------------------------------',
  'Enter your choice (1-4): ',
].join('\n');

function createLineReader(input = process.stdin) {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const iterator = rl[Symbol.asyncIterator]();
  return {
    /** Resolves to the next line, or null at end of input. */
    async next() {
      const { value, done } = await iterator.next();
      return done ? null : value;
    },
    close: () => rl.close(),
  };
}

/**
 * Read and validate an amount.
 *
 * Returns { amountCents } on success, { rejected: true } when the input was
 * refused, or null at end of input.
 */
async function promptAmount(reader, label, write) {
  write(`Enter ${label} amount: `);
  const line = await reader.next();
  if (line === null) return null;
  try {
    return { amountCents: parseAmount(line) };
  } catch (error) {
    if (!(error instanceof AmountError)) throw error;
    write(`Rejected: ${error.message}.`);
    return { rejected: true };
  }
}

export async function run({ reader = createLineReader(), write = (line) => console.log(line) } = {}) {
  try {
    for (;;) {
      write(MENU);
      const choice = await reader.next();

      // main.cob loops forever here: ACCEPT at end of input leaves USER-CHOICE
      // untouched and never signals EOF, so the program spins printing
      // "Invalid choice" until the disk fills (finding L-07).
      if (choice === null) break;

      switch (choice.trim()) {
        case '1':
          write(`Current balance: ${formatCents(readBalance())}`);
          break;

        case '2': {
          const input = await promptAmount(reader, 'credit', write);
          if (input === null) return finish(write);
          if (input.rejected) break;
          const result = credit(readBalance(), input.amountCents);
          if (result.outcome === OUTCOME.EXCEEDS_LIMIT) {
            write('Rejected: the credit would take the balance beyond the 999,999.99 account limit.');
            break;
          }
          writeBalance(result.balanceCents);
          write(`Amount credited. New balance: ${formatCents(result.balanceCents)}`);
          break;
        }

        case '3': {
          const input = await promptAmount(reader, 'debit', write);
          if (input === null) return finish(write);
          if (input.rejected) break;
          const result = debit(readBalance(), input.amountCents);
          if (result.outcome === OUTCOME.INSUFFICIENT_FUNDS) {
            write('Insufficient funds for this debit.');
            break;
          }
          writeBalance(result.balanceCents);
          write(`Amount debited. New balance: ${formatCents(result.balanceCents)}`);
          break;
        }

        case '4':
          return finish(write);

        default:
          write('Invalid choice, please select 1-4.');
      }
    }
    return finish(write);
  } finally {
    reader.close();
  }
}

function finish(write) {
  write('Exiting the program. Goodbye!');
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (import.meta.url === entryPoint) {
  run().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exitCode = 1;
  });
}
