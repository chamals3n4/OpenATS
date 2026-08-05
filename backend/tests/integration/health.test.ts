import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /health", () => {
  it("reports ok when db and redis are reachable", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.checks).toMatchObject({ db: "ok", redis: "ok" });
  });
});
