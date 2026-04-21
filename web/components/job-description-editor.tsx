"use client";

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

export function JobDescriptionEditor({
  value,
  onChange,
  placeholder = "Type here...",
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

  return (
    <div className="border bg-slate-50 border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-none">
      <div className="flex items-center gap-1.5 p-2 bg-[#F8FAFC]/50 dark:bg-neutral-900/50 border-b border-slate-200 dark:border-neutral-800">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("bold") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("italic") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Button>

        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("heading", { level: 1 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("heading", { level: 2 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("heading", { level: 3 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" />
        </Button>

        <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("bulletList") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("orderedList") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
