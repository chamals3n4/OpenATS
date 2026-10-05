import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const addMutate = vi.fn();
type Row = {
  id: number; interviewId: number; authorId: number; content: string; rating: number | null;
  recommendation: "strong_no" | "no" | "yes" | "strong_yes" | null;
  createdAt: string; updatedAt: string; authorName: string;
  ratings: { criterionId: number; name: string; rating: number }[];
};
let feedbackRows: Row[] = [];
let feedbackMeta: { hasSubmitted: boolean; hiddenCount: number } | undefined;
let criteria: { id: number; jobId: number; name: string; position: number }[] = [];

vi.mock("@/hooks/queries/use-jobs", () => ({
  useScorecard: () => ({ data: { data: criteria } }),
}));
vi.mock("@/hooks/queries/use-user", () => ({
  useCurrentUser: () => ({ data: { data: { id: 7, role: "hiring_manager" } } }),
}));
vi.mock("@/hooks/queries/use-interview-feedback", () => ({
  useInterviewFeedback: () => ({ data: { data: feedbackRows, meta: feedbackMeta }, isLoading: false }),
  useAddInterviewFeedback: () => ({ mutate: addMutate, isPending: false }),
  useDeleteInterviewFeedback: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { InterviewsSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/interviews-section";
import type { CandidateDetail, CandidateInterview } from "@/types";

const at = (local: string) => new Date(local).toISOString();

const interview = (over: Partial<CandidateInterview> = {}): CandidateInterview => ({
  id: 1,
  candidateId: 2,
  stageId: 9,
  jobId: 1,
  eventName: "Technical Interview - Round 01",
  eventType: "virtual",
  meetingUrl: "https://meet.google.com/mth-yqii-ybq",
  bodyText: null,
  status: "scheduled",
  scheduledAt: at("2026-09-11T12:30:00"),
  durationMinutes: 45,
  notes: null,
  outcome: "pending",
  timeSlots: null,
  publicToken: null,
  googleEventId: null,
  stageType: "interview",
  createdBy: 1,
  createdAt: "2026-09-09T09:00:00.000Z",
  updatedAt: "2026-09-09T09:00:00.000Z",
  ...over,
});

const render_ = (interviews: CandidateInterview[], onSchedule = vi.fn()) =>
  render(
    <InterviewsSection
      candidate={{ firstName: "Sanka", interviews } as CandidateDetail}
      stageMap={{ 9: "Screening" }}
      deleteInterviewMutation={{ mutate: vi.fn(), isPending: false } as never}
      onSchedule={onSchedule}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  feedbackRows = [];
  feedbackMeta = undefined;
  criteria = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-09T12:00:00"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("InterviewsSection", () => {
  it("separates upcoming interviews from past ones, with counts", () => {
    render_([
      interview({ id: 1 }),
      interview({ id: 2, eventName: "Intro call", status: "completed", scheduledAt: at("2026-09-01T10:00:00") }),
    ]);
    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    const past = screen.getByRole("region", { name: "Past" });
    expect(within(upcoming).getByText("Technical Interview - Round 01")).toBeTruthy();
    expect(within(past).getByText("Intro call")).toBeTruthy();
  });

  it("shows when, how long, where, and how far away", () => {
    render_([interview()]);
    expect(screen.getByText(/Fri, Sep 11, 2026/)).toBeTruthy();
    expect(screen.getByText("In 2 days")).toBeTruthy();
    expect(screen.getByText("45 minutes")).toBeTruthy();
    expect(screen.getByText("Google Meet")).toBeTruthy();
    expect(screen.getByText("Screening · Virtual")).toBeTruthy();
  });

  it("lets you join an upcoming confirmed meeting, safely in a new tab", () => {
    render_([interview()]);
    const join = screen.getByRole("link", { name: /Join meeting/ });
    expect(join.getAttribute("href")).toBe("https://meet.google.com/mth-yqii-ybq");
    expect(join.getAttribute("target")).toBe("_blank");
    expect(join.getAttribute("rel")).toContain("noopener");
  });

  it("does not offer to join a meeting that is already over", () => {
    render_([interview({ status: "completed", scheduledAt: at("2026-09-01T10:00:00") })]);
    expect(screen.queryByRole("link", { name: /Join meeting/ })).toBeNull();
  });

  it("never turns a non-web meeting link into a link", () => {
    render_([interview({ meetingUrl: "javascript:alert(1)" })]);
    expect(screen.queryByRole("link", { name: /Join meeting/ })).toBeNull();
    expect(screen.getByText("No meeting link yet")).toBeTruthy();
  });

  it("shows the proposed times while waiting for the candidate to choose", () => {
    render_([
      interview({
        status: "pending_schedule",
        scheduledAt: null,
        timeSlots: [
          { datetime: at("2026-09-11T11:30:00"), selected: false },
          { datetime: at("2026-09-11T12:30:00"), selected: false },
        ],
      }),
    ]);
    expect(screen.getByText("Waiting for the candidate to choose a time")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Not scheduled yet")).toBeTruthy();
  });

  it("shows the outcome once it is decided", () => {
    render_([interview({ status: "completed", outcome: "pass", scheduledAt: at("2026-09-01T10:00:00") })]);
    expect(screen.getByText("Passed")).toBeTruthy();
  });

  it("shows the notes", () => {
    render_([interview({ notes: "Bring the laptop" })]);
    expect(screen.getByText("Bring the laptop")).toBeTruthy();
  });
});

describe("feedback", () => {
  it("offers to add feedback when there is none, and counts it when there is", () => {
    render_([interview()]);
    expect(screen.getByRole("button", { name: "Add feedback" })).toBeTruthy();
    cleanup();

    feedbackRows = [
      { id: 1, interviewId: 1, authorId: 3, content: "Strong", rating: 5, recommendation: null, createdAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:00:00Z", authorName: "Chamal", ratings: [] },
    ];
    render_([interview()]);
    expect(screen.getByRole("button", { name: "Feedback (1)" })).toBeTruthy();
  });

  it("submits a scorecard from the candidate page, without leaving it", () => {
    criteria = [
      { id: 11, jobId: 1, name: "Technical skill", position: 1 },
      { id: 12, jobId: 1, name: "Communication", position: 2 },
    ];
    render_([interview()]);
    fireEvent.click(screen.getByRole("button", { name: "Add feedback" }));
    const dialog = screen.getByRole("dialog");

    const submit = within(dialog).getByRole("button", { name: "Submit scorecard" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const technical = within(dialog).getByRole("radiogroup", { name: "Technical skill" });
    fireEvent.click(within(technical).getByRole("radio", { name: /^4 of 5/ }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Yes" }));
    fireEvent.change(within(dialog).getByLabelText("Notes"), { target: { value: "  Great communicator  " } });
    fireEvent.click(submit);

    expect(addMutate).toHaveBeenCalledWith(
      {
        interviewId: 1,
        content: "Great communicator",
        rating: null,
        recommendation: "yes",
        ratings: [{ criterionId: 11, rating: 4 }],
      },
      expect.anything(),
    );
  });

  it("falls back to one overall rating when the job has no criteria", () => {
    render_([interview()]);
    fireEvent.click(screen.getByRole("button", { name: "Add feedback" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(within(dialog).getByRole("radiogroup", { name: "Overall rating" })).getByRole("radio", { name: /^5 of 5/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit scorecard" }));
    expect(addMutate).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, ratings: [] }),
      expect.anything(),
    );
  });

  it("hides other scorecards from an interviewer who has not submitted theirs", () => {
    feedbackMeta = { hasSubmitted: false, hiddenCount: 2 };
    render_([interview()]);
    fireEvent.click(screen.getByRole("button", { name: "Add feedback" }));
    expect(within(screen.getByRole("dialog")).getByText(/2 scorecards are hidden/)).toBeTruthy();
  });
});

describe("empty state", () => {
  it("invites you to schedule the first interview", () => {
    const onSchedule = vi.fn();
    render_([], onSchedule);
    expect(screen.getByText("No interviews yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Schedule interview" }));
    expect(onSchedule).toHaveBeenCalled();
  });
});
