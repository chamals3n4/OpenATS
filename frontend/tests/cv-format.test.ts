import { describe, it, expect } from "vitest";
import { formatCvSection } from "@/app/(dashboard)/candidates/[id]/_lib/cv-format";

describe("formatCvSection", () => {
  it("joins a summary the PDF broke into lines into one paragraph", () => {
    expect(formatCvSection("summary", "Registered nurse with eight years\nin intensive care.")).toEqual([
      { type: "text", text: "Registered nurse with eight years in intensive care." },
    ]);
  });

  it("turns a dated line into an entry and the lines under it into bullets", () => {
    const blocks = formatCvSection(
      "experience",
      [
        "Senior Staff Nurse, Kandy General Hospital March 2019 - Present",
        "- Triage and ventilator management in a 12 bed",
        "intensive care unit.",
        "- Wound care.",
        "Staff Nurse, Peradeniya Teaching Hospital 2016 – 2019",
        "- Medication rounds.",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      { type: "entry", title: "Senior Staff Nurse, Kandy General Hospital", detail: null, tags: [], date: "March 2019 - Present" },
      { type: "bullets", items: ["Triage and ventilator management in a 12 bed intensive care unit.", "Wound care."] },
      { type: "entry", title: "Staff Nurse, Peradeniya Teaching Hospital", detail: null, tags: [], date: "2016 – 2019" },
      { type: "bullets", items: ["Medication rounds."] },
    ]);
  });

  it("shows the list after a bar as tags, and a single item as plain detail", () => {
    expect(formatCvSection("projects", "OPD Queue | Java 21, Spring Boot, PostgreSQL June 2026")).toEqual([
      { type: "entry", title: "OPD Queue", detail: null, tags: ["Java 21", "Spring Boot", "PostgreSQL"], date: "June 2026" },
    ]);
    expect(formatCvSection("experience", "Welder | Lanka Steel Works 2012 - 2020")).toEqual([
      { type: "entry", title: "Welder", detail: "Lanka Steel Works", tags: [], date: "2012 - 2020" },
    ]);
  });

  it("does not read a year in the middle of a line as its date", () => {
    expect(formatCvSection("other", "Winner, CodeJam 2026 – SLIIT – Won the annual competition")).toEqual([
      { type: "text", text: "Winner, CodeJam 2026 – SLIIT – Won the annual competition" },
    ]);
  });

  it("shows short lists in a skills section as tags, with their label", () => {
    expect(
      formatCvSection("skills", "Backend & APIs: Node.js (Express.js, Koa), Gin, Spring Boot\nTriage, Wound care, Phlebotomy."),
    ).toEqual([
      { type: "tags", label: "Backend & APIs", items: ["Node.js (Express.js, Koa)", "Gin", "Spring Boot"] },
      { type: "tags", label: null, items: ["Triage", "Wound care", "Phlebotomy."] },
    ]);
  });

  it("keeps the full stop of an abbreviation at the end of a tag", () => {
    expect(formatCvSection("skills", "Degrees: B.Sc., Ph.D.")).toEqual([
      { type: "tags", label: "Degrees", items: ["B.Sc.", "Ph.D."] },
    ]);
  });

  it("leaves a sentence with commas as a sentence", () => {
    const sentence = "MIG, TIG and arc welding on structural steel for bridges and high-rise frames, with blueprint reading.";
    expect(formatCvSection("skills", sentence)).toEqual([{ type: "text", text: sentence }]);
  });

  it("keeps every word, whatever the layout", () => {
    const text = "Line one 2020\n- bullet a\nwrapped\nPlain | x\nLabel: a, b\nlast line";
    for (const key of ["header", "experience", "skills", "other", "summary"]) {
      const words = JSON.stringify(formatCvSection(key, text)).replace(/[^a-z0-9]+/gi, " ");
      for (const word of ["Line", "one", "2020", "bullet", "wrapped", "Plain", "x", "Label", "a", "b", "last", "line"]) {
        expect(words).toContain(` ${word} `);
      }
    }
  });

  it("gives nothing for an empty section", () => {
    expect(formatCvSection("experience", "")).toEqual([]);
    expect(formatCvSection("summary", "\n \n")).toEqual([]);
  });
});
