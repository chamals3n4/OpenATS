import { describe, expect, it } from "vitest";
import { redactUrl } from "../../src/utils/redact-url";

describe("redactUrl", () => {
  it("hides the code and state of a sign-in callback", () => {
    expect(redactUrl("/oauth/paraform/callback?code=abc123&state=xyz")).toBe(
      "/oauth/paraform/callback?code=%5Bredacted%5D&state=%5Bredacted%5D",
    );
  });

  it("keeps parameters that are not secret, so the log is still useful", () => {
    expect(redactUrl("/oauth/google/callback?error=access_denied&state=s")).toBe(
      "/oauth/google/callback?error=access_denied&state=%5Bredacted%5D",
    );
  });

  it("matches names whatever their case, and every copy of a repeated one", () => {
    expect(redactUrl("/x?Token=a&token=b")).not.toMatch(/=a|=b/);
  });

  it("leaves a URL without secrets exactly as it was", () => {
    expect(redactUrl("/api/candidates?page=2&search=a%20b")).toBe("/api/candidates?page=2&search=a%20b");
    expect(redactUrl("/health")).toBe("/health");
  });
});
