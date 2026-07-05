import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import * as path from 'node:path';
import type { Readable, Writable } from 'node:stream';

import { getEnhancedPath } from '../../../utils/env';
import {
  resolveWindowsCmdShimSpawnSpec,
  terminateSpawnedProcess,
  type WindowsCmdShimSpawnSpec,
} from '../../../utils/windowsCmdShim';

const SIGKILL_TIMEOUT_MS = 3_000;
const STDERR_BUFFER_LIMIT = 8_000;

export interface ReasonixSubprocessLaunchSpec {
  args: string[];
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export class ReasonixSubprocess {
  private closeError: Error | null = null;
  private proc: ChildProcessWithoutNullStreams | null = null;
  private resolvedSpawnSpec: WindowsCmdShimSpawnSpec | null = null;
  private stderrBuffer = '';

  constructor(private readonly launchSpec: ReasonixSubprocessLaunchSpec) {}

  get stdin(): Writable {
    return this.requireProc().stdin;
  }

  get stdout(): Readable {
    return this.requireProc().stdout;
  }

  private requireProc(): ChildProcessWithoutNullStreams {
    if (!this.proc) {
      throw new Error('Reasonix subprocess is not started');
    }
    return this.proc;
  }

  start(): void {
    if (this.proc) {
      return;
    }

    const resolvedSpawnSpec = resolveWindowsCmdShimSpawnSpec(this.launchSpec);
    this.resolvedSpawnSpec = resolvedSpawnSpec;
    const proc = spawn(resolvedSpawnSpec.command, resolvedSpawnSpec.args, {
      cwd: this.launchSpec.cwd,
      env: {
        ...this.launchSpec.env,
        PATH: getEnhancedPath(
          this.launchSpec.env.PATH,
          path.isAbsolute(this.launchSpec.command) ? this.launchSpec.command : undefined,
        ),
      },
      stdio: 'pipe',
      windowsHide: true,
      ...(resolvedSpawnSpec.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
    });

    proc.stderr.on('data', (chunk: Buffer | string) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      this.stderrBuffer = `${this.stderrBuffer}${text}`.slice(-STDERR_BUFFER_LIMIT);
    });

    proc.on('error', (error) => {
      this.closeError = error;
    });

    proc.on('exit', (code, signal) => {
      const exitError = this.closeError ?? (
        code === 0 && signal === null
          ? undefined
          : new Error(`Reasonix subprocess exited (code ${code}, signal ${signal})`)
      );
      this.exitError = exitError;
    });

    this.proc = proc;
  }

  private exitError: Error | undefined;

  getExitError(): Error | undefined {
    return this.exitError;
  }

  isAlive(): boolean {
    return this.proc !== null && this.proc.exitCode === null && !this.proc.killed;
  }

  getStderrSnapshot(): string {
    return this.stderrBuffer.trim();
  }

  async shutdown(): Promise<void> {
    if (!this.proc || this.proc.exitCode !== null) {
      return;
    }

    await new Promise<void>((resolve) => {
      const proc = this.proc!;
      const onClose = () => {
        cleanup();
        resolve();
      };
      const killTimer = window.setTimeout(() => {
        this.killProc(proc, 'SIGKILL');
      }, SIGKILL_TIMEOUT_MS);
      const cleanup = () => {
        window.clearTimeout(killTimer);
        proc.off('exit', onClose);
      };

      proc.once('exit', onClose);
      this.killProc(proc, 'SIGTERM');
    });
  }

  private killProc(proc: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): boolean {
    return terminateSpawnedProcess(proc, signal, spawn, this.resolvedSpawnSpec);
  }
}
