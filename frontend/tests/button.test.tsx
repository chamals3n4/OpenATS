import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

afterEach(() => vi.restoreAllMocks());

describe("Button", () => {
  it("renders a link without Base UI's native button warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Button render={<a href="https://example.com/jobs/new" />}>Create New Job</Button>);

    const link = screen.getByRole("link", { name: "Create New Job" });
    expect(link.getAttribute("href")).toBe("https://example.com/jobs/new");
    expect(link.getAttribute("role")).toBeNull();
    expect(link.getAttribute("data-slot")).toBe("button");
    expect(error.mock.calls.flat().join(" ")).not.toContain("nativeButton");
  });

  it("keeps a link's own children and class", () => {
    render(<Button render={<a href="https://example.com/2" className="mine">2</a>} />);

    const link = screen.getByRole("link", { name: "2" });
    expect(link.className).toContain("mine");
    expect(link.className).toContain("inline-flex");
  });

  it("is still a real button by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).tagName).toBe("BUTTON");
  });
});
