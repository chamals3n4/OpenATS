import path from "node:path";
import { UnreadableCvError, type ExtractedCv } from "./index";
import { runInThread, ThreadTimeoutError } from "./run-in-thread";

/** A CV is a few pages; reading one takes well under a second. This is a generous limit. */
export const CV_EXTRACT_TIMEOUT_MS = 30_000;

// The same file, compiled or not: `.ts` under `pnpm dev` and in tests, `.js` from `dist`.
const THREAD_SCRIPT = path.join(__dirname, `extract-thread${path.extname(__filename)}`);

/**
 * Reads a CV's text on a separate thread, with a time limit.
 *
 * A crafted or simply very complex PDF can keep the PDF reader busy for minutes or for ever. On
 * the worker's own thread that froze everything: no other CV was read, and the queue, unable to
 * renew its hold on the job, handed the same file out again. Here the file gets its own thread,
 * which is stopped when the time is up, and the CV is reported as unreadable so it is not retried.
 */
export async function extractCvTextWithTimeout(
  file: Buffer,
  timeoutMs: number = CV_EXTRACT_TIMEOUT_MS,
): Promise<ExtractedCv> {
  // Its own copy of the bytes, handed over to the thread rather than shared with it.
  const bytes = new Uint8Array(file);

  try {
    return await runInThread<ExtractedCv>(THREAD_SCRIPT, bytes, timeoutMs, [bytes.buffer]);
  } catch (error) {
    if (error instanceof ThreadTimeoutError) {
      throw new UnreadableCvError(
        `Reading this CV took longer than ${Math.round(timeoutMs / 1000)} seconds, so it was stopped`,
      );
    }
    if (error instanceof Error && error.name === "UnreadableCvError") {
      throw new UnreadableCvError(error.message);
    }
    throw error;
  }
}
