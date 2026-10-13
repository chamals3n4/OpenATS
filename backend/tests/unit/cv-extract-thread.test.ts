import path from "node:path";
import { describe, it, expect } from "vitest";
import { extractCvText, UnreadableCvError } from "../../src/modules/candidate/cv-text";
import { extractCvTextWithTimeout } from "../../src/modules/candidate/cv-text/extract-with-timeout";
import { runInThread, ThreadTimeoutError } from "../../src/modules/candidate/cv-text/run-in-thread";
import { buildPdf } from "../helpers/pdf";

const helper = (name: string) => path.join(__dirname, "..", "helpers", name);

const cvFile = () =>
  buildPdf([
    [
      { text: "Nimal Fernando", x: 50, y: 800 },
      { text: "Registered Nurse, Kandy General Hospital", x: 50, y: 780 },
      { text: "Eight years of experience in intensive care and emergency wards.", x: 50, y: 750 },
      { text: "Triage, wound care, patient records and ventilator management.", x: 50, y: 735 },
      { text: "Trained junior staff on infection control and medication rounds.", x: 50, y: 720 },
      { text: "Built ward reporting tools in C++ and Node.js.", x: 50, y: 690 },
    ],
  ]);

describe("reading a CV on its own thread", () => {
  it("gives the same result as reading it directly", async () => {
    const direct = await extractCvText(cvFile());
    const threaded = await extractCvTextWithTimeout(cvFile());

    expect(threaded).toEqual(direct);
    expect(threaded.status).toBe("done");
    expect(threaded.text).toContain("Registered Nurse");
  }, 20_000);

  it("reports a file that is not a PDF as unreadable, as the direct call does", async () => {
    await expect(extractCvTextWithTimeout(Buffer.from("just some text"))).rejects.toBeInstanceOf(UnreadableCvError);
  }, 20_000);

  it("leaves the caller's copy of the file untouched", async () => {
    const file = cvFile();
    const before = Buffer.from(file);

    await extractCvTextWithTimeout(file);

    expect(file.equals(before)).toBe(true);
  }, 20_000);
});

describe("runInThread", () => {
  it("stops work that keeps the CPU busy past the time limit", async () => {
    const started = Date.now();

    await expect(runInThread(helper("busy-thread.ts"), null, 1_000)).rejects.toBeInstanceOf(ThreadTimeoutError);

    // Stopped at the limit, not left to run: this thread stayed free to notice the time.
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 20_000);

  it("passes on the kind of error the thread reported", async () => {
    await expect(runInThread(helper("failing-thread.ts"), null, 10_000)).rejects.toMatchObject({
      name: "UnreadableCvError",
      message: "The PDF is damaged",
    });
  }, 20_000);
});
