import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";

const api = {
  fetchAttempt: vi.fn(),
  startAttempt: vi.fn(),
  saveAnswer: vi.fn(),
  completeAttempt: vi.fn(),
};
vi.mock("@/app/assessment/_components/assessment-api", () => ({
  fetchAttempt: (...a: unknown[]) => api.fetchAttempt(...a),
  startAttempt: (...a: unknown[]) => api.startAttempt(...a),
  saveAnswer: (...a: unknown[]) => api.saveAnswer(...a),
  completeAttempt: (...a: unknown[]) => api.completeAttempt(...a),
}));

import { AssessmentClient } from "@/app/assessment/_components/assessment-client";
import { useAssessmentTimer } from "@/app/assessment/hooks/use-assessment-timer";
import type { AttemptData } from "@/app/assessment/_lib/assessment-types";

const attempt = (over: Partial<AttemptData> = {}) =>
  ({
    id: 9,
    status: "started",
    expiresAt: "",
    startedAt: new Date().toISOString(),
    completedAt: null,
    assessment: {
      id: 1,
      title: "Skills test",
      description: null,
      timeLimit: 30,
      questions: [
        { id: 1, title: "Pick one", description: null, questionType: "radio", position: 1, points: 5, options: [{ id: 11, label: "Red", position: 0 }] },
      ],
    },
    candidate: { id: 2, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
    savedAnswers: [{ questionId: 1, answerText: null, optionIds: [11] }],
    ...over,
  }) as AttemptData;

const submit = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Submit assessment" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Continue to submit" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Submit" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAttempt.mockResolvedValue({ data: attempt() });
  api.saveAnswer.mockResolvedValue({});
  api.completeAttempt.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe("submitting", () => {
  it("submits once every answer is saved", async () => {
    render(<AssessmentClient token="tok" />);
    await submit();
    expect(await screen.findByText("Assessment submitted")).toBeTruthy();
    expect(api.completeAttempt).toHaveBeenCalledTimes(1);
  });

  it("does not submit when an answer could not be saved, and lets the candidate try again", async () => {
    api.saveAnswer.mockRejectedValueOnce(new Error("offline"));
    render(<AssessmentClient token="tok" />);
    await submit();

    expect(await screen.findByText(/Some of your answers could not be saved/)).toBeTruthy();
    expect(api.completeAttempt).not.toHaveBeenCalled();

    await submit();
    expect(await screen.findByText("Assessment submitted")).toBeTruthy();
  });
});

describe("starting", () => {
  it("runs the clock from the time the server recorded", async () => {
    api.fetchAttempt.mockResolvedValue({ data: attempt({ status: "pending", startedAt: null, savedAnswers: [] }) });
    // The server says it started ten minutes ago, so twenty of the thirty minutes are left.
    api.startAttempt.mockResolvedValue({ data: { startedAt: new Date(Date.now() - 10 * 60_000).toISOString() } });
    render(<AssessmentClient token="tok" />);

    fireEvent.click(await screen.findByRole("button", { name: "Start the assessment" }));
    const timer = await screen.findByRole("timer");
    await waitFor(() => expect(timer.textContent).toMatch(/^(20:00|19:5\d)$/));
  });
});

describe("useAssessmentTimer", () => {
  it("asks for submission once when time is up, not on every render", () => {
    const expired = attempt({ startedAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    const onTimeUp = vi.fn();
    const { rerender } = renderHook(({ cb }) => useAssessmentTimer("quiz", expired, cb), {
      initialProps: { cb: () => onTimeUp() },
    });
    // A new callback each render is what the screen passes in.
    act(() => rerender({ cb: () => onTimeUp() }));
    act(() => rerender({ cb: () => onTimeUp() }));
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });
});
