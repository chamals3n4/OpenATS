import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const clientFetch = vi.fn();
vi.mock("@/lib/client-fetch", () => ({ clientFetch: (...a: unknown[]) => clientFetch(...a) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

let googleConnected = false;
vi.mock("@/hooks/queries/use-user", () => ({
  useUsers: () => ({
    data: {
      data: [
        { id: 1, firstName: "Chamal", lastName: "Senarathna" },
        { id: 2, firstName: "Bhanuka", lastName: "Harischandra" },
      ],
    },
  }),
}));
vi.mock("@/hooks/queries/use-integrations", () => ({
  useUserIntegrationStatus: (id: number | null) => ({
    data: id ? { data: [{ provider: "google_meet", connected: googleConnected }] } : undefined,
  }),
}));
vi.mock("@/hooks/queries/use-interviews", () => ({
  useAllocatedSlots: () => ({ data: { data: [] } }),
}));
// A plain input stands in for the calendar popover.
vi.mock("@/components/ui/date-time-picker", () => ({
  DateTimePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Time" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { toast } from "sonner";
import { InterviewSchedulerDialog } from "@/app/(dashboard)/_components/interview-scheduler-dialog";

const future = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setHours(10, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
};

const template = (config: Record<string, unknown>) => ({
  id: 3,
  name: "Technical Interview - Round 01",
  type: "event",
  bodyJson: [{ content: JSON.stringify({ message: "Hi, please pick a time.", durationMinutes: 45, ...config }) }],
});

const open = (templates = [template({ eventType: "virtual", meetingUrl: "https://meet.google.com/abc" })]) => {
  const onSuccess = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <InterviewSchedulerDialog
      candidateId={7}
      candidateName="Indika Ranasinghe"
      open
      onOpenChange={onOpenChange}
      templates={templates as never}
      pipelineStageId={9}
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess, onOpenChange };
};

// Base UI commits an option click only after the pointer hovers it, and a tick later.
const choose = async (trigger: RegExp, option: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: trigger }));
  const item = screen.getByRole("option", { name: option });
  fireEvent.pointerMove(item);
  fireEvent.mouseMove(item);
  fireEvent.click(item);
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: trigger }).textContent).toContain(option),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  googleConnected = false;
});
afterEach(cleanup);

