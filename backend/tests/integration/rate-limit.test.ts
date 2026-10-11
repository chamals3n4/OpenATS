import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { expensiveLimiter } from "../../src/middlewares/rate-limit.middleware";

// Limits are per user, so one busy account cannot exhaust everyone's budget.
function appForUser() {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: Number(req.headers["x-test-user"]) } as typeof req.user;
    next();
  });
  app.use(expensiveLimiter);
  app.get("/thing", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

const LIMIT = Number(process.env.RATE_LIMIT_EXPENSIVE ?? 60);

describe("expensiveLimiter", () => {
  it("limits one user and leaves another untouched", async () => {
    const app = appForUser();

    for (let i = 0; i < LIMIT; i++) {
      const res = await request(app).get("/thing").set("x-test-user", "101");
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .get("/thing")
      .set("x-test-user", "101");
    expect(blocked.status).toBe(429);

    // Same IP, different user.
    const other = await request(app).get("/thing").set("x-test-user", "102");
    expect(other.status).toBe(200);
  });

  it("advertises the limit in standard headers", async () => {
    const res = await request(appForUser())
      .get("/thing")
      .set("x-test-user", "103");
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});

import app from "../../src/app";

describe("assessment limits", () => {
  const post = (path: string) => request(app).post(`/public/assessment/${path}`).send({});

  it("lets a candidate save far more than 30 answers, since one is saved on every pick", async () => {
    const statuses = new Set<number>();
    for (let i = 0; i < 45; i++) {
      statuses.add((await post("limit-test-token/answer")).status);
    }
    // The link does not exist, so each one is refused for that reason, never for being too many.
    expect(statuses.has(429)).toBe(false);
  });

  it("keeps submitting possible after many answer saves, and counts each link on its own", async () => {
    expect((await post("limit-test-token/complete")).status).not.toBe(429);

    for (let i = 0; i < 30; i++) await post("busy-token/complete");
    expect((await post("busy-token/complete")).status).toBe(429);
    expect((await post("another-token/complete")).status).not.toBe(429);
  });
});
