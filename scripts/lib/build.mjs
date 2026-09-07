import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../parity/lib/targets.mjs';

export function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...extraEnv },
  });
  if (result.error) {
    throw new Error(`Cannot run ${command}. Use the multi-language container or install the documented SDK.`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function buildJava(source, output) {
  mkdirSync(output, { recursive: true });
  run('javac', [
    '--release', '25', '-encoding', 'UTF-8', '-Xlint:all', '-Werror', '-d', output,
    ...readdirSync(source).filter((name) => name.endsWith('.java')).sort().map((name) => path.join(source, name)),
  ]);
}

export function buildDotnet(project, output) {
  run('dotnet', ['build', project, '--configuration', 'Release', '--output', output, '--nologo']);
}
