import { describe, expect, it } from "vitest";
import { cleanCvText, MAX_CV_CHARS } from "../../src/modules/candidate/cv-text/clean";
import { detectFileType } from "../../src/modules/candidate/cv-text/detect";
import { findColumnGap, pageToText, toLines, type TextItem } from "../../src/modules/candidate/cv-text/layout";
import { normalizeForSearch } from "../../src/modules/candidate/cv-text/normalize-search";
import { hasUsableText } from "../../src/modules/candidate/cv-text/quality";
import { extractCvText, UnreadableCvError } from "../../src/modules/candidate/cv-text";
import { buildPdf, type PdfLine } from "../helpers/pdf";

const item = (str: string, x: number, y: number, width = str.length * 5): TextItem => ({
  str,
  x,
  y,
  width,
  height: 10,
});

describe("detectFileType", () => {
  it("reads the type from the bytes, not from a name", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7\n..."))).toBe("pdf");
    expect(detectFileType(Buffer.from("\n\n%PDF-1.4"))).toBe("pdf");
    expect(
      detectFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("..word/document.xml..")])),
    ).toBe("docx");
  });

  it("rejects anything else, including a zip that is not a Word file", () => {
    expect(detectFileType(Buffer.from("<html>%PDF</html>"))).toBeNull();
    expect(detectFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("evil.exe")]))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe("cleanCvText", () => {
  it("folds ligatures and non-breaking spaces", () => {
    expect(cleanCvText("Certiﬁed oﬃce manager")).toBe("Certified office manager");
  });

  it("removes characters Postgres refuses or that break matching", () => {
    expect(cleanCvText("Nur\u0000se​ at­ ward﻿")).toBe("Nurse at ward");
  });

  it("joins a word split across two lines, but keeps a real hyphen", () => {
    expect(cleanCvText("ten years of experi-\nence in audit")).toBe("ten years of experience in audit");
    expect(cleanCvText("a full-time role")).toBe("a full-time role");
    expect(cleanCvText("2019 -\n2023")).toBe("2019 -\n2023");
  });

  it("closes up headings typed with a space between every letter", () => {
    expect(cleanCvText("E X P E R I E N C E")).toBe("EXPERIENCE");
    expect(cleanCvText("W O R K  H I S T O R Y")).toBe("WORK HISTORY");
    expect(cleanCvText("Grade A in B and C")).toBe("Grade A in B and C");
  });

  it("normalises bullets, spaces and blank lines", () => {
    expect(cleanCvText("•  Wound   care\r\n▪ Triage\n\n\n\nEducation  ")).toBe(
      "- Wound care\n- Triage\n\nEducation",
    );
  });

  it("caps the length", () => {
    expect(cleanCvText("word ".repeat(MAX_CV_CHARS)).length).toBeLessThanOrEqual(MAX_CV_CHARS);
  });
});

describe("normalizeForSearch", () => {
  it("keeps C++, C# and C apart", () => {
    expect(normalizeForSearch("C, C++ and C#")).toBe("C, cplusplus and csharp");
    expect(normalizeForSearch("c ++ / F#")).toBe("cplusplus / fsharp");
  });

  it("rewrites .NET without touching an email address or a website", () => {
    expect(normalizeForSearch("ASP.NET and .NET Core")).toBe("ASP dotnet and dotnet Core");
    expect(normalizeForSearch("mail me at jane@mail.net or www.site.net")).toBe(
      "mail me at jane@mail.net or www.site.net",
    );
  });

  it("lets Node.js be found by node, nodejs and node.js", () => {
    expect(normalizeForSearch("Node.js, React.js")).toBe("Node Nodejs, React Reactjs");
  });

  it("leaves ordinary text alone, in any sector", () => {
    const text = "Registered nurse, ICU. Welding (MIG/TIG). ACCA part-qualified. 5+ years.";
    expect(normalizeForSearch(text)).toBe(text);
  });
});

