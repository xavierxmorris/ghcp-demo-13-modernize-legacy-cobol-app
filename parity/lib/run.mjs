import { spawn } from 'node:child_process';

export const DEFAULT_LIMITS = { maxBytes: 256 * 1024, timeoutMs: 15_000 };

/** Grace period before the hard follow-up kill. */
const KILL_GRACE_MS = 2_000;

/**
 * Drive a target program through one scripted session.
 *
 * The legacy COBOL program never terminates when stdin reaches end of file
 * (finding L-07), so both a byte cap and a wall-clock timeout are mandatory,
 * not defensive extras. Without them this harness hangs or fills the disk.
 *
 * stdout and stderr are captured separately: a target that prints the right
 * transcript and then dies noisily must not be mistaken for a healthy run.
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

    const out = [];
    const err = [];
    let outBytes = 0;
    let truncated = false;
    let timedOut = false;
    let killedByHarness = false;
    let settled = false;
    let hardKillTimer = null;

    const kill = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      killedByHarness = true;
      child.kill('SIGKILL');
      // A single kill() can fail silently if the process is in an odd state.
      // Without this follow-up the promise could hang until the CI job timeout.
      hardKillTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }, KILL_GRACE_MS);
      hardKillTimer.unref?.();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      if (truncated) return;
      outBytes += chunk.length;
      out.push(chunk);
      // Strictly greater than: output landing exactly on the cap is complete,
      // not truncated.
      if (outBytes > maxBytes) {
        truncated = true;
        kill();
      }
    });
    child.stderr.on('data', (chunk) => err.push(chunk));

    // The child can die mid-write once we kill it; EPIPE here is expected.
    child.stdin.on('error', () => {});
    child.stdin.end(inputLines.map((line) => `${line}\n`).join(''));

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(hardKillTimer);
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(hardKillTimer);
      resolve({
        stdout: Buffer.concat(out).toString('utf8').slice(0, maxBytes),
        stderr: Buffer.concat(err).toString('utf8').slice(0, maxBytes),
        code,
        signal,
        truncated,
        timedOut,
        killedByHarness,
      });
    });
  });
}

/**
 * True when the process finished under its own control.
 *
 * A session the harness killed is not clean, but it is expected for the runaway
 * scenario - callers distinguish the two via `killedByHarness`.
 */
export function exitedCleanly(result) {
  return result.code === 0 && result.signal === null;
}

/** Explain why a session was not clean, for a failure message. */
export function describeExit(result) {
  if (result.timedOut) return 'timed out and was killed by the harness';
  if (result.truncated) return 'exceeded the output cap and was killed by the harness';
  if (result.signal !== null) return `was terminated by signal ${result.signal}`;
  return `exited with status ${result.code}`;
}

/**
 * Run every session of a scenario in order, returning one result per session.
 *
 * Sessions deliberately share `extraEnv` - and therefore any durable store the
 * target uses - because scenario Q-11 exists precisely to check whether the
 * balance survives a restart. Isolation happens *between* scenarios, not
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
