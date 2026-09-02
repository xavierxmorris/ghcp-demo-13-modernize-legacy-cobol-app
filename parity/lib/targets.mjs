import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const COBOL_BIN = process.env.COBOL_BIN ?? path.join(ROOT, 'build', 'accountsystem');
const NODE_ENTRY = process.env.NODE_ENTRY ?? path.join(ROOT, 'node-accounting-app', 'src', 'main.js');

export const TARGETS = {
  cobol: {
    id: 'cobol',
    label: 'Legacy COBOL binary',
    command: COBOL_BIN,
    args: [],
    cwd: ROOT,
    env: {},
    // Force deterministic, unbuffered, locale-independent output.
    check() {
      if (existsSync(COBOL_BIN)) return null;
      return [
        `COBOL binary not found at ${COBOL_BIN}.`,
        'Build it first:  npm run build:cobol',
        'That needs GnuCOBOL. Use the devcontainer, a Codespace, or set COBOL_BIN',
        'to a binary you built elsewhere.',
      ].join('\n');
    },
  },
  node: {
    id: 'node',
    label: 'Node.js port',
    command: process.execPath,
    args: [NODE_ENTRY],
    cwd: ROOT,
    env: { NO_COLOR: '1', FORCE_COLOR: '0' },
    check() {
      if (existsSync(NODE_ENTRY)) return null;
      return `Node entry point not found at ${NODE_ENTRY}. The port has not been written yet.`;
    },
  },
};

export function resolveTarget(id) {
  const target = TARGETS[id];
  if (!target) {
    throw new Error(`Unknown target '${id}'. Expected one of: ${Object.keys(TARGETS).join(', ')}`);
  }
  return target;
}
