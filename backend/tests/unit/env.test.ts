import { describe, it, expect } from "vitest";
import { envSchema, isEncryptionKey, parseTrustProxy } from "../../src/config/env";

const VALID_KEY = Buffer.alloc(32, 7).toString("base64");

const env = (overrides: Record<string, string | undefined> = {}) => ({
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_JWKS_URL: "https://example.test/jwks",
  AUTH_ISSUER: "https://example.test/issuer",
  ENCRYPTION_KEY: VALID_KEY,
  FRONTEND_URL: "http://localhost:3000",
  R2_ENDPOINT: "https://r2.example.test",
  R2_ACCESS_KEY_ID: "id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
  R2_PRIVATE_BUCKET_NAME: "private-bucket",
  R2_PUBLIC_URL: "https://files.example.test",
  RESEND_API_KEY: "resend",
  RESEND_FROM_EMAIL: "no-reply@example.test",
  ...overrides,
});

describe("ENCRYPTION_KEY", () => {
  it("accepts a 32 byte key in base64, which is what `openssl rand -base64 32` gives", () => {
    expect(isEncryptionKey(VALID_KEY)).toBe(true);
    expect(envSchema.safeParse(env()).success).toBe(true);
  });

  it.each([
    ["a short word", "key"],
    ["a 16 byte key", Buffer.alloc(16, 1).toString("base64")],
    ["a 64 byte key", Buffer.alloc(64, 1).toString("base64")],
    ["32 characters that are not base64 of 32 bytes", "abcdefghijklmnopqrstuvwxyz012345"],
    ["a hex key", Buffer.alloc(32, 1).toString("hex")],
    ["a key with other characters in it", `${VALID_KEY.slice(0, -4)}!!!=`],
  ])("refuses %s", (_name, key) => {
    expect(isEncryptionKey(key)).toBe(false);
  });

  it("stops the server at start, and says how to make a key", () => {
    const result = envSchema.safeParse(env({ ENCRYPTION_KEY: "not-a-key" }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("openssl rand -base64 32");
  });
});

describe("TRUST_PROXY", () => {
  it("is one proxy when it is not set", () => {
    expect(parseTrustProxy(undefined)).toBe(1);
    expect(parseTrustProxy("")).toBe(1);
  });

  it("takes a number of proxies", () => {
    expect(parseTrustProxy("2")).toBe(2);
  });

  it("is off for false or 0, when the server is reached directly", () => {
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
  });

  it("takes a list of proxy addresses and subnets", () => {
    expect(parseTrustProxy("10.0.0.0/8, 172.16.0.5")).toEqual(["10.0.0.0/8", "172.16.0.5"]);
    expect(parseTrustProxy("loopback")).toEqual(["loopback"]);
  });

  it("refuses true, which would let anyone choose their own address", () => {
    expect(parseTrustProxy("true")).toBeNull();
    expect(envSchema.safeParse(env({ TRUST_PROXY: "true" })).success).toBe(false);
  });

  it("refuses anything else", () => {
    expect(parseTrustProxy("yes please")).toBeNull();
    expect(envSchema.safeParse(env({ TRUST_PROXY: "nginx" })).success).toBe(false);
  });
});
