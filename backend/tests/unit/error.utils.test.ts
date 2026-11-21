import { describe, it, expect } from "vitest";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { getErrorMessage, safeErrorMessage } from "../../src/utils/error.utils";

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

describe("getErrorMessage", () => {
  const TOKEN = "f3a9c1d2e4b5a6978877665544332211";

  it("leaves a failed query's values out of the log, such as a link token", () => {
    const cause = Object.assign(new Error("Connection terminated unexpectedly"), {});
    const error = new DrizzleQueryError("select * from assessment_attempts where token = $1", [TOKEN], cause);

    expect(error.message).toContain(TOKEN);
    const logged = getErrorMessage(error);
    expect(logged).not.toContain(TOKEN);
    expect(logged).toBe("Failed query: select * from assessment_attempts where token = $1: Connection terminated unexpectedly");
  });

  it("keeps what Postgres said and its code", () => {
    const cause = Object.assign(new Error('relation "assessment_attempts" does not exist'), { code: "42P01" });
    const error = new DrizzleQueryError("select 1 from assessment_attempts", [], cause);

    expect(getErrorMessage(error)).toBe(
      'Failed query (42P01): select 1 from assessment_attempts: relation "assessment_attempts" does not exist',
    );
  });

  it("leaves out what Postgres said about a refused value, which repeats it", () => {
    const cause = Object.assign(new Error(`invalid input syntax for type uuid: "${TOKEN}"`), { code: "22P02" });
    const error = new DrizzleQueryError("select * from offers where token = $1", [TOKEN], cause);

    expect(getErrorMessage(error)).toBe("Failed query (22P02): select * from offers where token = $1");
  });

  it("passes any other error's message on", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("plain")).toBe("plain");
  });
});
