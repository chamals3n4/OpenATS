import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientFetch, SESSION_EXPIRED } from "@/lib/client-fetch";

const assign = vi.fn();

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

beforeEach(() => {
  vi.stubGlobal("location", { assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
});

describe("clientFetch", () => {
  it("calls the proxy and returns the body", async () => {
    respond(200, { data: [1] });

    await expect(clientFetch("/jobs?page=2")).resolves.toEqual({ data: [1] });
    expect(fetch).toHaveBeenCalledWith("/api/proxy/jobs?page=2", expect.anything());
  });

  it("throws the message the API gave", async () => {
    respond(409, { error: "That slot was just taken" });

    await expect(clientFetch("/x")).rejects.toThrow("That slot was just taken");
    expect(assign).not.toHaveBeenCalled();
  });

  it("goes to sign in when the session has ended", async () => {
    respond(401, { error: "Your session has ended", code: SESSION_EXPIRED });

    await expect(clientFetch("/x")).rejects.toThrow("Your session has ended");
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("stays put on a 401 from the API with a live session, which would loop", async () => {
    respond(401, { error: "Invalid token: unknown user" });

    await expect(clientFetch("/x")).rejects.toThrow("Invalid token: unknown user");
    expect(assign).not.toHaveBeenCalled();
  });
});
