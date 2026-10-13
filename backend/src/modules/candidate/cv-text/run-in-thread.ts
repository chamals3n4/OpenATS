import { Worker } from "node:worker_threads";

/** The thread did not finish in the time it was given, and was stopped. */
export class ThreadTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Did not finish within ${Math.round(timeoutMs / 1000)} seconds`);
    this.name = "ThreadTimeoutError";
  }
}

/** What a thread script posts back: its result, or the error it stopped on. */
export type ThreadReply<T> =
  | { ok: true; value: T }
  | { ok: false; name: string; message: string };

/**
 * Runs a script on its own thread and stops it if it takes too long.
 *
 * Work that keeps the CPU busy cannot be interrupted from the thread it runs on: a timer on that
 * thread never gets its turn. On another thread it can be, and stopping it also frees whatever
 * memory it was holding. The script posts one `ThreadReply` and exits.
 */
export function runInThread<T>(
  script: string,
  workerData: unknown,
  timeoutMs: number,
  transferList: ArrayBuffer[] = [],
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(script, {
      workerData,
      transferList,
      // Run straight from TypeScript under `pnpm dev` and in tests; compiled JavaScript needs nothing.
      execArgv: script.endsWith(".ts") ? ["--import", "tsx"] : [],
    });

    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new ThreadTimeoutError(timeoutMs)));
      void worker.terminate();
    }, timeoutMs);

    worker.once("message", (reply: ThreadReply<T>) => {
      finish(() => {
        if (reply.ok) {
          resolve(reply.value);
          return;
        }
        const error = new Error(reply.message);
        error.name = reply.name;
        reject(error);
      });
      void worker.terminate();
    });
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", (code) =>
      finish(() => reject(new Error(`The thread stopped without an answer (exit code ${code})`))),
    );
  });
}
