import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CareersJobsList } from "@/app/careers/_components/careers-jobs-list";
import type { CareerJobRow } from "@/app/careers/_lib/careers-utils";

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
const brand = {
  name: "Acme",
  logoUrl: "https://example.com/logo.png",
  description: "We build tools for hiring teams.\nBased in Colombo.",
  website: "https://acme.example",
};

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

// All in Engineering, and differing only in job type.
const oneDepartment = [
  ...small,
  job(4, { title: "Backend Engineer" }),
  job(5, { title: "Frontend Engineer" }),
  job(6, { title: "Data Engineer" }),
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
    for (const text of ["Internship", "Colombo, Sri Lanka", "Posted today"]) {
      expect(within(link).getByText(text)).toBeTruthy();
    }
    const other = screen.getByRole("link", { name: /Senior QA Engineer/ });
    expect(within(other).getByText("Full-time")).toBeTruthy();
    expect(within(other).getByText("Posted 1 week ago")).toBeTruthy();
  });

  it("lists the newest first and says how many there are", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Software Engineering Intern", "Senior QA Engineer"]);
    expect(screen.getByRole("heading", { level: 2, name: "Open roles" })).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("always has search, however few roles there are", () => {
    render(<CareersJobsList jobs={[small[0]]} brand={brand} />);
    expect(screen.getByRole("textbox", { name: "Search roles" })).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("offers a filter only where there is a real choice", () => {
    render(<CareersJobsList jobs={oneDepartment} brand={brand} />);
    // All the roles are in Engineering, so a department filter would do nothing.
    expect(screen.queryByRole("combobox", { name: "Department" })).toBeNull();
    expect(screen.queryByRole("heading", { name: /^Engineering/ })).toBeNull();
    // They differ in job type, so that filter is offered.
    expect(screen.getByRole("combobox", { name: "Job type" }).textContent).toContain("All job types");
  });

  it("filters by job type", async () => {
    render(<CareersJobsList jobs={oneDepartment} brand={brand} />);
    await choose("Job type", "Internship");
    expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    expect(screen.queryByText("Senior QA Engineer")).toBeNull();
    expect(screen.getByText(/1 of 5/)).toBeTruthy();
  });
});

describe("CareersJobsList with many roles", () => {
  it("groups by department, A to Z, with counts", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Design2", "Engineering2", "People1"]);
    // The roles sit one level below their department.
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(5);
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
    expect(screen.getByText(/2 of 5/)).toBeTruthy();
    expect(screen.queryByText("Recruiter")).toBeNull();
    expect(screen.getByText("Product Designer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("Recruiter")).toBeTruthy();
  });

  it("combines filters and clears them all at once", async () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    await choose("Department", "Design");
    await choose("Location", "Remote");
    expect(screen.getByText(/1 of 5/)).toBeTruthy();
    expect(screen.getByText("Product Designer")).toBeTruthy();
    expect(screen.queryByText("Brand Designer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Department" }).textContent).toContain("All departments");
    expect(screen.getByRole("combobox", { name: "Location" }).textContent).toContain("All locations");
  });

  it("says so when nothing matches", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search roles" }), { target: { value: "astronaut" } });
    expect(screen.getByText("No roles match your search.")).toBeTruthy();
    expect(screen.getByText(/0 of 5/)).toBeTruthy();
  });
});

