import { describe, it, expect } from "vitest";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { safeErrorMessage } from "../../src/utils/error.utils";

describe("safeErrorMessage", () => {
  it("passes on a message our own code threw", () => {
    expect(safeErrorMessage(new Error("Invalid stage for this job"), "x")).toBe("Invalid stage for this job");
  });

  it("hides a failed query, whose message holds its values", () => {
    const error = new DrizzleQueryError("select * from candidates where email = $1", ["a@b.c"], new Error("boom"));

    expect(error.message).toContain("candidates");
    expect(safeErrorMessage(error, "Failed")).toBe("Failed");
  });

  it("hides a database error", () => {
    const error = Object.assign(new Error('relation "secret" does not exist'), { code: "42P01" });

    expect(safeErrorMessage(error, "Failed")).toBe("Failed");
  });

  it("hides anything wrapping another error", () => {
    expect(safeErrorMessage(new Error("Outer", { cause: new Error("inner") }), "Failed")).toBe("Failed");
  });

  it("hides another library's error class and things that are not errors", () => {
    class ProviderError extends Error {}

    expect(safeErrorMessage(new ProviderError("host 10.0.0.1 refused"), "Failed")).toBe("Failed");
    expect(safeErrorMessage("text", "Failed")).toBe("Failed");
  });
});
