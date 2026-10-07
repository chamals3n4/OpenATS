import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ScoreBadge } from "@/components/score-badge";
import { describeParts, scoreTone } from "@/lib/scoring";

afterEach(cleanup);

describe("scoreTone / describeParts", () => {
  it("bands a score", () => {
    expect(scoreTone("85.5")).toBe("high");
    expect(scoreTone(55)).toBe("mid");
    expect(scoreTone(10)).toBe("low");
    expect(scoreTone(null)).toBe("none");
  });

  it("says how many parts a score is built from", () => {
    expect(describeParts(2, 4)).toBe("2 of 4 parts scored");
    expect(describeParts(1, 1)).toBe("1 of 1 part scored");
    expect(describeParts(undefined, 4)).toBeNull();
    expect(describeParts(1, 0)).toBeNull();
  });
});

describe("ScoreBadge", () => {
  it("shows the score with how many parts it rests on", () => {
    render(<ScoreBadge total="83.57" scoredParts={3} weightedParts={4} />);
    expect(screen.getByLabelText("Score 84 out of 100")).toBeTruthy();
    expect(screen.getByLabelText("3 of 4 parts scored").textContent).toBe("3/4");
  });

  it("shows a dash before anything is scored", () => {
    render(<ScoreBadge total={null} scoredParts={0} weightedParts={4} />);
    expect(screen.getByLabelText("Not scored yet").textContent).toBe("—");
  });

  it("flags a knockout and a failed assessment", () => {
    render(<ScoreBadge total="10" knockedOut assessmentPassed={false} />);
    expect(screen.getByText("Knockout")).toBeTruthy();
    expect(screen.getByText("Failed test")).toBeTruthy();
  });

  it("spells the flags out in the full size, and shows none for a pass", () => {
    render(<ScoreBadge size="full" total="10" knockedOut assessmentPassed />);
    expect(screen.getByText("Does not meet requirements")).toBeTruthy();
    expect(screen.queryByText(/Failed/)).toBeNull();
  });
});
