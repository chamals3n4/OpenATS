import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getApiToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/session", () => ({ getApiToken }));
vi.mock("@/lib/server-fetch", () => ({ pickForwardedHeaders: () => ({ "x-real-ip": "1.2.3.4" }) }));

import { GET, POST } from "@/app/api/proxy/[...path]/route";

const upstream = vi.fn();
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const request = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://app.test/api/proxy/${url}`, init);

beforeEach(() => {
  getApiToken.mockResolvedValue("jwt");
  upstream.mockImplementation(async () => Response.json({ data: 1 }));
  vi.stubGlobal("fetch", upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("api proxy", () => {
  it("forwards path, query, token and body", async () => {
    const res = await POST(
      request("jobs/3?x=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"a":1}',
      }),
      context("jobs", "3"),
    );

    expect(res.status).toBe(200);
    const [url, init] = upstream.mock.calls[0];
    expect(url).toMatch(/\/api\/jobs\/3\?x=1$/);
    expect(init.headers.Authorization).toBe("Bearer jwt");
    expect(init.headers["x-real-ip"]).toBe("1.2.3.4");
    expect(new TextDecoder().decode(init.body)).toBe('{"a":1}');
  });

  it("passes on the API's status and message", async () => {
    upstream.mockResolvedValue(Response.json({ error: "Slot taken" }, { status: 409 }));

    const res = await GET(request("x"), context("x"));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Slot taken" });
  });

  it("reports an ended session without calling the API", async () => {
    getApiToken.mockResolvedValue(null);

    const res = await GET(request("x"), context("x"));

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_EXPIRED");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("refuses requests from another site", async () => {
    const res = await POST(
      request("x", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }),
      context("x"),
    );

    expect(res.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("cannot climb out of /api", async () => {
    const res = await GET(request("x"), context("..", "health"));

    expect(res.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("answers 502 when the API cannot be reached", async () => {
    upstream.mockRejectedValue(new Error("ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(request("x"), context("x"));

    expect(res.status).toBe(502);
  });
});
