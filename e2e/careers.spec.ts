import { test, expect } from "@playwright/test";

const API = process.env.OPENATS_API_URL ?? "http://localhost:8080";

test.describe("careers page", () => {
  test("renders the real page, not an error page", async ({ page }) => {
    await page.goto("/careers");

    await expect(
      page.getByRole("heading", { name: "Open roles" }),
    ).toBeVisible();
  });

  test("backend is actually serving job data", async ({ request }) => {
    const res = await request.get(`${API}/public/jobs`);

    expect(res.ok()).toBeTruthy();
    expect(Array.isArray((await res.json()).data)).toBe(true);
  });

  test("tells visitors when there are no openings", async ({ page }) => {
    await page.goto("/careers");

    await expect(
      page.getByText(/no open positions at the moment/i),
    ).toBeVisible();
  });
});
