import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OptionDraft, QuestionType } from "@/app/(dashboard)/jobs/[id]/lib/question-utils";
import { QuestionDialog, QuestionForm } from "@/app/(dashboard)/jobs/[id]/_components/questions/question-form";

type Initial = { title: string; type: QuestionType; required: boolean; options: OptionDraft[] };
const blank: Initial = { title: "", type: "short_answer", required: false, options: [] };

afterEach(cleanup);

function setup(initial: Initial = blank, mode: "add" | "edit" = "add") {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <QuestionDialog open onClose={onCancel}>
      <QuestionForm mode={mode} initial={initial} isPending={false} onSubmit={onSubmit} onCancel={onCancel} />
    </QuestionDialog>,
  );
  const user = {
    click: async (el: HTMLElement) => fireEvent.click(el),
    type: async (el: HTMLElement, text: string) => {
      const enter = text.endsWith("{Enter}");
      const value = enter ? text.slice(0, -7) : text;
      fireEvent.change(el, { target: { value } });
      if (enter) fireEvent.keyDown(el, { key: "Enter" });
    },
  };
  return { onSubmit, onCancel, user };
}

describe("QuestionForm", () => {
  it("asks for the question and does not submit without it", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(screen.getByText("Write the question.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a written question with no options", async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/^Question/), "  Github URL ");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Github URL",
      questionType: "short_answer",
      isRequired: true,
      options: [],
    });
  });

  it("shows option rows for a choice question and needs two filled in", async () => {
    const { onSubmit, user } = setup({ ...blank, type: "radio" });
    expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Option 2")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Question/), "Stack?");
    await user.type(screen.getByLabelText("Option 1"), "React");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(screen.getByText(/Add at least 2 options/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Option 2"), "Vue");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        questionType: "radio",
        options: [
          { label: "React", isCorrect: false, points: 0, isKnockout: false, position: 1 },
          { label: "Vue", isCorrect: false, points: 0, isKnockout: false, position: 2 },
        ],
      }),
    );
  });

  it("adds a row with Enter and removes one, never going below two", async () => {
    const { user } = setup({ ...blank, type: "checkbox" });
    await user.type(screen.getByLabelText("Option 1"), "A{Enter}");
    await waitFor(() => expect(screen.getByLabelText("Option 3")).toBeInTheDocument());
    expect(screen.getByLabelText("Option 2")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove option 3" }));
    expect(screen.queryByLabelText("Option 3")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove option 1" })).toBeDisabled();
  });

  it("starts an edit from the saved values and says Save changes", async () => {
    const { onCancel, user } = setup(
      { title: "Notice period", type: "short_answer", required: true, options: [] },
      "edit",
    );
    expect(screen.getByLabelText(/^Question/)).toHaveValue("Notice period");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("keeps scoring off until asked, and sends zero points then", async () => {
    const { onSubmit, user } = setup({ ...blank, type: "radio" });
    expect(screen.queryByLabelText("Points for option 1")).toBeNull();
    await user.type(screen.getByLabelText(/^Question/), "Stack?");
    await user.type(screen.getByLabelText("Option 1"), "React");
    await user.type(screen.getByLabelText("Option 2"), "Vue");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(onSubmit.mock.calls[0]![0].options.every((o: { points: number; isKnockout: boolean }) => o.points === 0 && !o.isKnockout)).toBe(true);
  });

  it("shows points and knockout once scoring is switched on, and sends them", async () => {
    const { onSubmit, user } = setup({ ...blank, type: "radio" });
    await user.click(screen.getByRole("switch", { name: "Score this question" }));
    await user.type(screen.getByLabelText(/^Question/), "Years?");
    await user.type(screen.getByLabelText("Option 1"), "0-1");
    await user.type(screen.getByLabelText("Option 2"), "5+");
    await user.type(screen.getByLabelText("Points for option 2"), "10");
    await user.click(screen.getAllByRole("checkbox", { name: "Knockout" })[0]!);
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { label: "0-1", isCorrect: false, points: 0, isKnockout: true, position: 1 },
          { label: "5+", isCorrect: false, points: 10, isKnockout: false, position: 2 },
        ],
      }),
    );
  });

  it("opens an already-scored question with scoring on", () => {
    setup({
      title: "Years?",
      type: "radio",
      required: false,
      options: [
        { label: "A", points: 5, isKnockout: false },
        { label: "B", points: 0, isKnockout: false },
      ],
    }, "edit");
    expect(screen.getByRole("switch", { name: "Score this question" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Points for option 1")).toHaveValue(5);
  });

  it("explains that typed answers cannot be scored", () => {
    setup();
    expect(screen.getByText(/switch the answer type to Single choice or Multiple choice/i)).toBeInTheDocument();
  });

  it("allows negative points on a tick-any question, but not on a single choice", async () => {
    const { user } = setup({ ...blank, type: "checkbox" });
    await user.click(screen.getByRole("switch", { name: "Score this question" }));
    expect(screen.getByLabelText("Points for option 1")).toHaveAttribute("min", "-100");
    cleanup();
    const second = setup({ ...blank, type: "radio" });
    await second.user.click(screen.getByRole("switch", { name: "Score this question" }));
    expect(screen.getByLabelText("Points for option 1")).toHaveAttribute("min", "0");
  });
});
