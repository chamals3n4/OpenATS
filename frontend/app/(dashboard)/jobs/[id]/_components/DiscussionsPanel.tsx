"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Delete02Icon, PencilEdit01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/lib/initials";
import type { ChatMessage, User } from "@/types";

interface DiscussionsPanelProps {
  notesPanelWidth: number;
  setIsResizingNotes: (resizing: boolean) => void;
  allMessages: ChatMessage[];
  /** The history could not be loaded, which for this chat means the person is not on the team. */
  historyError?: boolean;
  setIsNotesOpen: (open: boolean) => void;
  me: User | undefined;
  timeAgo: (dateStr: string) => string;
  editingNoteId: number | null;
  setEditingNoteId: (id: number | null) => void;
  editingNoteText: string;
  setEditingNoteText: (text: string) => void;
  editMessage: (msgId: number, text: string) => void;
  setNoteDeleteTarget: (
    target: { id: number; senderName: string | null; message: string | null } | null,
  ) => void;
  noteText: string;
  setNoteText: (text: string) => void;
  handleSendNote: () => void;
}

/** Messages from one person this close together are shown as one block, under one name. */
const GROUP_WITHIN_MS = 5 * 60_000;
/** The message box grows with what is typed, up to about six lines, then scrolls. */
const COMPOSER_MAX_PX = 160;

function dayLabel(date: Date, now: Date): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

const clockTime = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function initialsFromName(name: string | null): string {
  const [first, ...rest] = (name ?? "").trim().split(/\s+/);
  return initialsOf(first, rest.at(-1), name ?? "?");
}

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: ChatMessage; startsGroup: boolean };

/** The list as it is drawn: a line for each new day, and a name only where a new block starts. */
function toRows(messages: ChatMessage[], now: Date): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  let previous: ChatMessage | null = null;
  for (const message of messages) {
    const sent = new Date(message.sentAt);
    const day = sent.toDateString();
    if (day !== lastDay) {
      rows.push({ kind: "day", key: `day-${day}`, label: dayLabel(sent, now) });
      lastDay = day;
      previous = null;
    }
    const startsGroup =
      !previous ||
      previous.isSystemMessage ||
      message.isSystemMessage ||
      previous.senderId !== message.senderId ||
      sent.getTime() - new Date(previous.sentAt).getTime() > GROUP_WITHIN_MS;
    rows.push({ kind: "message", key: `msg-${message.id}`, message, startsGroup });
    previous = message;
  }
  return rows;
}

/**
 * The hiring team's discussion about a job. It sits beside the job, not over it: on a wide
 * screen the page makes room for it, and it can be dragged wider. On a narrow screen it covers
 * the page, with a way back.
 */
