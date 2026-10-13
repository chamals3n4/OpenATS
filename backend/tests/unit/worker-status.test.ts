import { describe, it, expect, beforeEach, vi } from "vitest";

const getWorkers = vi.hoisted(() => vi.fn());
vi.mock("../../src/queues/cv-extract/queue", () => ({ cvExtractQueue: { getWorkers } }));

import { clearWorkerStatusCache, getWorkerStatus } from "../../src/queues/worker-status";

beforeEach(() => {
  getWorkers.mockReset();
  clearWorkerStatusCache();
});

describe("getWorkerStatus", () => {
  it("is connected when a worker is listening", async () => {
    getWorkers.mockResolvedValue([{ id: "1" }]);
    expect(await getWorkerStatus()).toBe("connected");
  });

  it("is missing when none is, which is what leaves CVs pending for ever", async () => {
    getWorkers.mockResolvedValue([]);
    expect(await getWorkerStatus()).toBe("missing");
  });

  it("is unknown, not missing, when Redis cannot say", async () => {
    getWorkers.mockRejectedValue(new Error("ERR unknown command 'client'"));
    expect(await getWorkerStatus()).toBe("unknown");
  });

  it("is unknown when Redis does not answer in time, so a page is never left waiting", async () => {
    vi.useFakeTimers();
    getWorkers.mockReturnValue(new Promise(() => undefined));

    const status = getWorkerStatus();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await status).toBe("unknown");
    vi.useRealTimers();
  });

  it("asks Redis again only after a short while", async () => {
    getWorkers.mockResolvedValue([]);
    const now = Date.now();

    await getWorkerStatus(now);
    await getWorkerStatus(now + 5_000);
    expect(getWorkers).toHaveBeenCalledTimes(1);

    // The worker was started in the meantime.
    getWorkers.mockResolvedValue([{ id: "1" }]);
    expect(await getWorkerStatus(now + 20_000)).toBe("connected");
  });
});
