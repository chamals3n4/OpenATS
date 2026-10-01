import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AnswersSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/answer-section";
import type { CandidateDetail } from "@/types";

afterEach(cleanup);

// Only the fields this section reads; the rest of CandidateDetail is irrelevant.
function candidate(
  answers: CandidateDetail["answers"],
  selections: CandidateDetail["selections"],
) {
  return { answers, selections } as CandidateDetail;
}

const answer = (over: Partial<CandidateDetail["answers"][number]> = {}) => ({
  id: 1,
  candidateId: 1,
  questionId: 7,
  answerText: "Five years of TypeScript.",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const selection = (
  over: Partial<CandidateDetail["selections"][number]> = {},
) => ({
  id: 1,
  candidateId: 1,
  questionId: 9,
  optionId: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("AnswersSection", () => {
  it("shows the empty state when there is nothing to display", () => {
    render(<AnswersSection candidate={candidate([], [])} />);

    expect(screen.getByText("No answers submitted")).toBeInTheDocument();
  });

  it("renders a text answer under its question title", () => {
    render(
      <AnswersSection
        candidate={candidate(
          [answer({ questionTitle: "Years of experience?" })],
          [],
        )}
      />,
    );

    expect(screen.getByText("Years of experience?")).toBeInTheDocument();
    expect(
      screen.getByText("Five years of TypeScript."),
    ).toBeInTheDocument();
  });

  it("falls back to the question id when there is no title", () => {
    render(
      <AnswersSection
        candidate={candidate([answer({ questionTitle: null })], [])}
      />,
    );

    expect(screen.getByText("Question #7")).toBeInTheDocument();
  });

  it("says so when a question was left blank", () => {
    render(
      <AnswersSection
        candidate={candidate([answer({ answerText: null })], [])}
      />,
    );

    expect(screen.getByText("No answer given")).toBeInTheDocument();
  });

  it("groups multiple selected options under one question heading", () => {
    render(
      <AnswersSection
        candidate={candidate(
          [],
          [
            selection({
              id: 1,
              questionTitle: "Preferred stack",
              optionLabel: "React",
            }),
            selection({
              id: 2,
              questionTitle: "Preferred stack",
              optionLabel: "Node",
            }),
          ],
        )}
      />,
    );

    expect(screen.getAllByText("Preferred stack")).toHaveLength(1);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node")).toBeInTheDocument();
  });

  it("shows the questions in the order of the application form, whichever kind they are", () => {
    render(
      <AnswersSection
        candidate={candidate(
          [
            answer({ id: 1, questionId: 30, questionTitle: "Why us?", questionPosition: 3, answerText: "Mission" }),
            answer({ id: 2, questionId: 10, questionTitle: "Years of experience?", questionPosition: 1, answerText: "5" }),
          ],
          [
            selection({ id: 1, questionId: 20, questionTitle: "Preferred stack", questionPosition: 2, optionLabel: "React" }),
          ],
        )}
      />,
    );

    const titles = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(titles).toEqual(["Years of experience?", "Preferred stack", "Why us?"]);
    expect(screen.getByText("Question 2")).toBeInTheDocument();
  });

  it("summarises how many questions were answered", () => {
    render(
      <AnswersSection
        candidate={candidate(
          [answer({ id: 1, questionId: 1, answerText: "Yes" }), answer({ id: 2, questionId: 2, answerText: null })],
          [],
        )}
      />,
    );

    expect(screen.getByText(/1 of 2 questions answered/)).toBeInTheDocument();
  });
});
