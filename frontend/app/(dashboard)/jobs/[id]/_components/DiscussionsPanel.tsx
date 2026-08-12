"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { ChatMessage, User } from "@/types";

interface DiscussionsPanelProps {
  isLgUp: boolean;
  notesPanelWidth: number;
  setIsResizingNotes: (resizing: boolean) => void;
  allMessages: ChatMessage[];
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

export function DiscussionsPanel({
  isLgUp,
  notesPanelWidth,
  setIsResizingNotes,
  allMessages,
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
  return (
    <>
      <div
        className="fixed right-0 top-[var(--header-height)] h-[calc(100vh-var(--header-height))] border-l border-t border-slate-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-950 z-50"
        style={{ width: isLgUp ? `${notesPanelWidth}px` : "90vw" }}
      >
        <div
          className="hidden lg:block absolute left-0 top-0 h-full w-2 -translate-x-1 cursor-col-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingNotes(true);
          }}
          title="Drag to resize"
        />
        <div className="p-3 pl-5 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Team Discussions
          </h3>
          <button
            onClick={() => setIsNotesOpen(false)}
            className="text-slate-400 cursor-pointer dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 p-2 rounded-full transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-[20px]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-white dark:bg-neutral-950 scroll-smooth relative">
          {allMessages.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-[13px] text-center pt-8">
              No notes yet. Be the first to add one.
            </p>
          ) : (
            allMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 p-4 rounded-lg w-full shadow-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-900 dark:text-neutral-100 font-semibold text-[14px] leading-tight truncate">
                    {msg.senderName ?? "Unknown"}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 dark:text-neutral-500 text-[12px] font-medium">
                      {timeAgo(msg.sentAt)}
                    </span>
                    {me && msg.senderId === me.id && !msg.isSystemMessage && (
                      <>
                        <button
                          onClick={() => {
                            setEditingNoteId(msg.id);
                            setEditingNoteText(msg.message ?? "");
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit"
                          type="button"
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-4"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setNoteDeleteTarget({
                              id: msg.id,
                              senderName: msg.senderName,
                              message: msg.message,
                            })
                          }
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Delete"
                          type="button"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
                          />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  {editingNoteId === msg.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-[14px] text-slate-700 dark:text-neutral-200 shadow-none focus:ring-1 focus:ring-[var(--theme-color)]/20 focus:border-[var(--theme-color)] outline-none resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteText("");
                          }}
                          className="h-9 px-4 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (!me) return;
                            const next = editingNoteText.trim();
                            if (!next) return;
                            editMessage(msg.id, next);
                            setEditingNoteId(null);
                            setEditingNoteText("");
                          }}
                          disabled={!editingNoteText.trim()}
                          className="h-9 px-4 rounded-md bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none cursor-pointer disabled:opacity-50"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-neutral-200 text-[14px] leading-relaxed">
                      {msg.message}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="h-4 w-full" />
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendNote();
                }
              }}
              rows={1}
              placeholder="Type a note and press Enter…"
              className="flex-1 h-11 px-4 py-3 border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-[var(--theme-color)]/20 focus:border-[var(--theme-color)] outline-none text-[14px] text-slate-700 dark:text-neutral-300 placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-all resize-none shadow-none leading-[1.2]"
            />
            <Button
              onClick={handleSendNote}
              disabled={!noteText.trim() || !me}
              className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white rounded-md h-11 w-11 p-0 font-medium shadow-none border-none disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center"
              aria-label="Send note"
            >
              <HugeiconsIcon
                icon={SentIcon}
                className="size-4"
                strokeWidth={3}
              />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
