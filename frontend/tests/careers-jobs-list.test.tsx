import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CareersJobsList } from "@/app/careers/_components/careers-jobs-list";
import type { CareerJobRow } from "@/app/careers/lib/careers-utils";

const job = (id: number, over: Partial<CareerJobRow> = {}): CareerJobRow => ({
  id,
  slug: `job-${id}`,
  title: `Role ${id}`,
  employmentType: "full_time",
  location: "Colombo, Sri Lanka",
  departmentName: "Engineering",
  createdAt: "2026-09-02T17:08:00.000Z",
  ...over,
});

// Like the dev data: two published roles, both in Engineering.
const brand = { name: "WSO2", logoUrl: "https://example.com/logo.png" };

const small = [
  job(2, { title: "Senior QA Engineer", createdAt: "2026-09-02T17:08:00.000Z" }),
  job(3, { title: "Software Engineering Intern", employmentType: "internship", createdAt: "2026-09-09T07:42:00.000Z" }),
];

const large = [
  job(1, { title: "Senior QA Engineer" }),
  job(2, { title: "Backend Engineer" }),
  job(3, { title: "Product Designer", departmentName: "Design", location: "Remote" }),
  job(4, { title: "Brand Designer", departmentName: "Design" }),
  job(5, { title: "Recruiter", departmentName: "People", employmentType: "contract" }),
];

// Base UI commits an option click only after the pointer hovers it, and a tick later.
const choose = async (selectName: string, option: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: selectName }));
  const item = screen.getByRole("option", { name: option });
  fireEvent.pointerMove(item);
  fireEvent.mouseMove(item);
  fireEvent.click(item);
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: selectName }).textContent).toContain(option),
  );
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-09T12:00:00"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CareersJobsList with a few roles", () => {
  it("lists each role with what it is, where, and how old it is, linking to its page", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const link = screen.getByRole("link", { name: /Software Engineering Intern/ });
    expect(link.getAttribute("href")).toBe("/careers/3");
    expect(within(link).getByText("Internship · Colombo, Sri Lanka · Posted today")).toBeTruthy();
    expect(screen.getByText("Full-time · Colombo, Sri Lanka · Posted 1 week ago")).toBeTruthy();
  });

  it("lists the newest first and says how many there are", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Software Engineering Intern", "Senior QA Engineer"]);
    expect(screen.getByText("2 open roles")).toBeTruthy();
  });

  it("always has search, even for two roles", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.getByRole("textbox", { name: "Search roles" })).toBeTruthy();
  });

  it("offers a filter only where there is a real choice", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    // Both roles are in Engineering, so a department filter would do nothing.
    expect(screen.queryByRole("combobox", { name: "Department" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    // They differ in job type, so that filter is offered.
    expect(screen.getByRole("combobox", { name: "Job type" }).textContent).toContain("All job types");
  });

  it("filters by job type", async () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    await choose("Job type", "Internship");
    expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    expect(screen.queryByText("Senior QA Engineer")).toBeNull();
    expect(screen.getByText(/Showing 1 of 2 roles/)).toBeTruthy();
  });
});

describe("CareersJobsList with many roles", () => {
  it("groups by department, A to Z, with counts", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Design2", "Engineering2", "People1"]);
  });

  it("offers department, job type and location filters", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    for (const name of ["Department", "Job type", "Location"]) {
      expect(screen.getByRole("combobox", { name })).toBeTruthy();
    }
  });

  it("narrows with the search box and can be cleared", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search roles" }), { target: { value: "designer" } });
    expect(screen.getByText(/Showing 2 of 5 roles/)).toBeTruthy();
    expect(screen.queryByText("Recruiter")).toBeNull();
    expect(screen.getByText("Product Designer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("5 open roles")).toBeTruthy();
    expect(screen.getByText("Recruiter")).toBeTruthy();
  });

  it("combines filters and clears them all at once", async () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    await choose("Department", "Design");
    await choose("Location", "Remote");
    expect(screen.getByText(/Showing 1 of 5 roles/)).toBeTruthy();
    expect(screen.getByText("Product Designer")).toBeTruthy();
    expect(screen.queryByText("Brand Designer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("5 open roles")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Department" }).textContent).toContain("All departments");
    expect(screen.getByRole("combobox", { name: "Location" }).textContent).toContain("All locations");
  });

  it("says so when nothing matches", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search roles" }), { target: { value: "astronaut" } });
    expect(screen.getByText("No roles match your search.")).toBeTruthy();
    expect(screen.getByText(/Showing 0 of 5 roles/)).toBeTruthy();
  });
});

