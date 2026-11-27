import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
vi.mock("../../src/modules/candidate/ai-models", () => ({ listAiModels: vi.fn(async () => [
  { id: "current-model", name: "Current", lifecycle: "active" },
  { id: "old-model", name: "Old", lifecycle: "deprecated" },
]) }));
import app from "../../src/app";
import { appSettings, db, users } from "../../src/db";
import { decrypt } from "../../src/shared/integrations/crypto";
import { bearer, initTestKeys } from "../helpers/jwt";

const suffix = `ai-settings-${Date.now()}`;
let adminAuth: string, interviewerAuth: string, adminId: number, interviewerId: number;
let previous: typeof appSettings.$inferSelect | undefined;
const originalEncryptionKey = process.env.ENCRYPTION_KEY;

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  [previous] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  await db.delete(appSettings).where(eq(appSettings.id, 1));
  await initTestKeys();
  const admin = await bearer({ email: `admin-${suffix}@example.test`, role: "super_admin" });
  const interviewer = await bearer({ email: `interviewer-${suffix}@example.test`, role: "interviewer" });
  adminAuth = admin.authorization; adminId = admin.user.id;
  interviewerAuth = interviewer.authorization; interviewerId = interviewer.user.id;
});
afterAll(async () => {
  await db.delete(appSettings).where(eq(appSettings.id, 1));
  if (previous) await db.insert(appSettings).values(previous);
  await db.delete(users).where(inArray(users.id, [adminId, interviewerId]));
  if (originalEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalEncryptionKey;
});

describe("AI provider settings routes", () => {
  it("restricts provider changes and model lists to admins, encrypts keys, and rejects deprecated models", async () => {
    expect((await request(app).put("/api/settings/ai").set("Authorization", interviewerAuth).send({ provider: "openai", apiKey: "secret-key" })).status).toBe(403);
    expect((await request(app).get("/api/settings/ai/models").set("Authorization", interviewerAuth)).status).toBe(403);
    const saved = await request(app).put("/api/settings/ai").set("Authorization", adminAuth).send({ provider: "openai", apiKey: "secret-key" });
    expect(saved.status).toBe(200);
    expect(JSON.stringify(saved.body)).not.toContain("secret-key");
    const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
    expect(row!.aiCvApiKeyEncrypted).not.toContain("secret-key");
    expect(decrypt(row!.aiCvApiKeyEncrypted!)).toBe("secret-key");
    expect((await request(app).put("/api/settings/ai/model").set("Authorization", adminAuth).send({ model: "old-model" })).status).toBe(400);
    const model = await request(app).put("/api/settings/ai/model").set("Authorization", adminAuth).send({ model: "current-model" });
    expect(model.status).toBe(200);
    expect(model.body.data.model).toBe("current-model");
    expect((await request(app).delete("/api/settings/ai").set("Authorization", adminAuth)).body.data).toMatchObject({ configured: false, active: false });
  });
});
