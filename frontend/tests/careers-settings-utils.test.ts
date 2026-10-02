import { describe, it, expect } from "vitest";
import {
  careersUrls,
  normalizeOrigin,
  sameOrigins,
} from "@/app/(dashboard)/settings/careers-page/lib/careers-utils";

describe("normalizeOrigin", () => {
  it("keeps a plain origin as it is", () => {
    expect(normalizeOrigin("https://jobs.example.com")).toEqual({ ok: true, origin: "https://jobs.example.com" });
  });

  it("matches what a browser sends: no path, no trailing slash, lower-case host, default port dropped", () => {
    expect(normalizeOrigin("https://Jobs.Example.com/careers/?x=1")).toEqual({ ok: true, origin: "https://jobs.example.com" });
    expect(normalizeOrigin("https://example.com:443/")).toEqual({ ok: true, origin: "https://example.com" });
    expect(normalizeOrigin("http://localhost:3000/")).toEqual({ ok: true, origin: "http://localhost:3000" });
  });

  it("adds https when the scheme is left off", () => {
    expect(normalizeOrigin("  jobs.example.com ")).toEqual({ ok: true, origin: "https://jobs.example.com" });
  });

  it("rejects empty input, other schemes and things that are not addresses", () => {
    for (const bad of ["", "   ", "ftp://example.com", "javascript:alert(1)", "not a url", "https://intranet"]) {
      expect(normalizeOrigin(bad).ok, bad).toBe(false);
    }
  });
});

describe("sameOrigins", () => {
  it("compares the lists in order", () => {
    expect(sameOrigins(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrigins(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameOrigins(["a"], [])).toBe(false);
  });
});

describe("careersUrls", () => {
  it("builds the addresses from the app base, ignoring a trailing slash", () => {
    const u = careersUrls("https://ats.example.com/");
    expect(u.page).toBe("https://ats.example.com/careers");
    expect(u.jobsApi).toBe("https://ats.example.com/api/public/jobs");
    expect(u.embed).toContain('src="https://ats.example.com/embed.js"');
    expect(u.embed).toContain('data-instance="https://ats.example.com"');
  });
});
