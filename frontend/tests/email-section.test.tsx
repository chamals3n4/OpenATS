import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));

const sendMutate = vi.fn();
let emailsState: { data?: { data: unknown[] }; isLoading: boolean; isError: boolean } = {
  data: { data: [] },
  isLoading: false,
  isError: false,
};
vi.mock("@/hooks/queries/use-candidate-emails", () => ({
  useCandidateEmails: () => ({ ...emailsState, refetch: vi.fn(), isFetching: false }),
  useSendCandidateEmail: () => ({ mutate: sendMutate, isPending: false }),
}));
vi.mock("@/hooks/queries/use-user", () => ({
  useCurrentUser: () => ({ data: { data: { email: "chamal@example.com" } } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { EmailSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/email-section";
import type { CandidateDetail } from "@/types";

const candidate = {
  id: 2,
  firstName: "Indika",
  lastName: "Ranasinghe",
  email: "indika@example.com",
} as CandidateDetail;

const sent = (over: Record<string, unknown> = {}) => ({
  id: 1,
  candidateId: 2,
  subject: "Next steps",
  bodyHtml: "<div><p>Hello Indika</p><p>See you soon</p></div>",
  recipientEmail: "indika@example.com",
  sentAt: "2026-09-09T10:42:00.000Z",
  sentByName: "Chamal Senarathna",
  ...over,
});

const fill = (subject: string, body: string) => {
  fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: subject } });
  fireEvent.change(screen.getByLabelText(/Message/), { target: { value: body } });
};

beforeEach(() => {
  vi.clearAllMocks();
  isManager = true;
  emailsState = { data: { data: [] }, isLoading: false, isError: false };
});
afterEach(cleanup);

describe("composing", () => {
  it("shows who it is going to, as text rather than a disabled field", () => {
    render(<EmailSection candidate={candidate} />);
    expect(screen.getByText("Indika Ranasinghe")).toBeTruthy();
    expect(screen.getByText("indika@example.com")).toBeTruthy();
  });

  it("says where replies will go, and that they will not show up in the app", () => {
    render(<EmailSection candidate={candidate} />);
    expect(screen.getByText("chamal@example.com")).toBeTruthy();
    expect(screen.getByText(/They won't appear in OpenATS/)).toBeTruthy();
  });

  it("lets the sender send replies to a different address", () => {
    render(<EmailSection candidate={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Send replies to"), { target: { value: "hr@example.com" } });
    fill("Hi", "Body");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Replies will go to hr@example.com/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Send email" }));
    expect(sendMutate).toHaveBeenCalledWith(
      { subject: "Hi", body: "Body", replyTo: "hr@example.com" },
      expect.anything(),
    );
  });

  it("refuses a reply address that is not a single email address", () => {
    render(<EmailSection candidate={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Send replies to"), { target: { value: "a@b.co, c@d.com" } });
    fill("Hi", "Body");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(screen.getByText(/Enter a single email address/)).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(sendMutate).not.toHaveBeenCalled();
  });

  it("goes back to the sender's own address with 'Use my address'", () => {
    render(<EmailSection candidate={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Send replies to"), { target: { value: "hr@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Use my address" }));
    expect(screen.getByText("chamal@example.com")).toBeTruthy();

    fill("Hi", "Body");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Send email" }));
    expect(sendMutate.mock.calls[0][0].replyTo).toBeUndefined();
  });

  it("explains what is missing instead of doing nothing", () => {
    render(<EmailSection candidate={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(screen.getByText("Add a subject.")).toBeTruthy();
    expect(screen.getByText("Write a message.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(sendMutate).not.toHaveBeenCalled();
  });

  it("asks before sending, naming the recipient, and then really sends", () => {
    render(<EmailSection candidate={candidate} />);
    fill("  Next steps  ", "  Hello Indika  ");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(sendMutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/indika@example.com/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Send email" }));
    expect(sendMutate).toHaveBeenCalledWith(
      { subject: "Next steps", body: "Hello Indika" },
      expect.anything(),
    );
  });

  it("clears the form after a successful send", () => {
    render(<EmailSection candidate={candidate} />);
    fill("Hi", "Body");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Send email" }));
    sendMutate.mock.calls[0][1].onSuccess();
    expect(toast.success).toHaveBeenCalledWith("Email sent to Indika");
  });

  it("reports a failed send instead of pretending it worked", () => {
    render(<EmailSection candidate={candidate} />);
    fill("Hi", "Body");
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Send email" }));
    sendMutate.mock.calls[0][1].onError(new Error("We couldn't send the email. Please try again."));
    expect(toast.error).toHaveBeenCalledWith("We couldn't send the email. Please try again.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("opens the preview in a dialog, as paragraphs, the way it will be sent", () => {
    render(<EmailSection candidate={candidate} />);
    fill("Hi", "First line\nSecond line\n\nNew paragraph");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Email preview", { selector: "h2" })).toBeTruthy();
    expect(within(dialog).getByText(/Indika Ranasinghe <indika@example.com>/)).toBeTruthy();
    expect(within(dialog).getByText("chamal@example.com")).toBeTruthy();
    expect(within(dialog).getByText("New paragraph")).toBeTruthy();
    // Two blank-line-separated blocks make two paragraphs inside the email itself.
    expect(dialog.querySelectorAll("article p")).toHaveLength(2);
    expect(dialog.querySelectorAll("br")).toHaveLength(1);
  });

  it("only offers a preview once there is something to preview", () => {
    render(<EmailSection candidate={candidate} />);
    expect((screen.getByRole("button", { name: "Preview" }) as HTMLButtonElement).disabled).toBe(true);
    fill("Hi", "");
    expect((screen.getByRole("button", { name: "Preview" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("treats typed markup as text in the preview", () => {
    render(<EmailSection candidate={candidate} />);
    fill("Hi", "<img src=x onerror=alert(1)>");
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).toBeNull();
    expect(within(dialog).getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});

describe("sent emails", () => {
  it("lists what was really sent, with who sent it and when", () => {
    emailsState = { data: { data: [sent()] }, isLoading: false, isError: false };
    render(<EmailSection candidate={candidate} />);
    expect(screen.getByText("Next steps")).toBeTruthy();
    expect(screen.getByText(/Chamal Senarathna/)).toBeTruthy();
    expect(screen.getByText("1 email")).toBeTruthy();
    expect(screen.getByText(/Hello Indika See you soon/)).toBeTruthy();
  });

  it("opens the whole message in a dialog, inside a sandboxed frame", () => {
    emailsState = { data: { data: [sent()] }, isLoading: false, isError: false };
    render(<EmailSection candidate={candidate} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Read message" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Sent email", { selector: "h2" })).toBeTruthy();
    expect(within(dialog).getByText("indika@example.com")).toBeTruthy();
    expect(within(dialog).getByText("Chamal Senarathna")).toBeTruthy();
    expect(within(dialog).getByText("Next steps")).toBeTruthy();
    expect(dialog.querySelector("iframe")?.getAttribute("sandbox")).toBe("");
  });

  it("has an empty state, and a retry when the list fails to load", () => {
    render(<EmailSection candidate={candidate} />);
    expect(screen.getByText("No emails sent yet")).toBeTruthy();
    cleanup();

    emailsState = { isLoading: false, isError: true };
    render(<EmailSection candidate={candidate} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("permissions", () => {
  it("lets people who cannot send see the history, without the compose form", () => {
    isManager = false;
    emailsState = { data: { data: [sent()] }, isLoading: false, isError: false };
    render(<EmailSection candidate={candidate} />);
    expect(screen.queryByRole("button", { name: "Send email" })).toBeNull();
    expect(screen.getByText("Next steps")).toBeTruthy();
    expect(screen.getByText(/Only hiring managers can email candidates/)).toBeTruthy();
  });
});
