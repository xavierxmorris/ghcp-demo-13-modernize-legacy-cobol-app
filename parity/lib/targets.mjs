import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const COBOL_BIN = process.env.COBOL_BIN ?? path.join(ROOT, 'build', 'accountsystem');
const NODE_ENTRY = process.env.NODE_ENTRY ?? path.join(ROOT, 'node-accounting-app', 'src', 'main.js');
const JAVA_CLASSES = path.join(ROOT, 'build', 'java');
const DOTNET_DLL = path.join(ROOT, 'build', 'dotnet', 'Accounting.dll');

function checkManagedTarget(command, artifact, buildScript) {
  if (!existsSync(artifact)) return `Port not built: ${artifact}. Run npm run ${buildScript}.`;
  const result = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 10_000 });
  if (result.error || result.status !== 0) {
    return `${command} is unavailable: ${result.error?.message ?? result.stderr.trim()}`;
  }
  return null;
}

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
  java: {
    id: 'java',
    label: 'Java 25 port',
    command: 'java',
    args: ['-cp', JAVA_CLASSES, 'Main'],
    cwd: ROOT,
    env: {},
    check() {
      return checkManagedTarget('java', path.join(JAVA_CLASSES, 'Main.class'), 'build:java');
    },
  },
  dotnet: {
    id: 'dotnet',
    label: '.NET 10 port',
    command: 'dotnet',
    args: [DOTNET_DLL],
    cwd: ROOT,
    env: { DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
    check() {
      return checkManagedTarget('dotnet', DOTNET_DLL, 'build:dotnet');
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
