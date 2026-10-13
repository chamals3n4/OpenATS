import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /health", () => {
  it("reports ok when db and redis are reachable", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.checks).toMatchObject({ db: "ok", redis: "ok" });
  });

  it("says whether the background worker is running, without failing the check when it is not", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(["connected", "missing", "unknown"]).toContain(res.body.worker);
    // The warning is there exactly when no worker is connected.
    expect("warning" in res.body).toBe(res.body.worker === "missing");
  });
});
