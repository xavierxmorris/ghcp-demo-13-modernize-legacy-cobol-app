import { spawn } from 'node:child_process';

export const DEFAULT_LIMITS = { maxBytes: 256 * 1024, timeoutMs: 15_000 };

/**
 * Drive a target program through one scripted session.
 *
 * The legacy COBOL program never terminates when stdin reaches end of file
 * (finding L-07), so both a byte cap and a wall-clock timeout are mandatory,
 * not defensive extras. Without them this harness hangs or fills the disk.
 */
export function runSession(target, inputLines, limits = {}, extraEnv = {}) {
  const { maxBytes, timeoutMs } = { ...DEFAULT_LIMITS, ...limits };

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(target.command, target.args, {
        cwd: target.cwd,
        env: { ...process.env, ...target.env, ...extraEnv },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }

    const chunks = [];
    let bytes = 0;
    let truncated = false;
    let timedOut = false;
    let settled = false;

    const stop = () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    };

    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, timeoutMs);

    const collect = (chunk) => {
      if (truncated) return;
      bytes += chunk.length;
      chunks.push(chunk);
      if (bytes >= maxBytes) {
        truncated = true;
        stop();
      }
    };

    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    // The child can die mid-write once we kill it; EPIPE here is expected.
    child.stdin.on('error', () => {});
    child.stdin.end(inputLines.map((line) => `${line}\n`).join(''));

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(chunks).toString('utf8').slice(0, maxBytes);
      resolve({ stdout, code, signal, truncated, timedOut });
    });
  });
}

/**
 * Run every session of a scenario in order, returning one result per session.
 *
 * Sessions deliberately share `extraEnv` - and therefore share any durable
 * store a port uses - because scenario Q-11 exists precisely to check whether
 * the balance survives a restart. Isolation happens *between* scenarios, not
 * between the sessions of one scenario.
 */
export async function runScenario(target, scenario, extraEnv = {}) {
  const sessions = scenario.sessions ?? [scenario.input];
  const results = [];
  for (const session of sessions) {
    results.push(await runSession(target, session, scenario.limits, extraEnv));
  }
  return results;
}
