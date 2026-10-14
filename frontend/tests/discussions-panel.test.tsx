import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DiscussionsPanel } from "@/app/(dashboard)/jobs/[id]/_components/discussions-panel";
import type { ChatMessage, User } from "@/types";

// jsdom has no layout, so scrolling to the newest message is a no-op here.
afterEach(cleanup);

const me = { id: 1, firstName: "Chamal", lastName: "Senarathna" } as User;
const at = (iso: string) => new Date(iso).toISOString();
const message = (id: number, senderId: number, senderName: string, sentAt: string, text: string): ChatMessage => ({
  id,
  senderId,
  senderName,
  sentAt: at(sentAt),
  message: text,
  isSystemMessage: false,
  senderAvatar: null,
});

const renderPanel = (allMessages: ChatMessage[], over: Partial<Parameters<typeof DiscussionsPanel>[0]> = {}) =>
  render(
    <DiscussionsPanel
      notesPanelWidth={380}
      setIsResizingNotes={vi.fn()}
      allMessages={allMessages}
      setIsNotesOpen={vi.fn()}
      me={me}
      timeAgo={() => "now"}
      editingNoteId={null}
      setEditingNoteId={vi.fn()}
      editingNoteText=""
      setEditingNoteText={vi.fn()}
      editMessage={vi.fn()}
      setNoteDeleteTarget={vi.fn()}
      noteText=""
      setNoteText={vi.fn()}
      handleSendNote={vi.fn()}
      {...over}
    />,
  );

describe("DiscussionsPanel", () => {
  it("says the conversation is empty, and how it is meant to be used", () => {
    renderPanel([]);
    expect(screen.getByText("No messages yet")).toBeTruthy();
  });

  it("shows one name over several messages sent close together by the same person", () => {
    renderPanel([
      message(1, 2, "Ayesha Perera", "2026-03-02T09:00:00", "Strong CV"),
      message(2, 2, "Ayesha Perera", "2026-03-02T09:02:00", "Let's interview her"),
      message(3, 1, "Chamal Senarathna", "2026-03-02T09:05:00", "Agreed"),
    ]);

    expect(screen.getAllByText("Ayesha Perera")).toHaveLength(1);
    expect(screen.getByText("Strong CV")).toBeTruthy();
    expect(screen.getByText("Let's interview her")).toBeTruthy();
    // Your own messages are labelled as yours.
    expect(screen.getByText("You")).toBeTruthy();
  });

  it("shows a time on every message, including the ones under the same name", () => {
    const { container } = renderPanel([
      message(1, 2, "Ayesha Perera", "2026-03-02T09:00:00", "First"),
      message(2, 2, "Ayesha Perera", "2026-03-02T09:02:00", "Second"),
      message(3, 2, "Ayesha Perera", "2026-03-02T09:03:00", "Third"),
    ]);

    expect(container.querySelectorAll("time")).toHaveLength(3);
    expect(screen.getByText("9:02 AM")).toBeTruthy();
  });

  it("starts a new block, with the name again, after a long gap", () => {
    renderPanel([
      message(1, 2, "Ayesha Perera", "2026-03-02T09:00:00", "Morning"),
      message(2, 2, "Ayesha Perera", "2026-03-02T15:00:00", "Afternoon"),
    ]);
    expect(screen.getAllByText("Ayesha Perera")).toHaveLength(2);
  });

  it("puts a line with the day between messages from different days", () => {
    renderPanel([
      message(1, 2, "Ayesha Perera", "2026-03-02T09:00:00", "One"),
      message(2, 2, "Ayesha Perera", "2026-03-03T09:00:00", "Two"),
    ]);
    expect(screen.getByText(/March 2/)).toBeTruthy();
    expect(screen.getByText(/March 3/)).toBeTruthy();
  });

  it("offers edit and delete on your own messages only", () => {
    renderPanel([
      message(1, 2, "Ayesha Perera", "2026-03-02T09:00:00", "Theirs"),
      message(2, 1, "Chamal Senarathna", "2026-03-02T09:30:00", "Mine"),
    ]);
    expect(screen.getAllByRole("button", { name: "Edit message" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete message" })).toHaveLength(1);
  });

  it("explains, and offers no message box, to someone who is not on the hiring team", () => {
    renderPanel([], { historyError: true });

    expect(screen.getByText(/not on this job's hiring team/)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Message the hiring team" })).toBeNull();
  });
});
