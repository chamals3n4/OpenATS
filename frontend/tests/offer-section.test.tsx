import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const sendMutate = vi.fn();
const updateMutate = vi.fn();
const hiredMutate = vi.fn();
const createMutate = vi.fn();

vi.mock("@/hooks/queries/use-offers", () => ({
  useCreateOffer: () => ({ mutate: createMutate, isPending: false }),
  useUpdateOffer: () => ({ mutate: updateMutate, isPending: false }),
  useSendOffer: () => ({ mutate: sendMutate, isPending: false }),
  useMarkOfferAsHired: () => ({ mutate: hiredMutate, isPending: false }),
}));
vi.mock("@/lib/auth-action", () => ({ serverFetch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { OfferSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/offer-section";
import type { CandidateDetail, Offer } from "@/types";

const candidate = (over: Partial<CandidateDetail> = {}) =>
  ({
    firstName: "Sanka",
    lastName: "Chaturanga",
    email: "sanka@example.com",
    status: "active",
    currentStageId: 5,
    ...over,
  }) as CandidateDetail;

const offer = (over: Partial<Offer> = {}): Offer => ({
  id: 1,
  candidateId: 2,
  jobId: 1,
  templateId: null,
  status: "draft",
  salary: "60000.00",
  currency: "USD",
  employmentType: "internship",
  startDate: "2026-09-13",
  reportingManager: "Bhanuka Harischandra",
  benefits: "Monthly allowance",
  offerLetterHtml: "<p>Dear Sanka</p><script>alert(1)</script>",
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  declinedAt: null,
  createdAt: "2026-09-09T09:00:00.000Z",
  updatedAt: "2026-09-09T09:00:00.000Z",
  ...over,
});

function renderSection(o: Offer | null, c = candidate(), stages: { id: number; stageType: string }[] = []) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OfferSection
        candidate={c}
        candidateId={2}
        offer={o}
        pipelineStages={stages as never}
        emailTemplates={[]}
        jobId={1}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("OfferSection summary", () => {
  it("leads with the salary and shows the offer's details", () => {
    renderSection(offer({ status: "accepted", sentAt: "2026-09-09T10:00:00Z", acceptedAt: "2026-09-09T10:10:00Z" }));
    expect(screen.getByText("$60,000")).toBeTruthy();
    expect(screen.getByText("Internship")).toBeTruthy();
    expect(screen.getByText("Bhanuka Harischandra")).toBeTruthy();
    expect(screen.getByText("Accepted", { selector: "p" })).toBeTruthy();
  });

  it("does not offer Edit once the candidate has answered", () => {
    renderSection(offer({ status: "accepted", acceptedAt: "2026-09-09T10:10:00Z" }));
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
  });

  it("keeps the letter out of the tab until you ask for it", () => {
    renderSection(offer());
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "View offer letter" })).toBeTruthy();
  });

  it("opens the letter in a dialog, inside a sandboxed iframe that cannot run scripts", () => {
    renderSection(offer());
    fireEvent.click(screen.getByRole("button", { name: "View offer letter" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Offer letter")).toBeTruthy();
    const frame = dialog.querySelector("iframe");
    expect(frame?.getAttribute("sandbox")).toBe("");
    expect(document.querySelector("script[src], body script")).toBeNull();
  });

  it("does not show a letter button when the offer has no letter", () => {
    renderSection(offer({ offerLetterHtml: null }));
    expect(screen.queryByRole("button", { name: "View offer letter" })).toBeNull();
  });

  it("asks before marking an accepted candidate as hired", () => {
    renderSection(offer({ status: "accepted", acceptedAt: "2026-09-09T10:10:00Z" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as hired" }));
    expect(hiredMutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark as hired" }));
    expect(hiredMutate).toHaveBeenCalledWith(1, expect.anything());
  });
});

describe("sending an offer", () => {
  it("asks for confirmation, naming the recipient, before sending", () => {
    renderSection(offer());
    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
    expect(sendMutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/sanka@example.com/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Send offer" }));
    expect(sendMutate).toHaveBeenCalledWith(1, expect.anything());
    // The saved offer is complete, so there is nothing to save first.
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("opens the form with errors, and sends nothing, when the saved draft is incomplete", () => {
    renderSection(offer({ reportingManager: null, benefits: null }));
    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
    expect(sendMutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByText("Reporting manager is required to send.")).toBeTruthy();
    expect(screen.getByText("Benefits is required to send.")).toBeTruthy();
  });
});

describe("editing", () => {
  it("previews the letter from the form through the same dialog", () => {
    renderSection(offer());
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View offer letter" }));
    expect(screen.getByRole("dialog").querySelector("iframe")).toBeTruthy();
  });

  it("saving never sends a status, so a sent offer cannot be knocked back to draft", () => {
    renderSection(offer({ status: "sent", sentAt: "2026-09-09T10:00:00Z" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const payload = updateMutate.mock.calls[0][0].data;
    expect(payload).not.toHaveProperty("status");
    expect(payload.salary).toBe(60000);
  });

  it("only drafts can be sent from the form", () => {
    renderSection(offer({ status: "sent", sentAt: "2026-09-09T10:00:00Z" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.queryByRole("button", { name: "Send offer" })).toBeNull();
  });
});

describe("no offer yet", () => {
  it("offers to create a draft at an offer stage", () => {
    renderSection(null, candidate({ currentStageId: 9 }), [{ id: 9, stageType: "offer" }]);
    fireEvent.click(screen.getByRole("button", { name: "Create offer draft" }));
    expect(createMutate).toHaveBeenCalledWith({ candidateId: 2, jobId: 1 }, expect.anything());
  });

  it("explains what to do when the candidate is not at an offer stage", () => {
    renderSection(null, candidate({ currentStageId: 9 }), [{ id: 9, stageType: "screening" }]);
    expect(screen.getByText(/Move the candidate to an offer stage/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create offer draft" })).toBeNull();
  });
});
