import { describe, expect, it } from "vitest";
import { describeRun } from "@/app/(dashboard)/settings/integrations/_components/paraform-sync-log";
import type { ParaformSyncRun } from "@/hooks/queries/use-paraform";

function run(overrides: Partial<ParaformSyncRun>): ParaformSyncRun {
  return {
    id: 1,
    trigger: "scheduled",
    status: "succeeded",
    candidatesImported: 0,
    problems: [],
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("describeRun", () => {
  it("says when nothing was new", () => {
    expect(describeRun(run({}))).toBe("No new candidates");
  });

  it("counts imports, singular and plural", () => {
    expect(describeRun(run({ candidatesImported: 1 }))).toBe("1 new candidate imported");
    expect(describeRun(run({ candidatesImported: 3 }))).toBe("3 new candidates imported");
  });

  it("shows the reason a run failed", () => {
    expect(describeRun(run({ status: "failed", error: "Paraform sign-in expired." }))).toBe(
      "Paraform sign-in expired.",
    );
  });
});
