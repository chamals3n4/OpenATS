"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  RectangleHorizontal,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ButtonNode } from "./extensions/button-node";
import { VariableChip } from "./extensions/variable-chip";
import { SlashCommand } from "./extensions/slash-command";
import type { SlashMenuItem } from "./extensions/slash-menu";
import { moveTopLevelBlock } from "./extensions/block-move";
import { VariablePicker } from "./variable-picker";
import { VARS } from "../../../lib/template-form-constants";

type Props = {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
};

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

function buildSlashItems(query: string): SlashMenuItem[] {
  const items: SlashMenuItem[] = [
    {
      title: "Heading 1",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
    },
    {
      title: "Heading 2",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      title: "Heading 3",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      title: "Bullet List",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Button",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "emailButton", attrs: { label: "Click Here", href: "[url]" } })
          .run(),
    },
    {
      title: "Divider",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];

  VARS.forEach((v) => {
    items.push({
      title: `{{${v}}}`,
      description: "Variable",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "variableChip", attrs: { variable: v } })
          .run(),
    });
  });

  const q = query.toLowerCase();
  return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 8);
}

function LinkPopover({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setHref(editor.getAttributes("link").href || "");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={`size-8 ${editor.isActive("link") ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
          />
        }
      >
        <LinkIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            placeholder="https://..."
            value={href}
            onChange={(e) => setHref(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex justify-end gap-1.5">
            {editor.isActive("link") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setOpen(false);
                }}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (href.trim()) {
                  editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
                }
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EmailBodyEditor({ value, onChange, readOnly = false }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; top: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({ placeholder: "Write your email…" }),
      ButtonNode,
      VariableChip,
      SlashCommand.configure({ items: buildSlashItems }),
    ],
    content: value || "",
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] p-4 text-[14px] leading-[1.5] text-slate-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 focus:outline-none " +
          "[&_p]:m-0 [&_p+p]:mt-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 " +
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:m-0 [&_h1+p]:mt-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:m-0 [&_h2+p]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:m-0 [&_h3+p]:mt-1.5 " +
          "[&_a]:text-[var(--theme-color)] [&_a]:underline [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-neutral-700",
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const proseMirrorEl = wrapperRef.current?.querySelector(".ProseMirror");
    if (!proseMirrorEl) return;
    const target = e.target as HTMLElement;
    const children = Array.from(proseMirrorEl.children) as HTMLElement[];
    const index = children.findIndex((child) => child.contains(target));
    if (index === -1) {
      setHover(null);
      return;
    }
    const wrapperRect = wrapperRef.current!.getBoundingClientRect();
    const childRect = children[index]!.getBoundingClientRect();
    setHover({ index, top: childRect.top - wrapperRect.top });
  };

  if (!editor) {
    return (
      <div className="min-h-[320px] p-4 text-sm bg-white dark:bg-neutral-950 text-slate-400 dark:text-neutral-500">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="border border-slate-300 dark:border-neutral-600 rounded-xl overflow-hidden shadow-none">
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 bg-[#F8FAFC]/50 dark:bg-neutral-900/50 border-b border-slate-300 dark:border-neutral-600 flex-wrap">
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
          <LinkPopover editor={editor} />

          <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${editor.isActive("heading", { level: 1 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${editor.isActive("heading", { level: 2 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${editor.isActive("heading", { level: 3 }) ? "text-theme bg-theme/10" : "text-slate-500 dark:text-neutral-400"}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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

          <div className="w-px h-4 bg-slate-200 dark:bg-neutral-700 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-slate-500 dark:text-neutral-400"
            title="Insert button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({ type: "emailButton", attrs: { label: "Click Here", href: "[url]" } })
                .run()
            }
          >
            <RectangleHorizontal className="size-4" />
          </Button>
          <VariablePicker
            onSelect={(v) =>
              editor.chain().focus().insertContent({ type: "variableChip", attrs: { variable: v } }).run()
            }
          />
        </div>
      )}

      <div ref={wrapperRef} className="relative" onMouseMove={!readOnly ? handleMouseMove : undefined} onMouseLeave={() => setHover(null)}>
        <EditorContent editor={editor} />

        {!readOnly && hover && (
          <div
            className="absolute left-1 flex flex-col gap-0.5 -translate-y-0.5"
            style={{ top: hover.top }}
          >
            <button
              type="button"
              disabled={hover.index === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveTopLevelBlock(editor, hover.index, hover.index - 1)}
              className="size-5 flex items-center justify-center rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-400 hover:text-[var(--theme-color)] hover:border-[var(--theme-color)]/40 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowUp className="size-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveTopLevelBlock(editor, hover.index, hover.index + 1)}
              className="size-5 flex items-center justify-center rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-400 hover:text-[var(--theme-color)] hover:border-[var(--theme-color)]/40"
            >
              <ArrowDown className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
