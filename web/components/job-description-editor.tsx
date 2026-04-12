"use client";

<<<<<<< HEAD
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
=======
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
export function JobDescriptionEditor({
  value,
  onChange,
  placeholder = "Type here...",
<<<<<<< HEAD
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
=======
  minHeightClassName = "min-h-[240px]",
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          `${minHeightClassName} p-4 text-[15px] leading-[1.45] text-slate-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 focus:outline-none ` +
          "[&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 " +
          "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:m-0 [&_h1+p]:mt-1.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:m-0 [&_h2+p]:mt-1.5 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:m-0 [&_h3+p]:mt-1",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const editorHtml = normalizeHtml(editor.getHTML());
    const nextHtml = normalizeHtml(value || "<p></p>");
    if (editorHtml !== nextHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={`${minHeightClassName} p-4 text-sm bg-white dark:bg-neutral-900 text-slate-400 dark:text-neutral-500`}
      >
        {placeholder}
      </div>
    );
  }
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf

  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-none">
      <div className="flex items-center gap-1.5 p-2 bg-[#F8FAFC]/50 dark:bg-neutral-900/50 border-b border-slate-200 dark:border-neutral-800">
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<strong>", "</strong>", onChange))
          }
        >
          <HugeiconsIcon icon={TextBoldIcon} className="size-4" />
=======
          className={`size-8 ${editor.isActive("bold") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
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
=======
          className={`size-8 ${editor.isActive("italic") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Button>

        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h1>", "</h1>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading01Icon} className="size-4" />
=======
          className={`size-8 ${editor.isActive("heading", { level: 1 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4" />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h2>", "</h2>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading02Icon} className="size-4" />
=======
          className={`size-8 ${editor.isActive("heading", { level: 2 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() =>
            run((ta) => wrapSelection(ta, "<h3>", "</h3>", onChange))
          }
        >
          <HugeiconsIcon icon={Heading03Icon} className="size-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />
=======
          className={`size-8 ${editor.isActive("heading", { level: 3 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" />
        </Button>

        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
          className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          onMouseDown={keepSelectionOnToolbarClick}
          onClick={() => run((ta) => wrapList(ta, false, onChange))}
        >
          <HugeiconsIcon icon={ListViewIcon} className="size-4" />
=======
          className={`size-8 ${editor.isActive("bulletList") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
<<<<<<< HEAD
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
=======
          className={`size-8 ${editor.isActive("orderedList") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
    </div>
  );
}
