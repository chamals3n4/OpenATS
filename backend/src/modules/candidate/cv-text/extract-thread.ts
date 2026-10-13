import { parentPort, workerData } from "node:worker_threads";
import { extractCvText, UnreadableCvError } from "./index";
import type { ThreadReply } from "./run-in-thread";
import type { ExtractedCv } from "./index";

// Runs on its own thread, started by extract-with-timeout.ts: reads one CV and posts the result.
async function main() {
  let reply: ThreadReply<ExtractedCv>;
  try {
    const value = await extractCvText(Buffer.from(workerData as Uint8Array));
    reply = { ok: true, value };
  } catch (error) {
    reply = {
      ok: false,
      // The class does not survive the trip between threads, so the name carries it.
      name: error instanceof UnreadableCvError ? "UnreadableCvError" : error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  parentPort?.postMessage(reply);
}

void main();
