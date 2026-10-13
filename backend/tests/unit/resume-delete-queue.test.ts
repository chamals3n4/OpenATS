import { describe, it, expect, beforeEach, vi } from "vitest";

const addBulk = vi.hoisted(() => vi.fn());
vi.mock("bullmq", () => ({
  Queue: class {
    addBulk = addBulk;
  },
}));
vi.mock("../../src/config/redis", () => ({ createRedisConnection: () => ({}) }));

import { requestResumeDeletion } from "../../src/queues/resume-delete/queue";

beforeEach(() => {
  addBulk.mockReset();
});

describe("requestResumeDeletion", () => {
  it("queues one job for each file", async () => {
    await requestResumeDeletion(["resumes/a.pdf", "resumes/b.pdf"]);

    expect(addBulk).toHaveBeenCalledWith([
      { name: "delete", data: { resumeKey: "resumes/a.pdf" } },
      { name: "delete", data: { resumeKey: "resumes/b.pdf" } },
    ]);
  });

  it("leaves out candidates who had no CV", async () => {
    await requestResumeDeletion([null, "resumes/a.pdf", undefined]);
    expect(addBulk.mock.calls[0]![0]).toHaveLength(1);
  });

  it("queues nothing when there are no files", async () => {
    await requestResumeDeletion([null]);
    expect(addBulk).not.toHaveBeenCalled();
  });

  it("does not throw when the queue refuses: the candidate is already deleted", async () => {
    addBulk.mockRejectedValue(new Error("Redis is down"));
    await expect(requestResumeDeletion(["resumes/a.pdf"])).resolves.toBeUndefined();
  });

  it("does not keep the request waiting when Redis never answers", async () => {
    vi.useFakeTimers();
    addBulk.mockReturnValue(new Promise(() => undefined));

    const done = requestResumeDeletion(["resumes/a.pdf"]);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
