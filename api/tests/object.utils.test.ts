import { describe, it, expect } from "vitest";
import { cleanObject } from "../src/utils/object.utils";

describe("cleanObject", () => {
    it("removes keys whose values are undefined", () => {
        expect(cleanObject({ a: 1, b: undefined })).toEqual({ a: 1 });
    });

    it("returns empty object when all values are undefined", () => {
        expect(cleanObject({ a: undefined, b: undefined })).toEqual({});
    });

    it("returns same shape when no undefined values", () => {
        expect(cleanObject({ a: 1, b: "x", c: false })).toEqual({
            a: 1,
            b: "x",
            c: false,
        });
    });

    it("keeps null (only strips undefined)", () => {
        expect(cleanObject({ a: null, b: undefined })).toEqual({ a: null });
    });

    it("does not strip undefined inside nested objects", () => {
        const nested = { inner: undefined as unknown as undefined };
        expect(cleanObject({ a: 1, b: nested })).toEqual({
            a: 1,
            b: nested,
        });
    });
});