import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));
vi.mock("@/hooks/queries/use-user", () => ({
  useUsers: () => ({
    data: isManager ? { data: [{ id: 1, firstName: "Chamal", lastName: "Senarathna" }] } : undefined,
  }),
}));
const serverFetch = vi.fn();
vi.mock("@/lib/auth-action", () => ({ serverFetch: (...a: unknown[]) => serverFetch(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { RejectionSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/rejection-section";
import { RejectCandidateDialog } from "@/app/(dashboard)/candidates/[id]/_components/dialogs/reject-candidate-dialog";
import type { CandidateDetail, CandidateRejection, Template } from "@/types";

const rejection = (over: Partial<CandidateRejection> = {}): CandidateRejection => ({
  id: 1,
  candidateId: 5,
  jobId: 3,
  fromStageId: 8,
  rejectedBy: 1,
  reason: "Role requirements changed",
  internalNote: "Budget frozen",
  templateId: 5,
  emailStatus: "sent",
  sentAt: "2026-09-09T10:42:59.000Z",
  rejectedAt: "2026-09-09T10:42:59.000Z",
  ...over,
});

const candidate = (status: string, rejections: CandidateRejection[]) =>
  ({
    firstName: "Hasitha",
    lastName: "Erandika",
    status,
    jobTitle: "Software Engineering Intern",
    currentStageId: status === "rejected" ? null : 8,
    rejections,
  }) as unknown as CandidateDetail;

const templates = [
  { id: 5, name: "Application rejected" },
  { id: 6, name: "Welcome" },
] as Template[];

const unreject = (mutate: () => void = vi.fn()) => ({ mutate, isPending: false }) as never;

const renderSection = (c: CandidateDetail, over: { onReject?: () => void; unrejectMutate?: () => void } = {}) =>
  render(
    <RejectionSection
      candidate={c}
      candidateId={5}
      stageMap={{ 8: "Applied" }}
      emailTemplates={templates}
      unrejectMutation={unreject(over.unrejectMutate)}
      onReject={over.onReject ?? vi.fn()}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  isManager = true;
});
afterEach(cleanup);

describe("RejectionSection", () => {
  it("explains a current rejection: the stage, reason, who, the email and the note", () => {
    renderSection(candidate("rejected", [rejection()]));
    const card = screen.getByRole("article");
    expect(within(card).getByText("Rejected from Applied")).toBeTruthy();
    expect(within(card).getByText("Current")).toBeTruthy();
    expect(within(card).getByText("Role requirements changed")).toBeTruthy();
    expect(within(card).getByText("Chamal Senarathna")).toBeTruthy();
    expect(within(card).getByText(/Sent using “Application rejected”/)).toBeTruthy();
    expect(within(card).getByText("Budget frozen")).toBeTruthy();
  });

  it("marks earlier rejections as restored once the candidate is back in the pipeline", () => {
    renderSection(candidate("active", [rejection()]));
    expect(within(screen.getByRole("article")).getByText("Restored")).toBeTruthy();
  });

  it("lists the newest rejection first", () => {
    renderSection(
      candidate("rejected", [
        rejection({ id: 1, reason: "Old reason", rejectedAt: "2026-08-01T10:00:00Z" }),
        rejection({ id: 2, reason: "New reason", rejectedAt: "2026-09-01T10:00:00Z" }),
      ]),
    );
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByText("New reason")).toBeTruthy();
    expect(within(cards[0]).getByText("Current")).toBeTruthy();
    expect(within(cards[1]).getByText("Restored")).toBeTruthy();
  });

  it("asks before restoring, and says where the candidate will go", () => {
    const mutate = vi.fn();
    renderSection(candidate("rejected", [rejection()]), { unrejectMutate: mutate });
    fireEvent.click(screen.getByRole("button", { name: "Restore candidate" }));
    expect(mutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/the Applied stage/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Restore candidate" }));
    expect(mutate).toHaveBeenCalledWith(5, expect.anything());
  });

  it("opens the reject dialog for an active candidate", () => {
    const onReject = vi.fn();
    renderSection(candidate("active", []), { onReject });
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(onReject).toHaveBeenCalled();
  });

  it("hides the actions and the names from people who cannot reject", () => {
    isManager = false;
    renderSection(candidate("rejected", [rejection()]));
    expect(screen.queryByRole("button", { name: "Restore candidate" })).toBeNull();
    expect(screen.queryByText("Chamal Senarathna")).toBeNull();
  });

  it("has a helpful empty state", () => {
    renderSection(candidate("active", []));
    expect(screen.getByText("No rejections")).toBeTruthy();
  });
});

describe("RejectCandidateDialog", () => {
  const mutate = vi.fn();

  // The selection lands a tick after the click, so wait for it before going on.
  const chooseReason = async (label: string) => {
    fireEvent.click(screen.getByRole("combobox", { name: /Reason/ }));
    const option = screen.getByRole("option", { name: label });
    // A real pointer hovers (highlights) the item before it clicks it.
    fireEvent.pointerMove(option);
    fireEvent.mouseMove(option);
    fireEvent.click(option);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /Reason/ }).textContent).toContain(label),
    );
  };
  const open = (c = candidate("active", []), tpl = templates) =>
    render(
      <RejectCandidateDialog
        open
        onOpenChange={vi.fn()}
        candidate={c}
        candidateId={5}
        stageName="Applied"
        emailTemplates={tpl}
        rejectMutation={{ mutate, isPending: false } as never}
      />,
    );

  it("says who is being rejected and what happens", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Reject Hasitha Erandika?")).toBeTruthy();
    expect(within(dialog).getByText(/Software Engineering Intern · Applied/)).toBeTruthy();
  });

  it("does not submit without a reason, and shows why", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Choose a reason.")).toBeTruthy();
  });

  it("preselects the rejection template and shows a preview before anything is sent", async () => {
    serverFetch.mockResolvedValue({ data: { subject: "Your application", html: "<p>Sorry</p>" } });
    open();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("button", { name: "Reject and send email" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(screen.getByText("Your application")).toBeTruthy());
    expect(screen.getByTitle("Rejection email preview").getAttribute("sandbox")).toBe("");
    expect(serverFetch).toHaveBeenCalledWith("/templates/5/preview", expect.anything());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("explains that emailing is not possible without a template", () => {
    open(candidate("active", []), []);
    expect(screen.getByText(/Add an email template under Templates/)).toBeTruthy();
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled || screen.getByRole("switch").getAttribute("aria-disabled") === "true" || screen.getByRole("switch").hasAttribute("data-disabled")).toBe(true);
  });

  it("requires a note when the reason is Other", async () => {
    open();
    await chooseReason("Other");
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Add a note so your team knows what happened.")).toBeTruthy();
  });

  it("rejects with the chosen reason and no email by default", async () => {
    open();
    await chooseReason("Compensation mismatch");
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(mutate).toHaveBeenCalledWith(
      { id: 5, data: { reason: "Compensation mismatch", internalNote: undefined, templateId: undefined, emailStatus: "not_sent" } },
      expect.anything(),
    );
  });

  it("reports a server error instead of failing silently", async () => {
    open();
    await chooseReason("Compensation mismatch");
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    const opts = mutate.mock.calls[0][1];
    opts.onError(new Error("Candidate is already rejected"));
    expect(toast.error).toHaveBeenCalledWith("Candidate is already rejected");
  });
});