describe("top row", () => {
  it("puts the logo, the title, the search and the filters on one line", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const title = screen.getByRole("heading", { level: 1, name: "Open roles" });
    const bar = title.parentElement!;
    expect(within(bar).getByRole("img", { name: "WSO2" })).toBeTruthy();

    const row = bar.parentElement!;
    expect(row.className).toContain("flex-wrap");
    expect(within(row).getByRole("textbox", { name: "Search roles" })).toBeTruthy();
    expect(within(row).getByRole("combobox", { name: "Job type" })).toBeTruthy();
  });

  it("falls back to the company name when there is no logo, and to just the title with no company", () => {
    render(<CareersJobsList jobs={small} brand={{ name: "WSO2", logoUrl: null }} />);
    expect(screen.getByText("WSO2")).toBeTruthy();
    cleanup();

    render(<CareersJobsList jobs={small} brand={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Open roles" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("no longer shows a company description", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.queryByText(/making the world better place/)).toBeNull();
  });

  it("closes the row with a divider before the roles start", () => {
    const { container } = render(<CareersJobsList jobs={small} brand={brand} />);
    expect(container.querySelector("hr")).toBeTruthy();
  });
});

describe("search field", () => {
  it("keeps the icon above the field, which briefly transforms while pressed and would hide it", () => {
    const { container } = render(<CareersJobsList jobs={small} brand={brand} />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("z-10");
    expect(icon?.getAttribute("class")).toContain("pointer-events-none");
  });

  it("shows focus in both themes, since the dark border would otherwise win", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const { className } = screen.getByRole("textbox", { name: "Search roles" });
    expect(className).toContain("focus-visible:border-neutral-900");
    expect(className).toContain("dark:focus-visible:border-neutral-300");
  });

  it("is the same height as the dropdowns: the 32px the dashboard filter bars use", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.getByRole("textbox", { name: "Search roles" }).className).toContain("h-8!");
    expect(screen.getByRole("combobox", { name: "Job type" }).className).toContain("h-8!");
    expect(screen.getByRole("combobox", { name: "Job type" }).className).not.toContain("h-10");
  });
});

describe("cards", () => {
  it("puts a border around each role, and eases the hover in rather than snapping", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const { className } = screen.getByRole("link", { name: /Senior QA Engineer/ });
    expect(className).toContain("rounded-xl");
    expect(className).toMatch(/\bborder\b/);
    expect(className).toContain("hover:border-neutral-900");
    expect(className).toContain("duration-200");
    expect(className).toContain("ease-out");
    expect(className).toContain("motion-reduce:transition-none");
  });

  it("fills the Apply pill with a layer that sweeps in, so its label is never grey on grey", () => {
    const { container } = render(<CareersJobsList jobs={small} brand={brand} />);
    const fill = container.querySelector(".origin-left");
    expect(fill?.className).toContain("scale-x-0");
    expect(fill?.className).toContain("group-hover:scale-x-100");
    // The label changes colour after the fill starts, not at the same instant.
    const label = screen.getAllByText("Apply")[0];
    expect(label.className).toContain("delay-100");
    expect(label.className).toContain("group-hover:text-white");
  });

  it("stacks the roles as separate cards with space between them", () => {
    const { container } = render(<CareersJobsList jobs={small} brand={brand} />);
    expect(container.querySelector("ul")?.className).toContain("space-y-3");
  });
});

describe("look", () => {
  it("uses neutral colours like the role page, with no hard-coded teal or theme tint", () => {
    const { container } = render(<CareersJobsList jobs={large} brand={brand} />);
    expect(container.innerHTML).not.toContain("#a9c9c4");
    expect(container.innerHTML).not.toContain("#4d625f");
    expect(container.innerHTML).not.toContain("--theme-color");
  });
});
