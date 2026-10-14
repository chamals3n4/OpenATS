import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const preview = vi.hoisted(() => vi.fn(() => ({ data: undefined, isError: false })));
vi.mock("@/hooks/queries/use-templates", () => ({ useSystemEmailPreview: preview }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { saveQuestions } from "@/app/(dashboard)/assessments/_lib/save-questions";
import { firstQuestionProblem, makeQuestion } from "@/app/(dashboard)/assessments/_lib/assessment-builder-utils";
import type { Question } from "@/app/(dashboard)/assessments/_lib/assessment-builder-types";
import { parseOwnProfile } from "@/lib/users/rules";
import { ProfileDetailsForm } from "@/app/(dashboard)/settings/profile/_components/profile-details-form";
import { AutomaticEmailPreview } from "@/app/(dashboard)/templates/_components/automatic-email-preview";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const question = (over: Partial<Question> = {}): Question => {
  const q = { ...makeQuestion(), title: "Pick one", ...over };
  q.options[0]!.isCorrect = true;
  return q;
};

describe("saving assessment questions", () => {
  it("does not create a question twice, or delete twice, when a save is retried", async () => {
    // A new question, a saved one (10), and a saved one that was removed (11)
    const questions = [question(), question({ dbId: 10 })];
    const savedIds = { current: [10, 11] };
    const deleteQuestion = vi.fn(async () => undefined);
    const createQuestion = vi.fn(async () => ({ data: { id: 50 } }));
    // The first save fails on the last step, after the delete and the create went through
    const updateQuestion = vi.fn(async () => undefined).mockRejectedValueOnce(new Error("network"));
    const onCreated = (uid: number, dbId: number) => {
      questions.find((q) => q.uid === uid)!.dbId = dbId;
    };
    const save = () =>
      saveQuestions({ questions, savedIds, deleteQuestion, updateQuestion, createQuestion, onCreated });

    await expect(save()).rejects.toThrow("network");
    await save();

    expect(deleteQuestion).toHaveBeenCalledTimes(1);
    expect(createQuestion).toHaveBeenCalledTimes(1);
    expect(updateQuestion).toHaveBeenCalledWith(50, expect.anything());
    expect([...savedIds.current].sort()).toEqual([10, 50]);
  });
});

describe("the save check", () => {
  it("blocks an untitled question, like the sidebar", () => {
    expect(firstQuestionProblem([question({ title: "  " })])).toBe("Question 1: add the question.");
    expect(firstQuestionProblem([question()])).toBeNull();
  });
});

describe("parseOwnProfile", () => {
  it("refuses a last name that is not text", () => {
    expect(parseOwnProfile({ firstName: "Chamal", lastName: 42 })).toEqual({
      ok: false,
      error: "Last name must be text.",
    });
    expect(parseOwnProfile({ firstName: "Chamal", lastName: null }).ok).toBe(true);
  });
});

describe("profile details form", () => {
  it("shows a failed save beside the fields, and clears it on edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Could not save." }), { status: 500 })),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProfileDetailsForm firstName="Ada" lastName="Perera" email="ada@example.com" />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Adah" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Could not save.");
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada L" } });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("automatic email preview", () => {
  it("settles after typing stops instead of rendering forever", () => {
    vi.useFakeTimers();
    const view = () => (
      <AutomaticEmailPreview purpose="application_received" subject="Hi" bodyHtml="<p>Hello</p>" />
    );
    const { rerender } = render(view());
    // Any later render, such as the parent's, used to start an endless loop
    rerender(view());

    act(() => vi.advanceTimersByTime(5000));
    const calls = preview.mock.calls.length;
    act(() => vi.advanceTimersByTime(5000));

    expect(preview.mock.calls.length).toBe(calls);
  });
});
