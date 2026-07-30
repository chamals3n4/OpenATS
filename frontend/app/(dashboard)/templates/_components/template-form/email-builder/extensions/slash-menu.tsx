"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

export interface SlashMenuItem {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  command: (opts: { editor: Editor; range: Range }) => void;
}

interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

export interface SlashMenuRef {
  onKeyDown: (opts: { event: KeyboardEvent }) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  (props, ref) => {
    const [rawSelected, setRawSelected] = useState(0);
    const maxIndex = Math.max(props.items.length - 1, 0);
    const selected = Math.min(rawSelected, maxIndex);

    const select = (index: number) => {
      const item = props.items[index];
      if (item) props.command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setRawSelected((prev) => (prev + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setRawSelected((prev) => (prev + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="w-56 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-3 text-xs text-slate-400 dark:text-neutral-500">
          No results
        </div>
      );
    }

    return (
      <div className="w-64 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-1">
        {props.items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              select(index);
            }}
            onMouseEnter={() => setRawSelected(index)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs font-medium transition-colors ${
              index === selected
                ? "bg-[var(--theme-color)]/10 text-[var(--theme-color)]"
                : "text-slate-600 dark:text-neutral-300"
            }`}
          >
            {item.icon}
            <span className="flex-1 truncate">{item.title}</span>
            {item.description && (
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                {item.description}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  },
);
SlashMenu.displayName = "SlashMenu";
