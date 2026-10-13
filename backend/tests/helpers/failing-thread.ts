import { parentPort } from "node:worker_threads";

// A thread script that reports an error of a named kind and exits.
parentPort?.postMessage({ ok: false, name: "UnreadableCvError", message: "The PDF is damaged" });
