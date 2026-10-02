import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { QuestionType } from "@/app/(dashboard)/jobs/[id]/lib/question-utils";
import { QuestionDialog, QuestionForm } from "@/app/(dashboard)/jobs/[id]/_components/questions/question-form";

type Initial = { title: string; type: QuestionType; required: boolean; options: string[] };
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
          { label: "React", isCorrect: false, position: 1 },
          { label: "Vue", isCorrect: false, position: 2 },
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
});
