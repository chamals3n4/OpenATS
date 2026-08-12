import { describe, it, expect } from "vitest";
import { parseRoomId } from "../../src/shared/auth/job-access";

describe("parseRoomId", () => {
  it("accepts positive integers", () => {
    expect(parseRoomId(1)).toBe(1);
    expect(parseRoomId(4242)).toBe(4242);
  });

  it("accepts numeric strings, since socket payloads are untyped", () => {
    expect(parseRoomId("7")).toBe(7);
  });

  it("rejects values that are not usable row ids", () => {
    for (const bad of [
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      "",
      "abc",
      "1; DROP TABLE jobs",
      null,
      undefined,
      {},
      [],
      true,
    ]) {
      expect(parseRoomId(bad)).toBeNull();
    }
  });
});
