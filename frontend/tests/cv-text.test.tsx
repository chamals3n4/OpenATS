import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { splitSnippet } from "@/app/(dashboard)/candidates/_lib/candidate-utils";
import { CvTextSection, experienceLabel } from "@/app/(dashboard)/candidates/[id]/_components/sections/cv-text-section";
import { countMatches, highlightParts, searchPattern } from "@/app/(dashboard)/candidates/[id]/_lib/cv-highlight";
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
            { key: "experience", heading: "EMPLOYMENT HISTORY", text: "Staff Nurse, Kandy General 2018 - 2026\n- Ward rounds" },
            { key: "skills", heading: "Skills", text: "Clinical: Triage, Wound care" },
          ],
          experienceYears: 8.2,
          educationLevel: "diploma",
          contacts: { emails: ["nimal@example.com"], phones: ["+94 77 123 4567"], links: [] },
        }}
      />,
    );
    expect(screen.getByText("Top of the CV")).toBeTruthy();
    expect(screen.getByText("EMPLOYMENT HISTORY")).toBeTruthy();
    // The date is set apart from the line it ended, and short lists are shown as tags.
    expect(screen.getByText("Staff Nurse, Kandy General")).toBeTruthy();
    expect(screen.getByText("2018 - 2026")).toBeTruthy();
    expect(screen.getByText("Ward rounds").tagName).toBe("LI");
    expect(screen.getByText("Triage")).toBeTruthy();
    expect(screen.getByText("Clinical")).toBeTruthy();
    expect(screen.getByText("Wound care")).toBeTruthy();
    expect(screen.getByText("nimal@example.com")).toBeTruthy();
    expect(screen.getByText("+94 77 123 4567")).toBeTruthy();
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

describe("finding words in the CV summary", () => {
  it("looks for each word on its own, in any case, and ignores single letters", () => {
    const pattern = searchPattern("icu NURSE a");
    expect(highlightParts("Nurse in the ICU, a nurse", pattern)).toEqual([
      { text: "Nurse", match: true },
      { text: " in the ", match: false },
      { text: "ICU", match: true },
      { text: ", a ", match: false },
      { text: "nurse", match: true },
    ]);
    expect(countMatches(["Nurse in the ICU", "a nurse"], pattern)).toBe(3);
    expect(searchPattern("  ")).toBeNull();
    expect(searchPattern("a")).toBeNull();
  });

  it("treats what is typed as text, not as a pattern", () => {
    const pattern = searchPattern("c++ (lead)");
    expect(highlightParts("C++ developer (lead)", pattern).filter((p) => p.match).map((p) => p.text)).toEqual([
      "C++",
      "(lead)",
    ]);
  });

  it("marks the matches on the page and says how many there are", () => {
    const { container } = render(
      <CvTextSection
        hasResume
        cvText={{
          status: "done",
          method: "text",
          text: "",
          pageCount: 1,
          sections: [
            { key: "experience", heading: "Experience", text: "Staff Nurse, Kandy 2018 - 2026\n- Nurse educator" },
            { key: "skills", heading: "Skills", text: "Clinical: Triage, Nursing care" },
          ],
        }}
      />,
    );
    const box = screen.getByLabelText("Find in this CV");
    expect(container.querySelectorAll("mark")).toHaveLength(0);

    fireEvent.change(box, { target: { value: "nurs" } });
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["Nurs", "Nurs", "Nurs"]);
    expect(screen.getByRole("status").textContent).toContain("3 matches");

    fireEvent.change(box, { target: { value: "welder" } });
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe("No matches");

    fireEvent.change(box, { target: { value: "" } });
    expect(screen.queryByRole("status")).toBeNull();
  });

  const twoSections: CandidateCvText = {
    status: "done",
    method: "text",
    text: "",
    pageCount: 1,
    sections: [
      { key: "header", heading: null, text: "Nimal Fernando" },
      { key: "experience", heading: "Experience", text: "Nurse one\nNurse two\nNurse three" },
    ],
  };

  it("counts a match in a heading the page supplies, since it is marked too", () => {
    const { container } = render(<CvTextSection hasResume cvText={twoSections} />);
    fireEvent.change(screen.getByLabelText("Find in this CV"), { target: { value: "top" } });
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["Top"]);
    expect(screen.getByRole("status").textContent).toContain("1 match.");
  });

  it("steps through the matches, starting from the last one when going back", () => {
    Element.prototype.scrollIntoView = () => {};
    const { container } = render(<CvTextSection hasResume cvText={twoSections} />);
    const box = screen.getByLabelText("Find in this CV");
    const active = () => [...container.querySelectorAll("mark")].findIndex((m) => m.hasAttribute("data-active"));

    fireEvent.change(box, { target: { value: "nurse" } });
    expect(active()).toBe(-1);
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(active()).toBe(2);
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(active()).toBe(1);

    // Typing again starts over: forward goes to the first, and the end wraps round.
    fireEvent.change(box, { target: { value: "nurs" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(active()).toBe(0);
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(active()).toBe(2);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(active()).toBe(0);
  });
});

describe("a CV that is waiting to be read", () => {
  const cv = (status: CandidateCvText["status"], text: string | null = null): CandidateCvText => ({
    status,
    method: "text",
    text,
    pageCount: 1,
  });

  it("says it takes a few seconds while the background worker is running", () => {
    render(<CvTextSection cvText={cv("pending", "")} hasResume />);
    expect(screen.getByText(/usually takes a few seconds/)).toBeTruthy();
  });

  it("says what is wrong when the background worker is not running", () => {
    render(<CvTextSection cvText={cv("pending", "")} hasResume workerMissing />);

    expect(screen.getByText(/background worker, which is not running/)).toBeTruthy();
    expect(screen.queryByText(/usually takes a few seconds/)).toBeNull();
  });

  it("says the same when the CV has not even been queued yet", () => {
    render(<CvTextSection cvText={null} hasResume workerMissing />);
    expect(screen.getByText(/background worker, which is not running/)).toBeTruthy();
  });

  it("does not blame the worker for a CV that was read", () => {
    render(<CvTextSection cvText={cv("done", "Registered Nurse")} hasResume workerMissing />);
    expect(screen.queryByText(/background worker/)).toBeNull();
  });
});
