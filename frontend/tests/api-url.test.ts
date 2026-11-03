import { afterEach, describe, expect, it, vi } from "vitest";
import { browserApiUrl, runtimeConfigScript, serverApiUrl } from "@/lib/api-url";

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.__OPENATS_API_URL__;
});

describe("serverApiUrl", () => {
  it("uses OPENATS_API_URL, read when called, without a trailing slash", () => {
    vi.stubEnv("OPENATS_API_URL", "http://api:8080/");
    expect(serverApiUrl()).toBe("http://api:8080");
  });

  it("falls back to NEXT_PUBLIC_API_URL, then localhost", () => {
    vi.stubEnv("OPENATS_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
    expect(serverApiUrl()).toBe("https://api.example.test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(serverApiUrl()).toBe("http://localhost:8080");
  });
});

describe("browserApiUrl", () => {
  it("uses the address the page was given", () => {
    window.__OPENATS_API_URL__ = "https://api.acme.test";
    expect(browserApiUrl()).toBe("https://api.acme.test");
  });

  it("falls back to the configured public address", () => {
    vi.stubEnv("OPENATS_PUBLIC_API_URL", "http://localhost:9090/");
    expect(browserApiUrl()).toBe("http://localhost:9090");
  });
});

describe("runtimeConfigScript", () => {
  it("sets the public address for the browser", () => {
    vi.stubEnv("OPENATS_PUBLIC_API_URL", "https://api.acme.test");
    expect(runtimeConfigScript()).toBe('window.__OPENATS_API_URL__="https://api.acme.test";');
  });

  it("cannot be used to end the script tag", () => {
    vi.stubEnv("OPENATS_PUBLIC_API_URL", "https://x.test/</script><script>alert(1)</script>");
    const script = runtimeConfigScript();
    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script>");
  });
});
