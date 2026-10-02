import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => true }));

const createMutate = vi.fn();
const template = {
  id: 7,
  name: "Offer Letter",
  type: "email" as const,
  subject: "Your offer",
  bodyJson: [{ content: "Hello" }],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  createdByName: "Chamal",
};
vi.mock("@/hooks/queries/use-templates", () => ({
  useTemplatesList: () => ({ data: { data: [template], pagination: undefined }, isLoading: false }),
  useCreateTemplate: () => ({ mutate: createMutate, isPending: false }),
  useDeleteTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useBulkDeleteTemplates: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import TemplatesPageClient from "@/app/(dashboard)/templates/_components/templates-client";
import { TemplateTypePicker } from "@/app/(dashboard)/templates/_components/type-picker";
import { DuplicateTemplateDialog } from "@/app/(dashboard)/templates/_components/duplicate-dialog";
import type { Template } from "@/types";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("TemplateTypePicker", () => {
  const open = (pickedType: string | null = "email") => {
    const handlers = { onPickType: vi.fn(), onClose: vi.fn(), onContinue: vi.fn() };
    render(<TemplateTypePicker isOpen pickedType={pickedType} {...handlers} />);
    return handlers;
  };

  it("offers the two types as a proper radio choice, with plain descriptions", () => {
    open();
    const group = screen.getByRole("radiogroup", { name: "Template type" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(within(group).getByRole("radio", { name: /Email/ })).toBeTruthy();
    expect(within(group).getByRole("radio", { name: /Interview Event/ })).toBeTruthy();
    expect(screen.getByText(/rejection or an offer letter/)).toBeTruthy();
    expect(screen.getByText(/pick an interview time/)).toBeTruthy();
  });

  it("shows the current choice as selected", () => {
    open("event");
    expect(screen.getByRole("radio", { name: /Interview Event/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /Email/ }).getAttribute("aria-checked")).toBe("false");
  });

  it("changes the choice and continues", () => {
    const h = open("email");
    fireEvent.click(screen.getByRole("radio", { name: /Interview Event/ }));
    expect(h.onPickType).toHaveBeenCalledWith("event");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(h.onContinue).toHaveBeenCalled();
  });

  it("cannot continue until a type is chosen", () => {
    open(null);
    expect((screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("lists the types as compact rows, one per line, in a dialog a little wider than before", () => {
    open();
    expect(screen.getByRole("radiogroup").className).not.toContain("grid-cols-2");
    const labels = screen.getAllByRole("radio").map((r) => r.closest("label")!);
    // Icon, text and the radio share one row inside each card.
    expect(labels[0].className).toContain("items-center");
    expect(labels[0].className).not.toContain("flex-col");
    expect(screen.getByRole("dialog").className).toContain("sm:max-w-[640px]");
  });

  it("uses neutral icon tiles, not the old blue and purple ones", () => {
    const { baseElement } = render(
      <TemplateTypePicker isOpen pickedType="email" onPickType={vi.fn()} onClose={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(baseElement.innerHTML).not.toMatch(/bg-(blue|purple)-50/);
  });
});

describe("DuplicateTemplateDialog", () => {
  const setup = (over: Partial<Template> = {}, isPending = false) => {
    const h = { onClose: vi.fn(), onConfirm: vi.fn() };
    render(
      <DuplicateTemplateDialog template={{ ...template, ...over } as Template} isPending={isPending} {...h} />,
    );
    return h;
  };

  it("asks for a name, suggesting one and selecting it so typing replaces it", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Duplicate template")).toBeTruthy();
    const input = within(dialog).getByLabelText(/Name of the copy/) as HTMLInputElement;
    expect(input.value).toBe("Offer Letter (copy)");
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("is wide enough for its description to sit on two lines", () => {
    setup();
    expect(screen.getByRole("dialog").className).toContain("sm:max-w-[600px]");
    expect(screen.getByText(/The copy keeps the same type, subject and content/)).toBeTruthy();
  });

  it("creates nothing until the name is confirmed, then sends the trimmed name", () => {
    const h = setup();
    fireEvent.change(screen.getByLabelText(/Name of the copy/), { target: { value: "  Offer Letter v2  " } });
    expect(h.onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create copy" }));
    expect(h.onConfirm).toHaveBeenCalledWith("Offer Letter v2");
  });

  it("can be confirmed with Enter", () => {
    const h = setup();
    fireEvent.submit(screen.getByLabelText(/Name of the copy/).closest("form")!);
    expect(h.onConfirm).toHaveBeenCalledWith("Offer Letter (copy)");
  });

  it("will not create an unnamed copy, and says why", () => {
    const h = setup();
    fireEvent.change(screen.getByLabelText(/Name of the copy/), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Create copy" }));
    expect(h.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Give the copy a name.")).toBeTruthy();
  });

  it("cancels without creating anything", () => {
    const h = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(h.onClose).toHaveBeenCalled();
    expect(h.onConfirm).not.toHaveBeenCalled();
  });

  it("shows progress while creating and locks the buttons", () => {
    setup({}, true);
    expect(screen.getByRole("button", { name: /Creating/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("TemplatesPageClient", () => {
  it("opens the type picker with Email already chosen, so Continue works straight away", () => {
    render(<TemplatesPageClient />);
    fireEvent.click(screen.getByRole("button", { name: /New Template/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: /Email/ }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: /Continue/ }));
    expect(push).toHaveBeenCalledWith("/templates/new?type=email");
  });

  it("asks for a name before duplicating, and only then creates the copy", () => {
    render(<TemplatesPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(createMutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Name of the copy/), { target: { value: "Offer Letter, intern" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create copy" }));

    expect(createMutate).toHaveBeenCalledWith(
      { name: "Offer Letter, intern", type: "email", subject: "Your offer", bodyJson: template.bodyJson },
      expect.anything(),
    );
  });

  it("confirms the copy with a toast that can open it", async () => {
    render(<TemplatesPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create copy" }));

    createMutate.mock.calls[0][1].onSuccess({ data: { id: 42 } });
    expect(toast.success).toHaveBeenCalledWith(
      'Created "Offer Letter (copy)"',
      expect.objectContaining({ action: expect.objectContaining({ label: "Open" }) }),
    );
    (toast.success as ReturnType<typeof vi.fn>).mock.calls[0][1].action.onClick();
    expect(push).toHaveBeenCalledWith("/templates/42/edit");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("reports a failed copy instead of failing silently", () => {
    render(<TemplatesPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create copy" }));
    createMutate.mock.calls[0][1].onError(new Error("Server unavailable"));
    expect(toast.error).toHaveBeenCalledWith("Server unavailable");
  });
});