describe("hasUsableText", () => {
  const paragraph = "Staff nurse with eight years of experience in intensive care units. ".repeat(6);

  it("accepts real text", () => {
    expect(hasUsableText(paragraph, 1)).toBe(true);
  });

  it("rejects a scan: pages but almost no text", () => {
    expect(hasUsableText("", 2)).toBe(false);
    expect(hasUsableText("Scanned by CamScanner", 1)).toBe(false);
    expect(hasUsableText(paragraph, 10)).toBe(false);
  });

  it("rejects symbols from a font with no character map", () => {
    expect(hasUsableText("□� ".repeat(100), 1)).toBe(false);
  });
});

describe("page layout", () => {
  it("joins touching runs into one word and separated runs with a space", () => {
    expect(toLines([item("Regis", 50, 700, 25), item("tered", 75, 700, 25), item("Nurse", 110, 700)])).toEqual([
      "Registered Nurse",
    ]);
  });

  it("orders lines top to bottom whatever order they were drawn in", () => {
    expect(toLines([item("second", 50, 600), item("first", 50, 700)])).toEqual(["first", "second"]);
  });

  const twoColumns = (): TextItem[] => {
    const items: TextItem[] = [item("JANE PERERA - SENIOR ACCOUNTANT - COLOMBO, SRI LANKA", 50, 800, 480)];
    for (let row = 0; row < 12; row++) {
      // Drawn straight across the page, the way many CV builders write the file.
      items.push(item(`left ${row}`, 50, 760 - row * 14, 120));
      items.push(item(`right ${row}`, 320, 760 - row * 14, 200));
    }
    return items;
  };

  it("finds no column gap on a single-column page", () => {
    const items = Array.from({ length: 30 }, (_, row) => item("a full width line of text", 50, 780 - row * 14, 480));
    expect(findColumnGap(items, 595)).toBeNull();
  });

  it("finds no column gap when short lines only fill the left of the page", () => {
    const items = Array.from({ length: 30 }, (_, row) => item("short line", 50, 780 - row * 14, 90));
    expect(findColumnGap(items, 595)).toBeNull();
  });

  it("reads a two-column page one column at a time, after the full-width header", () => {
    const lines = pageToText(twoColumns(), 595).split("\n");
    expect(lines[0]).toContain("JANE PERERA");
    expect(lines.slice(1, 13)).toEqual(Array.from({ length: 12 }, (_, row) => `left ${row}`));
    expect(lines.slice(13)).toEqual(Array.from({ length: 12 }, (_, row) => `right ${row}`));
  });
});

describe("extractCvText", () => {
  const cv = (): PdfLine[] => [
    { text: "Nimal Fernando", x: 50, y: 800 },
    { text: "Registered Nurse, Kandy General Hospital", x: 50, y: 780 },
    { text: "Eight years of experience in intensive care and emergency wards.", x: 50, y: 750 },
    { text: "Triage, wound care, patient records and ventilator management.", x: 50, y: 735 },
    { text: "Trained junior staff on infection control and medication rounds.", x: 50, y: 720 },
    { text: "Diploma in Nursing, National School of Nursing, 2014.", x: 50, y: 690 },
    { text: "Also comfortable with C++ and Node.js for hospital reporting tools.", x: 50, y: 660 },
  ];

  it("reads a real PDF from start to finish", async () => {
    const result = await extractCvText(buildPdf([cv()]));

    expect(result.status).toBe("done");
    expect(result.fileType).toBe("pdf");
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Registered Nurse, Kandy General Hospital");
    expect(result.text).toContain("C++ and Node.js");
    expect(result.searchText).toContain("cplusplus and Node Nodejs");
  });

  it("reports a PDF with no text as empty, not as a failure", async () => {
    const result = await extractCvText(buildPdf([[]]));
    expect(result.status).toBe("empty");
    expect(result.text).toBe("");
  });

  it("refuses a file that is not a PDF", async () => {
    await expect(extractCvText(Buffer.from("<html>hello</html>"))).rejects.toBeInstanceOf(UnreadableCvError);
  });

  it("does not disturb the caller's bytes, so the same file can be read twice", async () => {
    const file = buildPdf([cv()]);
    await extractCvText(file);
    expect((await extractCvText(file)).status).toBe("done");
  });
});
