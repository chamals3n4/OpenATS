import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { splitSnippet } from "@/app/(dashboard)/candidates/lib/candidate-utils";
import { CvTextSection, experienceLabel } from "@/app/(dashboard)/candidates/[id]/_components/sections/cv-text-section";
import type { CandidateCvText } from "@/types";

afterEach(cleanup);

describe("splitSnippet", () => {
  it("separates the matched words from the text around them", () => {
    expect(splitSnippet("Registered [[Nurse]] at [[Kandy]] General")).toEqual([
      { text: "Registered ", match: false },
      { text: "Nurse", match: true },
      { text: " at ", match: false },
      { text: "Kandy", match: true },
      { text: " General", match: false },
    ]);
  });

  it("returns text with no marks as one plain part", () => {
    expect(splitSnippet("Ten years on site")).toEqual([{ text: "Ten years on site", match: false }]);
    expect(splitSnippet("")).toEqual([]);
  });

  it("keeps markup from a CV as text, and an unclosed mark as it is", () => {
    expect(splitSnippet("<script>alert(1)</script> [[nurse]]")).toEqual([
      { text: "<script>alert(1)</script> ", match: false },
      { text: "nurse", match: true },
    ]);
    expect(splitSnippet("half [[open")).toEqual([{ text: "half [[open", match: false }]);
  });
});

describe("CvTextSection", () => {
  const cv = (status: CandidateCvText["status"], text: string | null = null): CandidateCvText => ({
    status,
    method: "text",
    text,
    pageCount: 1,
  });

  it("shows the text, with markup from the file left as text", () => {
    const { container } = render(
      <CvTextSection cvText={cv("done", "Registered Nurse\n<img src=x onerror=alert(1)>")} hasResume />,
    );
    expect(screen.getByText(/Registered Nurse/)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the CV by section, under the heading the candidate wrote", () => {
    render(
      <CvTextSection
        hasResume
        cvText={{
          ...cv("done", "whole text"),
          sections: [
            { key: "header", heading: null, text: "Nimal Fernando" },
            { key: "experience", heading: "EMPLOYMENT HISTORY", text: "Staff Nurse, 2018 - 2026" },
          ],
          experienceYears: 8.2,
          educationLevel: "diploma",
        }}
      />,
    );
    expect(screen.getByText("Top of the CV")).toBeTruthy();
    expect(screen.getByText("EMPLOYMENT HISTORY")).toBeTruthy();
    expect(screen.getByText("Staff Nurse, 2018 - 2026")).toBeTruthy();
    expect(screen.getByText("About 8 years")).toBeTruthy();
    expect(screen.getByText("Diploma")).toBeTruthy();
    expect(screen.queryByText("whole text")).toBeNull();
  });

  it("says Not found, never zero, when an estimate could not be made", () => {
    render(<CvTextSection hasResume cvText={cv("done", "Some text")} />);
    expect(screen.getAllByText("Not found")).toHaveLength(2);
    expect(screen.getByText("Some text")).toBeTruthy();
  });

  it("says why there is no text", () => {
    const { rerender } = render(<CvTextSection cvText={cv("empty")} hasResume />);
    expect(screen.getByText(/may be a scan or a photo/)).toBeTruthy();

    rerender(<CvTextSection cvText={cv("failed")} hasResume />);
    expect(screen.getByText(/could not be read/)).toBeTruthy();

    rerender(<CvTextSection cvText={cv("pending")} hasResume />);
    expect(screen.getByText(/Reading the CV/)).toBeTruthy();

    rerender(<CvTextSection cvText={null} hasResume />);
    expect(screen.getByText(/has not been read yet/)).toBeTruthy();

    rerender(<CvTextSection cvText={null} hasResume={false} />);
    expect(screen.getByText(/has no CV/)).toBeTruthy();
  });
});

describe("experienceLabel", () => {
  it("is always worded as an estimate", () => {
    expect(experienceLabel(8.2)).toBe("About 8 years");
    expect(experienceLabel(1.4)).toBe("About 1 year");
    expect(experienceLabel(0.3)).toBe("Under 1 year");
    expect(experienceLabel(0)).toBe("Under 1 year");
    expect(experienceLabel(null)).toBe("Not found");
    expect(experienceLabel(undefined)).toBe("Not found");
  });
});