describe("header", () => {
  it("shows the logo, Careers at the company, the description and the website", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const header = screen.getByRole("banner");
    // Beside the name, which says the same, so screen readers skip it
    expect(header.querySelector("img")?.getAttribute("src")).toBe(brand.logoUrl);
    expect(within(header).getByRole("heading", { level: 1, name: "Careers at Acme" })).toBeTruthy();
    expect(within(header).getByText(/We build tools for hiring teams/)).toBeTruthy();
    const site = within(header).getByRole("link", { name: /Visit website/ });
    expect(site.getAttribute("href")).toBe("https://acme.example");
    expect(site.getAttribute("rel")).toContain("noopener");
  });

  it("keeps the line breaks the description was written with", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.getByText(/We build tools for hiring teams/).className).toContain("whitespace-pre-line");
  });

  it("shortens a long description until asked for the rest", () => {
    const description = `${"word ".repeat(80)}the end`;
    render(<CareersJobsList jobs={small} brand={{ ...brand, description }} />);
    expect(screen.queryByText(/the end/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See more" }));
    expect(screen.getByText(/the end/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "See less" }));
    expect(screen.queryByText(/the end/)).toBeNull();
  });

  it("has no see more when the description fits", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.queryByRole("button", { name: "See more" })).toBeNull();
  });

  it("leaves out the logo, description and website when there are none", () => {
    render(
      <CareersJobsList jobs={small} brand={{ name: "Acme", logoUrl: null, description: null, website: null }} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Careers at Acme" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("banner").querySelector("p")).toBeNull();
    expect(screen.getByRole("banner").querySelector("img")).toBeNull();
    expect(screen.queryByRole("link", { name: /Visit website/ })).toBeNull();
  });

  it("never links a website that is not http(s)", () => {
    render(<CareersJobsList jobs={small} brand={{ ...brand, website: "javascript:alert(1)" }} />);
    expect(screen.queryByRole("link", { name: /Visit website/ })).toBeNull();
  });

  it("falls back to a plain title with no company", () => {
    render(<CareersJobsList jobs={small} brand={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Careers" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("puts the search and the filters on one row below it", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    const row = screen.getByRole("textbox", { name: "Search roles" }).parentElement!.parentElement!;
    expect(row.className).toContain("flex-wrap");
    expect(within(row).getByRole("combobox", { name: "Job type" })).toBeTruthy();
  });
});

describe("search field", () => {
  it("keeps the icon above the field, which briefly transforms while pressed and would hide it", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    const icon = screen.getByRole("textbox", { name: "Search roles" }).parentElement!.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("z-10");
    expect(icon?.getAttribute("class")).toContain("pointer-events-none");
  });

  it("shows focus in both themes, since the dark border would otherwise win", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    const { className } = screen.getByRole("textbox", { name: "Search roles" });
    expect(className).toContain("focus-visible:border-neutral-900");
    expect(className).toContain("dark:focus-visible:border-neutral-300");
  });

  it("is the same height as the dropdowns", () => {
    render(<CareersJobsList jobs={large} brand={brand} />);
    expect(screen.getByRole("textbox", { name: "Search roles" }).className).toContain("h-12!");
    expect(screen.getByRole("combobox", { name: "Job type" }).className).toContain("h-12!");
  });
});

describe("cards", () => {
  it("puts each role in its own card, with nothing moving on hover", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    const { className } = screen.getByRole("link", { name: /Senior QA Engineer/ });
    expect(className).toContain("rounded-lg");
    expect(className).toMatch(/\bborder\b/);
    expect(className).toContain("bg-white");
    expect(className).toContain("motion-reduce:transition-none");
    expect(className).not.toContain("translate");
  });

  it("lines the role, location and type up in columns", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.getByRole("link", { name: /Senior QA Engineer/ }).className).toContain("sm:grid-cols-");
  });

  it("stacks the roles as separate cards with space between them", () => {
    const { container } = render(<CareersJobsList jobs={small} brand={brand} />);
    expect(container.querySelector("ul")?.className).toContain("space-y-2");
  });

  it("has no Apply button, since the role's page is where people apply", () => {
    render(<CareersJobsList jobs={small} brand={brand} />);
    expect(screen.queryByText("Apply")).toBeNull();
  });
});

describe("look", () => {
  it("keeps the job cards to the theme colour, with no hard-coded colours", () => {
    const { container } = render(<CareersJobsList jobs={large} brand={brand} />);
    expect(container.innerHTML).not.toContain("#a9c9c4");
    expect(container.innerHTML).not.toContain("#4d625f");
    expect(container.innerHTML).toContain("hover:border-theme");
  });
});
