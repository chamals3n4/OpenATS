import { describe, it, expect } from "vitest";
import { daysFaster, pctChange } from "../../src/modules/report/report.service";
import { joinName } from "../../src/modules/report/attention.service";

describe("pctChange", () => {
  it("is the percent change from the previous figure", () => {
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 10)).toBe(-50);
    expect(pctChange(10, 10)).toBe(0);
  });
  it("is null when there was nothing to compare with, not a made-up 100%", () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });
});

describe("daysFaster", () => {
  it("is positive when this period was faster and negative when slower", () => {
    expect(daysFaster(8, 10)).toBe(2);
    expect(daysFaster(12.5, 10)).toBe(-2.5);
  });
  it("is null unless both periods have hires, not a fake gain equal to the whole figure", () => {
    expect(daysFaster(8, null)).toBeNull();
    expect(daysFaster(null, 10)).toBeNull();
    expect(daysFaster(null, null)).toBeNull();
  });
});

describe("joinName", () => {
  it("joins first and last, and copes with a missing last name", () => {
    expect(joinName("Ada", "Lovelace")).toBe("Ada Lovelace");
    expect(joinName("Ada", null)).toBe("Ada");
    expect(joinName("Ada", "")).toBe("Ada");
  });
});
