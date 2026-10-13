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

describe("limits per visitor behind a proxy", () => {
  // A job that does not exist: each request is refused for that, and still counts toward the limit.
  const applyFrom = (forwardedFor: string) =>
    request(app)
      .post("/public/jobs/2000000000/apply")
      .set("X-Forwarded-For", forwardedFor)
      .send({ firstName: "A", lastName: "B", email: "a@example.test" });

  it("gives each visitor their own budget, read from the address the proxy passes on", async () => {
    // Five applications in a quarter of an hour is the limit for one visitor.
    for (let i = 0; i < 5; i++) {
      expect((await applyFrom("203.0.113.10")).status).not.toBe(429);
    }
    expect((await applyFrom("203.0.113.10")).status).toBe(429);

    // Someone else, through the same proxy, is not affected.
    expect((await applyFrom("203.0.113.11")).status).not.toBe(429);
  });

  it("goes by the address the proxy added, not one the visitor wrote in themselves", async () => {
    // The proxy appends the real address; anything before it was sent by the visitor.
    for (let i = 0; i < 5; i++) {
      expect((await applyFrom(`198.51.100.${i}, 203.0.113.20`)).status).not.toBe(429);
    }
    expect((await applyFrom("198.51.100.99, 203.0.113.20")).status).toBe(429);
  });
});
