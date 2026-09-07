import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../parity/lib/targets.mjs';

const [selected = 'all', ...extra] = process.argv.slice(2);
if (extra.length > 0 || !['all', 'java', 'dotnet'].includes(selected)) {
  throw new Error('Usage: node scripts/build-ports.mjs [all|java|dotnet]');
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.error) {
    throw new Error(`Cannot run ${command}. Use the multi-language container or install the documented SDK.`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (selected === 'all' || selected === 'java') {
  const source = path.join(ROOT, 'java-accounting-app', 'src');
  const output = path.join(ROOT, 'build', 'java');
  mkdirSync(output, { recursive: true });
  run('javac', [
    '--release', '25', '-encoding', 'UTF-8', '-Xlint:all', '-Werror', '-d', output,
    ...readdirSync(source).filter((name) => name.endsWith('.java')).sort().map((name) => path.join(source, name)),
  ]);
  console.log('Built Java accounting port.');
}

if (selected === 'all' || selected === 'dotnet') {
  run('dotnet', [
    'build', path.join(ROOT, 'dotnet-accounting-app', 'Accounting.csproj'),
    '--configuration', 'Release', '--output', path.join(ROOT, 'build', 'dotnet'), '--nologo',
  ]);
}
