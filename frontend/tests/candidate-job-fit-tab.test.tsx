import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { CandidateJobFitTab } from "@/app/(dashboard)/candidates/[id]/_components/candidate-job-fit-tab";
import type { CandidateCvAnalysisPayload } from "@/types";

// Shaped like the real analysis in the dev database.
const analysis = (over: Partial<CandidateCvAnalysisPayload> = {}): CandidateCvAnalysisPayload =>
  ({
    status: "done",
    matchScore: "86.00" as unknown as number,
    matchedSkills: ["Typescript", "React", "PostgreSQL"],
    missingSkills: ["Go"],
    scoreBreakdown: { skills: 41, experience: 25, level: 15, certs: 5 },
    aiSummary: {
      verdict: "strong_fit",
      quickSummary: "High-potential intern with a strong full-stack foundation.",
      strengths: ["Direct match for TypeScript.", "Certified in WSO2."],
      gaps: ["No professional experience with Go."],
      hiringSignal: "Highly recommend for interview.",
    },
    errorMessage: null,
    updatedAt: "2026-09-09T10:00:00Z",
    ...over,
  }) as CandidateCvAnalysisPayload;

const renderTab = (cv: CandidateCvAnalysisPayload | null, resumeUrl: string | null = "https://x/cv.pdf") =>
  render(<CandidateJobFitTab resumeUrl={resumeUrl} cv={cv} />);

afterEach(cleanup);

describe("CandidateJobFitTab", () => {
  it("leads with the score, the verdict and the summary", () => {
    renderTab(analysis());
    expect(screen.getByText("86")).toBeTruthy();
    expect(screen.getByText("Strong fit")).toBeTruthy();
    expect(screen.getByText(/High-potential intern/)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Overall match" }).getAttribute("aria-valuenow")).toBe("86");
  });

  it("shows strengths, gaps and the hiring signal on the page", () => {
    renderTab(analysis());
    expect(screen.getByText("Direct match for TypeScript.")).toBeTruthy();
    expect(screen.getByText("No professional experience with Go.")).toBeTruthy();
    expect(screen.getByText("Highly recommend for interview.")).toBeTruthy();
    expect(screen.queryByText(/AI Overview/)).toBeNull();
  });

  it("has no button or dialog to dig the summary out of: it is all on the page", () => {
    renderTab(analysis());
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("counts matching and missing skills", () => {
    renderTab(analysis());
    const skills = screen.getByRole("heading", { name: "Skills match" }).closest("section")!;
    expect(within(skills).getByText("Matching skills (3)")).toBeTruthy();
    expect(within(skills).getByText("Missing skills (1)")).toBeTruthy();
    expect(within(skills).getByText("Go")).toBeTruthy();
  });

  it("shows the breakdown with each part's points out of its maximum", () => {
    renderTab(analysis());
    const skills = screen.getByRole("progressbar", { name: "Skills vs job requirements" });
    expect(skills.getAttribute("aria-valuenow")).toBe("41");
    expect(skills.getAttribute("aria-valuemax")).toBe("55");
    expect(screen.getByText("Certifications")).toBeTruthy();
  });

  it("says plainly that it was generated automatically", () => {
    renderTab(analysis());
    expect(screen.getByText(/Generated automatically/)).toBeTruthy();
    expect(screen.getByText(/Read the CV before you decide/)).toBeTruthy();
  });

  it("works out a verdict from the score when the analysis has no summary", () => {
    renderTab(analysis({ aiSummary: null, matchScore: 40 as unknown as number }));
    expect(screen.getByText("Weak fit")).toBeTruthy();
    expect(screen.queryByText("Strengths")).toBeNull();
    expect(screen.queryByText("Hiring signal")).toBeNull();
  });

  it("adapts to the width of the space it is in, not the window", () => {
    const { container } = renderTab(analysis());
    expect(container.firstElementChild?.className).toContain("@container");
    expect(container.innerHTML).toContain("@2xl:grid-cols-2");
  });

  it("explains each state it cannot show a result for", () => {
    renderTab(null, null);
    expect(screen.getByText(/No resume on file/)).toBeTruthy();
    cleanup();

    renderTab(null);
    expect(screen.getByText("Job fit has not run for this candidate yet.")).toBeTruthy();
    cleanup();

    renderTab(analysis({ status: "pending" }));
    expect(screen.getByText("Analysing the resume")).toBeTruthy();
    cleanup();

    renderTab(analysis({ status: "failed", errorMessage: "The PDF is password protected." }));
    expect(screen.getByRole("alert").textContent).toContain("The PDF is password protected.");
  });
});
