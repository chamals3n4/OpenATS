import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

vi.mock("@/hooks/queries/use-assessments", () => ({
  useAttemptResults: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      data: {
        attempt: {
          id: 1,
          candidateId: 1,
          assessmentId: 1,
          status: "completed",
          startedAt: "2026-09-09T09:00:00.000Z",
          completedAt: "2026-09-09T09:42:00.000Z",
          scoreRaw: 1,
          scoreTotal: 4,
          scorePercentage: "25.00", // Postgres numeric arrives as a string
          passed: null,
          assessmentTitle: "Technical Assessment",
          assessmentDescription: null,
          candidateName: "Sanka Chaturanga",
          candidateEmail: "sanka@example.com",
        },
        questions: [
          {
            id: 10,
            title: "What is Git?",
            description: null,
            questionType: "multiple_choice",
            points: 1,
            position: 1,
            options: [
              { id: 1, label: "A version control system", isCorrect: true },
              { id: 2, label: "A database", isCorrect: false },
            ],
            answer: { answerText: null, selectedOptionIds: [1], pointsEarned: 1 },
          },
          {
            id: 11,
            title: "What is HTTP?",
            description: null,
            questionType: "multiple_choice",
            points: 1,
            position: 2,
            options: [
              { id: 3, label: "A protocol", isCorrect: true },
              { id: 4, label: "A language", isCorrect: false },
            ],
            answer: { answerText: null, selectedOptionIds: [4], pointsEarned: 0 },
          },
          {
            id: 12,
            title: "Explain REST",
            description: null,
            questionType: "short_answer",
            points: 1,
            position: 3,
            options: [],
            answer: { answerText: "Resources over HTTP.", selectedOptionIds: [], pointsEarned: 0 },
          },
          {
            id: 13,
            title: "Name a database",
            description: null,
            questionType: "short_answer",
            points: 1,
            position: 4,
            options: [],
            answer: null,
          },
        ],
      },
    },
  }),
}));

import { AssessmentResultsSheetContent } from "@/app/(dashboard)/candidates/[id]/_components/assessment-results-sheet";

afterEach(cleanup);

describe("AssessmentResultsSheetContent", () => {
  it("shows the score as a whole percentage and the time taken", () => {
    render(<AssessmentResultsSheetContent attemptId={1} />);
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("1 of 4 points")).toBeTruthy();
    expect(screen.getByText("Took 42 minutes")).toBeTruthy();
    expect(screen.getByText("1 of 2 correct")).toBeTruthy();
  });

  it("labels every question with its state", () => {
    render(<AssessmentResultsSheetContent attemptId={1} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]).getByText("Correct")).toBeTruthy();
    expect(within(cards[1]).getByText("Incorrect")).toBeTruthy();
    expect(within(cards[2]).getByText("Needs review")).toBeTruthy();
    expect(within(cards[3]).getByText("Not answered")).toBeTruthy();
  });

  it("marks the candidate's pick and the missed correct answer in words, not only colour", () => {
    render(<AssessmentResultsSheetContent attemptId={1} />);
    const incorrect = screen.getAllByRole("article")[1];
    expect(within(incorrect).getByText("Candidate's answer")).toBeTruthy();
    expect(within(incorrect).getByText("Correct answer")).toBeTruthy();
  });

  it("warns that written answers are not scored, and shows the response", () => {
    render(<AssessmentResultsSheetContent attemptId={1} />);
    expect(screen.getByText(/not scored automatically/i)).toBeTruthy();
    expect(screen.getByText("Resources over HTTP.")).toBeTruthy();
    expect(screen.getByText("No answer submitted")).toBeTruthy();
  });

  it("offers one jump button per question", () => {
    render(<AssessmentResultsSheetContent attemptId={1} />);
    const nav = screen.getByRole("navigation", { name: "Jump to a question" });
    expect(within(nav).getAllByRole("button")).toHaveLength(4);
    expect(within(nav).getByLabelText("Question 2, Incorrect")).toBeTruthy();
  });
});
