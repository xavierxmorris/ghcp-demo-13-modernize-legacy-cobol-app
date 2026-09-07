import path from 'node:path';
import { ROOT } from '../parity/lib/targets.mjs';
import { buildDotnet, buildJava } from './lib/build.mjs';

const [selected = 'all', ...extra] = process.argv.slice(2);
if (extra.length > 0 || !['all', 'java', 'dotnet'].includes(selected)) {
  throw new Error('Usage: node scripts/build-ports.mjs [all|java|dotnet]');
}

if (selected === 'all' || selected === 'java') {
  const source = path.join(ROOT, 'java-accounting-app', 'src');
  const output = path.join(ROOT, 'build', 'java');
  buildJava(source, output);
  console.log('Built Java accounting port.');
}

if (selected === 'all' || selected === 'dotnet') {
  buildDotnet(path.join(ROOT, 'dotnet-accounting-app', 'Accounting.csproj'), path.join(ROOT, 'build', 'dotnet'));
}
