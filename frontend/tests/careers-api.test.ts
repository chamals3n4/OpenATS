import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

import { getPublicJob, getPublishedJobs } from "@/app/careers/_lib/careers-api";

const respond = (status: number, body: unknown = {}) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

beforeEach(() => vi.stubEnv("OPENATS_API_URL", "http://api.test"));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getPublicJob", () => {
  it("returns the job", async () => {
    respond(200, { data: { id: 3 } });

    await expect(getPublicJob(3)).resolves.toEqual({ id: 3 });
  });

  it("says a closed or unknown job is not there", async () => {
    respond(404);

    await expect(getPublicJob(3)).resolves.toBeNull();
  });

  it.each([NaN, 0, -1, 1.5])("does not ask the API about id %s", async (id) => {
    respond(200);

    await expect(getPublicJob(id)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when the API fails, so an outage is not shown as a closed job", async () => {
    respond(500);

    await expect(getPublicJob(3)).rejects.toThrow();
  });
});

describe("getPublishedJobs", () => {
  it("throws when the API fails, so an outage is not shown as no open roles", async () => {
    respond(503);

    await expect(getPublishedJobs()).rejects.toThrow();
  });

  it("returns no jobs when there really are none", async () => {
    respond(200, { data: [] });

    await expect(getPublishedJobs()).resolves.toEqual([]);
  });
});
