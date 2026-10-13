import { describe, it, expect } from "vitest";
import { resumeContentDisposition } from "../../src/modules/candidate/resume-filename";

describe("resumeContentDisposition", () => {
  it("names the file after the candidate, in lower case", () => {
    expect(resumeContentDisposition("Nimal", "Fernando")).toBe(
      `inline; filename="nimal-fernando-cv.pdf"; filename*=UTF-8''nimal-fernando-cv.pdf`,
    );
  });

  it("turns spaces and punctuation into single hyphens", () => {
    expect(resumeContentDisposition(" Mary Ann ", "O'Neil-Smith")).toContain(
      `filename="mary-ann-o-neil-smith-cv.pdf"`,
    );
  });

  it("cannot be used to add a header or break out of the quotes", () => {
    const header = resumeContentDisposition('a"; x="b', "c\r\nSet-Cookie: d=1");
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.match(/"/g)).toHaveLength(2);
  });

  it("keeps a name that is not ASCII, with a plain name beside it", () => {
    const header = resumeContentDisposition("නිමල්", "Perera");
    expect(header).toContain(`filename="perera-cv.pdf"`);
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1]!)).toBe("නිමල්-perera-cv.pdf".normalize("NFKD"));
  });

  it("falls back to cv.pdf when nothing in the name can be used", () => {
    expect(resumeContentDisposition("නිමල්", "")).toContain(`filename="cv.pdf"`);
  });
});
