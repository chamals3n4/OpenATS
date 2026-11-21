import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { db } from "../../src/db";
import { pageSettings } from "../../src/db/schema";
import {
  corsAccess,
  frontendOrigin,
  isOriginAllowed,
  pageSettingsService,
} from "../../src/modules/settings/page-settings.service";

// "Allowed origins" limits which websites may use the public API. Listing only the company's own
// website used to lock applicants out of the careers page that OpenATS itself serves.

const COMPANY_SITE = "https://careers.company.example";
const OTHER_SITE = "https://somewhere-else.example";
let before: string[];

const jobsFrom = (headers: Record<string, string>) => request(app).get("/public/jobs").set(headers);

beforeAll(async () => {
  pageSettingsService.clearAllowedOriginsCache();
  before = await pageSettingsService.getAllowedOrigins();
});

afterAll(async () => {
  await pageSettingsService.setAllowedOrigins(before);
});

describe("isOriginAllowed", () => {
  it("allows every origin while the list is empty", () => {
    expect(isOriginAllowed(OTHER_SITE, [])).toBe(true);
  });

  it("allows a listed origin, with or without a trailing slash", () => {
    expect(isOriginAllowed(COMPANY_SITE, [`${COMPANY_SITE}/`])).toBe(true);
    expect(isOriginAllowed(`${COMPANY_SITE}/`, [COMPANY_SITE])).toBe(true);
  });

  it("refuses an origin that is not listed", () => {
    expect(isOriginAllowed(OTHER_SITE, [COMPANY_SITE])).toBe(false);
  });

  it("always allows OpenATS's own frontend, listed or not", () => {
    expect(isOriginAllowed(frontendOrigin(), [COMPANY_SITE])).toBe(true);
  });
});

describe("the public API with only the company website listed", () => {
  beforeAll(async () => {
    await pageSettingsService.setAllowedOrigins([COMPANY_SITE]);
  });

  it("still serves the built-in careers page", async () => {
    expect((await jobsFrom({ Origin: frontendOrigin() })).status).toBe(200);
    // The careers page reaches the API through the Next.js server, which passes the browser's
    // origin along in this header.
    expect((await jobsFrom({ "X-OpenATS-Browser-Origin": frontendOrigin() })).status).toBe(200);
  });

  it("serves the listed website", async () => {
    expect((await jobsFrom({ "X-OpenATS-Browser-Origin": COMPANY_SITE })).status).toBe(200);
  });

  it("refuses another website", async () => {
    const res = await jobsFrom({ "X-OpenATS-Browser-Origin": OTHER_SITE });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Origin not allowed");
  });

  it("lets a request with no origin through: this is not access control", async () => {
    expect((await request(app).get("/public/jobs")).status).toBe(200);
  });
});

describe("corsAccess", () => {
  it("trusts our frontend and listed origins, with or without a list", () => {
    expect(corsAccess(frontendOrigin(), "/api/jobs", [])).toBe("trusted");
    expect(corsAccess(COMPANY_SITE, "/api/jobs", [COMPANY_SITE])).toBe("trusted");
  });

  it("opens /public to every site while the list is empty", () => {
    expect(corsAccess(OTHER_SITE, "/public/jobs/42/apply", [])).toBe("public");
  });

  it("keeps /public closed to unlisted sites once a list is set", () => {
    expect(corsAccess(OTHER_SITE, "/public/jobs", [COMPANY_SITE])).toBe("denied");
  });

  it("never opens the signed-in API to other sites", () => {
    expect(corsAccess(OTHER_SITE, "/api/candidates", [])).toBe("denied");
    expect(corsAccess(OTHER_SITE, "/publicity", [])).toBe("denied");
  });
});

// A custom careers site calls the API from the visitor's browser, which reads the reply only when
// the CORS headers allow its origin.
describe("CORS headers for another website", () => {
  const preflight = (path: string, origin: string) =>
    request(app).options(path).set({ Origin: origin, "Access-Control-Request-Method": "POST" });

  it("allows a custom careers site to apply while the list is empty", async () => {
    await pageSettingsService.setAllowedOrigins([]);
    const res = await preflight("/public/jobs/42/apply", OTHER_SITE);
    expect(res.headers["access-control-allow-origin"]).toBe(OTHER_SITE);
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("allows a listed site, and refuses an unlisted one, once a list is set", async () => {
    await pageSettingsService.setAllowedOrigins([COMPANY_SITE]);
    expect((await preflight("/public/jobs/42/apply", COMPANY_SITE)).headers["access-control-allow-origin"]).toBe(
      COMPANY_SITE,
    );
    expect((await preflight("/public/jobs/42/apply", OTHER_SITE)).headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not open the signed-in API to another site", async () => {
    await pageSettingsService.setAllowedOrigins([]);
    expect((await preflight("/api/candidates", OTHER_SITE)).headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("still allows our own frontend everywhere, with credentials", async () => {
    await pageSettingsService.setAllowedOrigins([COMPANY_SITE]);
    const res = await preflight("/api/candidates", frontendOrigin());
    expect(res.headers["access-control-allow-origin"]).toBe(frontendOrigin());
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});

describe("the list kept in memory", () => {
  it("is not read from the database again until it runs out", async () => {
    await pageSettingsService.setAllowedOrigins([COMPANY_SITE]);
    const now = Date.now();

    // Changed behind the service's back, as another server saving the setting would.
    await db.update(pageSettings).set({ allowedOrigins: [OTHER_SITE] });

    expect(await pageSettingsService.getAllowedOrigins(now + 1_000)).toEqual([COMPANY_SITE]);
    expect(await pageSettingsService.getAllowedOrigins(now + 60_000)).toEqual([OTHER_SITE]);
  });

  it("is replaced at once when the setting is saved here", async () => {
    await pageSettingsService.setAllowedOrigins([COMPANY_SITE]);
    expect(await pageSettingsService.getAllowedOrigins()).toEqual([COMPANY_SITE]);

    await pageSettingsService.setAllowedOrigins([]);
    expect(await pageSettingsService.getAllowedOrigins()).toEqual([]);
  });
});
