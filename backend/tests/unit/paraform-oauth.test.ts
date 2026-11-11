import { createHash, randomBytes } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  createPkcePair,
  emailFromIdToken,
  isRefusedCredentials,
  openState,
  ParaformOAuthError,
  PARAFORM_MCP_URL,
  sealState,
} from "../../src/shared/integrations/paraform/oauth";

beforeAll(() => {
  vi.stubEnv("ENCRYPTION_KEY", randomBytes(32).toString("base64"));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("Paraform sign-in state", () => {
  const pending = { userId: 3, clientId: "client_1", verifier: "secret-verifier" };

  it("round-trips", () => {
    expect(openState(sealState(pending))).toEqual(pending);
  });

  it("does not show the PKCE verifier to anyone the state passes through", () => {
    const state = sealState(pending);
    expect(Buffer.from(state, "base64url").toString("utf8")).not.toContain("secret-verifier");
  });

  it("refuses a state that was changed", () => {
    const state = sealState(pending);
    const tampered = Buffer.from(
      Buffer.from(state, "base64url").toString("utf8").replace(/.$/, (c) => (c === "A" ? "B" : "A")),
      "utf8",
    ).toString("base64url");
    expect(() => openState(tampered)).toThrow("not valid");
  });

  it("refuses an expired state", () => {
    const state = sealState(pending, 0);
    expect(() => openState(state, 11 * 60_000)).toThrow("expired");
  });
});

describe("buildAuthorizeUrl", () => {
  it("asks for a lasting connection to Paraform's MCP server with PKCE", () => {
    const url = new URL(buildAuthorizeUrl({ clientId: "c", redirectUri: "http://x/cb", state: "s", challenge: "ch" }));
    expect(url.origin).toBe("https://login.paraform.com");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("resource")).toBe(PARAFORM_MCP_URL);
  });
});

describe("createPkcePair", () => {
  it("makes the challenge the SHA-256 of the verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
});

describe("emailFromIdToken", () => {
  it("reads the email claim", () => {
    const claims = Buffer.from(JSON.stringify({ email: "cj@example.com" })).toString("base64url");
    expect(emailFromIdToken(`h.${claims}.sig`)).toBe("cj@example.com");
  });

  it("is null for anything else", () => {
    expect(emailFromIdToken(undefined)).toBeNull();
    expect(emailFromIdToken("not-a-jwt")).toBeNull();
  });
});

describe("isRefusedCredentials", () => {
  it("is true only when Paraform refused the credentials, which signing in again fixes", () => {
    expect(isRefusedCredentials(new ParaformOAuthError("x", 400, "invalid_grant"))).toBe(true);
    expect(isRefusedCredentials(new ParaformOAuthError("x", 401, "invalid_client"))).toBe(true);
  });

  it("is false for a temporary failure, so the connection is kept", () => {
    expect(isRefusedCredentials(new ParaformOAuthError("x", 429, "slow_down"))).toBe(false);
    expect(isRefusedCredentials(new ParaformOAuthError("x", 503))).toBe(false);
    expect(isRefusedCredentials(new ParaformOAuthError("Paraform did not return an access token"))).toBe(false);
    expect(isRefusedCredentials(new Error("fetch failed"))).toBe(false);
  });
});