describe("InterviewSchedulerDialog", () => {
  it("is titled plainly, names the candidate in the description, and has no em dashes", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Schedule interview")).toBeTruthy();
    expect(within(dialog).getByText(/Let Indika Ranasinghe choose from times you offer/)).toBeTruthy();
    expect(dialog.textContent).not.toContain("—");
  });

  it("asks for the template and the interviewer in separate rows, and hides the rest until a template is chosen", () => {
    open();
    expect(screen.getByRole("combobox", { name: /Event template/ })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Interviewer/ })).toBeTruthy();
    expect(screen.queryByText("When")).toBeNull();
    expect((screen.getByRole("button", { name: "Send to candidate" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("fills in the format, link, length and message from the template, and leaves the times to you", async () => {
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    expect(screen.getByText("When")).toBeTruthy();
    expect((screen.getByLabelText(/^Link/) as HTMLInputElement).value).toBe("https://meet.google.com/abc");
    expect(screen.getByRole("combobox", { name: /Length/ }).textContent).toContain("45 minutes");
    expect((screen.getByLabelText("Time") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/Email to the candidate/) as HTMLTextAreaElement).value).toBe("Hi, please pick a time.");
  });

  it("only offers a Google Meet link when the interviewer has connected Google", async () => {
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    const auto = screen.getByRole("radio", { name: /Create a Google Meet link/ });
    expect(auto.getAttribute("aria-disabled") === "true" || auto.hasAttribute("data-disabled")).toBe(true);
    expect(screen.getByText(/Choose an interviewer who has connected Google Meet/)).toBeTruthy();
  });

  it("explains what is missing instead of failing silently", async () => {
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    fireEvent.click(screen.getByRole("button", { name: "Send to candidate" }));

    expect(clientFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Choose who will run the interview.")).toBeTruthy();
    expect(screen.getByText("Add at least one time the candidate can choose.")).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
  });

  it("flags a time that has already passed on its own row", async () => {
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "2020-01-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to candidate" }));
    expect(screen.getByText("This time has already passed.")).toBeTruthy();
  });

  it("lets you add and remove times", async () => {
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    fireEvent.click(screen.getByRole("button", { name: "Add another time" }));
    expect(screen.getAllByLabelText("Time")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove time 2" }));
    expect(screen.getAllByLabelText("Time")).toHaveLength(1);
  });

  it("sends the times, the length and the message once everything is filled in", async () => {
    clientFetch.mockResolvedValue({});
    const { onSuccess, onOpenChange } = open();
    await choose(/Event template/, "Technical Interview - Round 01");
    await choose(/Interviewer/, "Bhanuka Harischandra");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: future(3) } });
    fireEvent.click(screen.getByRole("button", { name: "Send to candidate" }));

    await waitFor(() => expect(clientFetch).toHaveBeenCalled());
    const [url, init] = clientFetch.mock.calls[0];
    expect(url).toBe("/candidates/7/schedule");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      eventName: "Technical Interview - Round 01",
      eventType: "virtual",
      meetingUrl: "https://meet.google.com/abc",
      interviewerId: 2,
      location: null,
      stageId: 9,
      bodyText: "Hi, please pick a time.",
      durationMinutes: 45,
    });
    expect(body).not.toHaveProperty("scheduledAt");
    expect(body.timeSlots).toEqual([{ datetime: new Date(future(3)).toISOString(), selected: false }]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a location field for an on-site interview and sends no link", async () => {
    clientFetch.mockResolvedValue({});
    open([template({ eventType: "onsite", location: "HQ, 3rd floor" })]);
    await choose(/Event template/, "Technical Interview - Round 01");
    expect((screen.getByLabelText("Location") as HTMLInputElement).value).toBe("HQ, 3rd floor");
    expect(screen.queryByRole("radio", { name: /Google Meet/ })).toBeNull();

    await choose(/Interviewer/, "Chamal Senarathna");
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: future(2) } });
    fireEvent.click(screen.getByRole("button", { name: "Send to candidate" }));
    await waitFor(() => expect(clientFetch).toHaveBeenCalled());
    const body = JSON.parse(clientFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ eventType: "onsite", meetingUrl: null, location: "HQ, 3rd floor" });
  });

  it("books a time you set yourself, with no slots and no message to write", async () => {
    clientFetch.mockResolvedValue({});
    open();
    await choose(/Event template/, "Technical Interview - Round 01");
    await choose(/Interviewer/, "Bhanuka Harischandra");
    fireEvent.click(screen.getByRole("radio", { name: /Set the time myself/ }));

    expect(screen.queryByLabelText(/Email to the candidate/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Book interview" }));
    expect(screen.getByText("Choose the date and time.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Time"), { target: { value: future(5) } });
    fireEvent.click(screen.getByRole("button", { name: "Book interview" }));
    await waitFor(() => expect(clientFetch).toHaveBeenCalled());
    const body = JSON.parse(clientFetch.mock.calls[0][1].body);
    expect(body.scheduledAt).toBe(new Date(future(5)).toISOString());
    expect(body.timeSlots).toEqual([]);
  });

  it("starts from a blank form each time it opens", async () => {
    const { unmount } = (() => {
      open();
      return { unmount: () => cleanup() };
    })();
    await choose(/Event template/, "Technical Interview - Round 01");
    unmount();
    open();
    expect(screen.queryByText("When")).toBeNull();
  });

  it("says so when there are no event templates", () => {
    open([]);
    expect(screen.getByText(/No event templates yet/)).toBeTruthy();
  });
});
