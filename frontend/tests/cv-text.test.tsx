import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { splitSnippet } from "@/app/(dashboard)/candidates/lib/candidate-utils";
import { CvTextSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/cv-text-section";
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
