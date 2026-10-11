import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { formatDuration, formatTime } from "@/app/assessment/_lib/assessment-constants";
import { remainingSeconds } from "@/app/assessment/hooks/use-assessment-timer";
import { restoreAnswers, wordCount } from "@/app/assessment/_lib/assessment-utils";
import { QuizScreen } from "@/app/assessment/_components/quiz/quiz-screen";
import { IntroScreen } from "@/app/assessment/_components/screens/intro-screen";
import type { AttemptData, Question } from "@/app/assessment/_lib/assessment-types";

const q = (id: number, questionType: Question["questionType"], labels: string[] = []) =>
  ({
    id,
    title: `Question ${id} text`,
    description: null,
    questionType,
    position: id,
    points: 5,
    options: labels.map((label, i) => ({ id: id * 10 + i, label, position: i })),
  }) as Question;

const questions = [q(1, "radio", ["Red", "Blue"]), q(2, "checkbox", ["One", "Two", "Three"]), q(3, "long_answer")];
const attempt = {
  id: 9,
  status: "started",
  expiresAt: "",
  startedAt: null,
  completedAt: null,
  assessment: { id: 1, title: "Backend skills test", description: "Read carefully.", timeLimit: 45, questions },
  candidate: { id: 2, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
} as AttemptData;

describe("assessment helpers", () => {
  it("formats the clock and the time allowed", () => {
    expect(formatTime(125)).toBe("02:05");
    expect(formatTime(-3)).toBe("00:00");
    expect(formatDuration(45)).toBe("45 minutes");
    expect(formatDuration(1)).toBe("1 minute");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1 hour 30 minutes");
  });

  it("restores saved answers in the shape each kind of question uses", () => {
    expect(
      restoreAnswers(questions, [
        { questionId: 1, answerText: null, optionIds: [11] },
        { questionId: 3, answerText: "Because.", optionIds: [] },
        { questionId: 99, answerText: "gone", optionIds: [] },
      ]),
    ).toEqual({ 1: { optionIds: [11] }, 3: { answerText: "Because." } });
    expect(restoreAnswers(questions, undefined)).toEqual({});
  });

  it("gives the whole limit in seconds before starting, and what is left after", () => {
    expect(remainingSeconds({ ...attempt, status: "pending" })).toBe(45 * 60);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const left = remainingSeconds({ ...attempt, status: "started", startedAt: tenMinutesAgo });
    expect(left).toBeGreaterThan(35 * 60 - 5);
    expect(left).toBeLessThanOrEqual(35 * 60);
  });

  it("counts words", () => {
    expect(wordCount("  two   words ")).toBe(2);
    expect(wordCount("")).toBe(0);
  });
});

describe("IntroScreen", () => {
  it("says how long it is and what the rules are, and starts on request", () => {
    const onStart = vi.fn();
    render(<IntroScreen attempt={attempt} starting={false} onStart={onStart} />);
    expect(screen.getByRole("heading", { name: "Backend skills test" })).toBeTruthy();
    expect(screen.getByText("3 questions")).toBeTruthy();
    expect(screen.getByText("45 minutes")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/When the time runs out, your answers are submitted for you/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start the assessment" }));
    expect(onStart).toHaveBeenCalled();
  });
});

describe("IntroScreen, who it is for", () => {
  afterEach(cleanup);
  const intro = (over: Partial<AttemptData>) =>
    render(<IntroScreen attempt={{ ...attempt, ...over }} starting={false} onStart={() => {}} />);

  it("names the position and the company", () => {
    intro({ jobTitle: "Software Engineer", company: { name: "WSO2" } });
    expect(screen.getByText("Software Engineer at WSO2")).toBeTruthy();
  });

  it("shows whichever of the two is known, and nothing when neither is", () => {
    intro({ jobTitle: null, company: { name: "WSO2" } });
    expect(screen.getByText("WSO2")).toBeTruthy();
    cleanup();
    intro({ jobTitle: null, company: null });
    expect(screen.queryByText(/ at /)).toBeNull();
  });
});

describe("QuizScreen", () => {
  const handlers = {
    onAnswerChange: vi.fn(),
    onAnswerCommit: vi.fn(),
    onNavigate: vi.fn(),
    onQuestionClick: vi.fn(),
    onSubmit: vi.fn(),
  };
  const show = (over: Partial<Parameters<typeof QuizScreen>[0]> = {}) =>
    render(
      <QuizScreen
        attempt={attempt}
        currentQ={0}
        answers={{}}
        timeLeft={1500}
        submitting={false}
        submitError={null}
        saveFailed={false}
        {...handlers}
        {...over}
      />,
    );

  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the question, the clock and how many are answered", () => {
    show({ answers: { 1: { optionIds: [11] } } });
    expect(screen.getByRole("heading", { name: "Question 1 text" })).toBeTruthy();
    expect(screen.getByText(/Question 1 of 3/).textContent).toBe("Question 1 of 3 · 5 points");
    expect(screen.getByRole("timer").textContent).toBe("25:00");
    expect(screen.getByText("1 of 3 answered")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  });

  it("says which position and company it is for, in the top bar", () => {
    show({ attempt: { ...attempt, jobTitle: "Software Engineer", company: { name: "WSO2" } } });
    expect(screen.getByText("Software Engineer at WSO2 · 0 of 3 answered")).toBeTruthy();
  });

  it("records a single choice and saves it straight away", () => {
    show();
    fireEvent.click(screen.getByRole("radio", { name: /Blue/ }));
    expect(handlers.onAnswerChange).toHaveBeenCalledWith(1, { optionIds: [11] });
    expect(handlers.onAnswerCommit).toHaveBeenCalledWith(1, { optionIds: [11] });
  });

  it("adds to and removes from a multiple choice", () => {
    show({ currentQ: 1, answers: { 2: { optionIds: [20] } } });
    expect(screen.getByText("Choose all that apply")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Three/ }));
    expect(handlers.onAnswerChange).toHaveBeenLastCalledWith(2, { optionIds: [20, 22] });
    fireEvent.click(screen.getByRole("checkbox", { name: /One/ }));
    expect(handlers.onAnswerChange).toHaveBeenLastCalledWith(2, { optionIds: [] });
  });

  it("saves a written answer when the box is left", () => {
    show({ currentQ: 2, answers: { 3: { answerText: "Two words" } } });
    const box = screen.getByRole("textbox");
    expect(screen.getByText("2 words")).toBeTruthy();
    fireEvent.blur(box);
    expect(handlers.onAnswerCommit).toHaveBeenCalledWith(3, { answerText: "Two words" });
  });

  it("moves between questions from the buttons and the numbered list", () => {
    show({ currentQ: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(handlers.onNavigate).toHaveBeenCalledWith("next");
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(handlers.onNavigate).toHaveBeenCalledWith("prev");
    fireEvent.click(screen.getByRole("button", { name: "Question 3, not answered" }));
    expect(handlers.onQuestionClick).toHaveBeenCalledWith(2);
  });

  it("shows every question and its state before submitting, then asks to confirm", () => {
    show({ currentQ: 2, answers: { 1: { optionIds: [11] } } });
    fireEvent.click(screen.getByRole("button", { name: "Submit assessment" }));

    const review = screen.getByRole("dialog");
    expect(within(review).getByText("You have answered 1 of 3. Select a question to go back to it.")).toBeTruthy();
    expect(within(review).getByRole("button", { name: /Question 1 text.*Answered/ })).toBeTruthy();
    expect(within(review).getByRole("button", { name: /Question 2 text.*Not answered/ })).toBeTruthy();
    expect(handlers.onSubmit).not.toHaveBeenCalled();

    fireEvent.click(within(review).getByRole("button", { name: "Continue to submit" }));
    const confirm = screen.getByRole("alertdialog");
    expect(within(confirm).getByText(/You have not answered 2 of 3 questions/)).toBeTruthy();
    expect(handlers.onSubmit).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole("button", { name: "Submit" }));
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("goes back to a question picked from the review list", () => {
    show({ currentQ: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Submit assessment" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Question 2 text/ }));
    expect(handlers.onQuestionClick).toHaveBeenCalledWith(1);
    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });

  it("turns the clock red and says so when little time is left", () => {
    show({ timeLeft: 90 });
    expect(screen.getByRole("timer").className).toContain("text-red-700");
    expect(screen.getByText("Less than two minutes left.")).toBeTruthy();
  });

  it("tells the candidate when an answer could not be saved", () => {
    show({ saveFailed: true });
    expect(screen.getByRole("alert").textContent).toContain("We could not save your last answer");
  });
});
