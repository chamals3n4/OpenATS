import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CvSheet } from "@/app/(dashboard)/candidates/[id]/_components/cv-sheet";
import type { CandidateDetail } from "@/types";

const candidate = (over: Partial<CandidateDetail> = {}) =>
  ({
    id: 2,
    firstName: "Chamal",
    lastName: "Senarathna",
    resumeUrl: "https://example.com/cv.pdf",
    ...over,
  }) as CandidateDetail;

afterEach(cleanup);

describe("CvSheet", () => {
  it("shows whose CV it is", () => {
    render(<CvSheet open onOpenChange={vi.fn()} candidate={candidate()} />);
    const title = screen.getByText("Chamal Senarathna CV");
    expect(title.className).not.toContain("sr-only");
    expect(screen.getByRole("dialog", { name: "Chamal Senarathna CV" })).toBeTruthy();
  });

  it("is about one page wide, set through the selector the sheet itself uses", () => {
    render(<CvSheet open onOpenChange={vi.fn()} candidate={candidate()} />);
    const { className } = screen.getByRole("dialog");
    expect(className).toContain("data-[side=right]:w-[min(840px,100vw)]");
    // The sheet's own width must have been replaced, not left to win.
    expect(className).not.toContain("data-[side=right]:w-3/4");
    expect(className).not.toContain("72vw");
  });

  it("opens the PDF at actual size, not zoomed to fill the frame", () => {
    render(<CvSheet open onOpenChange={vi.fn()} candidate={candidate()} />);
    expect(screen.getByTitle("Candidate CV preview").getAttribute("src")).toBe(
      "/api/candidates/2/resume#zoom=100",
    );
  });

  it("opens the CV in a new tab and closes", () => {
    const onOpenChange = vi.fn();
    render(<CvSheet open onOpenChange={onOpenChange} candidate={candidate()} />);
    const link = screen.getByRole("link", { name: "Open in new tab" });
    expect(link.getAttribute("href")).toBe("/api/candidates/2/resume");
    expect(link.getAttribute("target")).toBe("_blank");
    fireEvent.click(screen.getByRole("button", { name: "Close CV preview" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("says so when there is no CV, without an open-in-new-tab link", () => {
    render(<CvSheet open onOpenChange={vi.fn()} candidate={candidate({ resumeUrl: null })} />);
    expect(screen.getByText("No CV uploaded")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open in new tab" })).toBeNull();
  });
});