export function DiscussionsPanel({
  notesPanelWidth,
  setIsResizingNotes,
  allMessages,
  historyError,
  setIsNotesOpen,
  me,
  timeAgo,
  editingNoteId,
  setEditingNoteId,
  editingNoteText,
  setEditingNoteText,
  editMessage,
  setNoteDeleteTarget,
  noteText,
  setNoteText,
  handleSendNote,
}: DiscussionsPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Whether the reader is at the bottom, so a new message scrolls into view only if they were.
  const atBottomRef = useRef(true);

  const rows = useMemo(() => toRows(allMessages, new Date()), [allMessages]);

  // Opens on the newest messages, and follows new ones while the reader is at the bottom.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && atBottomRef.current) list.scrollTop = list.scrollHeight;
  }, [rows]);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  // Grow the box with what is typed, and shrink it back after sending.
  useLayoutEffect(() => {
    const box = composerRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [noteText]);

  const send = () => {
    if (!noteText.trim() || !me) return;
    atBottomRef.current = true;
    handleSendNote();
  };

  const saveEdit = (id: number) => {
    const next = editingNoteText.trim();
    if (!next) return;
    editMessage(id, next);
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  return (
    <>
      {/* On a narrow screen the panel covers the page, so a tap outside it closes it. */}
      <div
        aria-hidden
        onClick={() => setIsNotesOpen(false)}
        className="fixed inset-0 top-(--header-height) z-30 bg-slate-900/20 lg:hidden"
      />

      <aside
        aria-label="Team discussion"
        style={{ "--panel-width": `${notesPanelWidth}px` } as CSSProperties}
        className="fixed inset-y-0 right-0 top-(--header-height) z-40 flex w-full max-w-md flex-col border-l border-slate-300 bg-white sm:w-[28rem] lg:relative lg:inset-auto lg:z-auto lg:w-(--panel-width) lg:max-w-none lg:shrink-0 dark:border-neutral-700 dark:bg-neutral-950"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize the discussion"
          title="Drag to resize"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingNotes(true);
          }}
          className="absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-theme/40 lg:block"
        />

        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-300 px-4 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-neutral-100">
              Team discussion
            </h2>
            <p className="truncate text-xs text-slate-600 dark:text-neutral-400">
              Only this job&apos;s hiring team can see it
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close the discussion"
            title="Close"
            onClick={() => setIsNotesOpen(false)}
            className="size-9 shrink-0 cursor-pointer rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </Button>
        </header>

        <div
          ref={listRef}
          onScroll={(e) => {
            const list = e.currentTarget;
            atBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3"
          role="log"
          aria-live="polite"
        >
          {historyError ? (
            <p className="px-6 py-12 text-center text-sm text-slate-600 dark:text-neutral-400">
              You are not on this job&apos;s hiring team, so you cannot see its discussion. Ask a member to add you.
            </p>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">No messages yet</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Share notes about this job with the rest of the hiring team.
              </p>
            </div>
          ) : (
            rows.map((row) => {
              if (row.kind === "day") {
                return (
                  <div key={row.key} className="flex items-center gap-3 px-4 py-3">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
                    <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">{row.label}</span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
                  </div>
                );
              }

              const { message, startsGroup } = row;
              const sent = new Date(message.sentAt);

              if (message.isSystemMessage) {
                return (
                  <p key={row.key} className="px-6 py-2 text-center text-xs text-slate-500 dark:text-neutral-400">
                    {message.message}
                    <span className="ml-1.5 tabular-nums">· {clockTime(sent)}</span>
                  </p>
                );
              }

              const mine = !!me && message.senderId === me.id;
              const editing = editingNoteId === message.id;
              const time = (
                <time
                  dateTime={message.sentAt}
                  title={`${sent.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })} (${timeAgo(message.sentAt)})`}
                  className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-neutral-400"
                >
                  {clockTime(sent)}
                </time>
              );

              return (
                <div
                  key={row.key}
                  className={`group relative flex gap-3 px-4 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-900/60 ${
                    startsGroup ? "mt-3" : ""
                  }`}
                >
                  {/* The avatar only where a block starts; later messages line up under it. */}
                  <div className="w-8 shrink-0">
                    {startsGroup && (
                      <span
                        aria-hidden
                        className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                          mine ? "bg-theme text-white" : "bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-200"
                        }`}
                      >
                        {initialsFromName(message.senderName)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* The first message of a block has its time beside the name. */}
                    {startsGroup && (
                      <p className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-semibold leading-5 text-slate-900 dark:text-neutral-100">
                          {mine ? "You" : (message.senderName ?? "Someone")}
                        </span>
                        {time}
                      </p>
                    )}

                    {editing ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          autoFocus
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit(message.id);
                            }
                            if (e.key === "Escape") {
                              setEditingNoteId(null);
                              setEditingNoteText("");
                            }
                          }}
                          rows={3}
                          className="w-full resize-none rounded-md border border-slate-300 bg-gray-100 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-theme dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => saveEdit(message.id)}
                            disabled={!editingNoteText.trim()}
                            className="h-8 cursor-pointer border-none bg-theme px-3 text-sm font-semibold text-white hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="cancel"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingNoteText("");
                            }}
                            className="h-8 cursor-pointer px-3 text-sm"
                          >
                            Cancel
                          </Button>
                          <span className="text-xs text-slate-500 dark:text-neutral-400">Enter to save, Esc to cancel</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
                          {message.message}
                        </p>

                        {/* Kept in place when hidden, so the time does not jump when they appear. */}
                        {mine && (
                          <span className="invisible flex shrink-0 items-center gap-0.5 group-hover:visible group-focus-within:visible">
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit message"
                              onClick={() => {
                                setEditingNoteId(message.id);
                                setEditingNoteText(message.message ?? "");
                              }}
                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                            >
                              <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              aria-label="Delete message"
                              onClick={() =>
                                setNoteDeleteTarget({
                                  id: message.id,
                                  senderName: message.senderName,
                                  message: message.message,
                                })
                              }
                              className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                            </button>
                          </span>
                        )}

                        {/* The ones under it, which have no name line, carry theirs at the end. */}
                        {!startsGroup && <span className="pt-0.5">{time}</span>}
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {!historyError && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="shrink-0 border-t border-slate-300 p-3 dark:border-neutral-700"
          >
            <div className="flex items-end gap-2 rounded-md border border-slate-300 bg-gray-100 p-1.5 pl-3 transition-colors focus-within:border-theme dark:border-neutral-600 dark:bg-neutral-800">
              <textarea
                ref={composerRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                aria-label="Message the hiring team"
                placeholder="Message the hiring team"
                className="max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              <Button
                type="submit"
                disabled={!noteText.trim() || !me}
                aria-label="Send"
                title="Send"
                className="size-8 shrink-0 cursor-pointer rounded-md border-none bg-theme p-0 text-white hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HugeiconsIcon icon={SentIcon} className="size-4" strokeWidth={2} />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-xs text-slate-500 dark:text-neutral-400">
              Enter to send, Shift + Enter for a new line
            </p>
          </form>
        )}
      </aside>
    </>
  );
}
