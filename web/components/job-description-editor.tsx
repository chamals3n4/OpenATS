"use client";

import { useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  ListViewIcon,
  Sorting05Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const insertion = before + selected + after;
  onChange(text.slice(0, start) + insertion + text.slice(end));
  queueMicrotask(() => {
    textarea.focus();
    const a = start + before.length;
    const b = a + selected.length;
    textarea.setSelectionRange(a, b);
  });
}

function wrapList(
  textarea: HTMLTextAreaElement,
  ordered: boolean,
  onChange: (v: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);
  const tag = ordered ? "ol" : "ul";
  let insertion: string;
  if (!selected.trim()) {
    insertion = `<${tag}><li></li></${tag}>`;
  } else {
    const lines = selected.split(/\r?\n/);
    const items = lines.map((line) => `<li>${line}</li>`).join("");
    insertion = `<${tag}>${items}</${tag}>`;
  }
  onChange(text.slice(0, start) + insertion + text.slice(end));
  queueMicrotask(() => {
    textarea.focus();
    if (!selected.trim()) {
      const pos = start + `<${tag}><li>`.length;
      textarea.setSelectionRange(pos, pos);
    } else {
      const pos = start + insertion.length;
      textarea.setSelectionRange(pos, pos);
    }
  });
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClass?: string;
};

/** Rich-text toolbar over a textarea: inserts HTML at selection (see careers job page rendering). */
export function JobDescriptionEditor({
  value,
  onChange,
  placeholder = "Type here...",
  minHeightClass = "min-h-[160px]",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const run = (fn: (ta: HTMLTextAreaElement) => void) => {
    const ta = textareaRef.current;
    if (ta) fn(ta);
  };

  const keepSelectionOnToolbarClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-none">
      <div className="flex items-center gap-1.5 p-2 bg-[#F8FAFC]/50 dark:bg-neutral-900/50 border-b border-slate-200 dark:border-neutral-800">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<strong>", "</strong>", onChange))
          }
        >
          <HugeiconsIcon icon={TextBoldIcon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<em>", "</em>", onChange))
          }
        >
          <HugeiconsIcon icon={TextItalicIcon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() => run((ta) => wrapSelection(ta, "<u>", "</u>", onChange))}
        >
          <HugeiconsIcon icon={TextUnderlineIcon} className="size-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h1>", "</h1>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading01Icon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h2>", "</h2>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading02Icon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h3>", "</h3>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading03Icon} className="size-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() => run((ta) => wrapList(ta, false, onChange))}
        >
          <HugeiconsIcon icon={ListViewIcon} className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() => run((ta) => wrapList(ta, true, onChange))}
        >
          <HugeiconsIcon icon={Sorting05Icon} className="size-4" />
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${minHeightClass} p-4 text-sm bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-neutral-600 resize-y`}
        placeholder={placeholder}
      />
    </div>
  );
}
