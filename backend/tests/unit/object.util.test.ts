import { describe, it, expect } from "vitest";
import { cleanObject } from "../../src/utils/object.utils";

describe("cleanObject", () => {
  it("strips undefined values", () => {
    expect(cleanObject({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
});
