"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CursorPointer02Icon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  TextBoldIcon,
  TextItalicIcon,
} from "@hugeicons/core-free-icons";
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
import { useVariableGroups } from "./variables-context";

type Props = {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
};

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

function buildSlashItems(query: string, variables: string[]): SlashMenuItem[] {
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

  variables.forEach((v) => {
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

const toolCls = (active: boolean) =>
  `size-8 cursor-pointer ${active ? "bg-theme/10 text-theme dark:text-primary" : "text-slate-600 dark:text-neutral-300"}`;

function ToolbarButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: typeof TextBoldIcon;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={toolCls(active)}
      onClick={onClick}
    >
      <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} />
    </Button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-4 w-px bg-slate-300 dark:bg-neutral-700" />;

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
            aria-label="Link"
            title="Link"
            className={toolCls(editor.isActive("link"))}
          />
        }
      >
        <HugeiconsIcon icon={Link01Icon} className="size-4" strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            aria-label="Link address"
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
  const variables = useVariableGroups().flatMap((group) => group.vars.map((v) => v.name));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({ placeholder: "Write your email…" }),
      ButtonNode,
      VariableChip,
      SlashCommand.configure({ items: (query: string) => buildSlashItems(query, variables) }),
    ],
    content: value || "",
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[360px] py-4 pr-4 pl-10 text-[14px] leading-[1.5] text-slate-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 focus:outline-none " +
          "[&_p]:m-0 [&_p+p]:mt-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 " +
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:m-0 [&_h1+p]:mt-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:m-0 [&_h2+p]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:m-0 [&_h3+p]:mt-1.5 " +
          "[&_a]:text-[var(--theme-color)] [&_a]:underline [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-neutral-700 " +
          "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-slate-400 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
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
      <div className="min-h-[360px] border-t border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
        Loading editor…
      </div>
    );
  }

  const insertButton = () =>
    editor
      .chain()
      .focus()
      .insertContent({ type: "emailButton", attrs: { label: "Click Here", href: "[url]" } })
      .run();
  const moveCls =
    "flex size-5 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-slate-500 hover:border-theme/50 hover:text-theme disabled:pointer-events-none disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400";

  return (
    <div className="border-t border-slate-200 dark:border-neutral-800">
      {!readOnly && (
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <ToolbarButton
            label="Bold"
            icon={TextBoldIcon}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic"
            icon={TextItalicIcon}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <LinkPopover editor={editor} />
          <Divider />
          <ToolbarButton
            label="Heading 1"
            icon={Heading01Icon}
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <ToolbarButton
            label="Heading 2"
            icon={Heading02Icon}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Heading 3"
            icon={Heading03Icon}
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <Divider />
          <ToolbarButton
            label="Bullet list"
            icon={LeftToRightListBulletIcon}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Numbered list"
            icon={LeftToRightListNumberIcon}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Divider />
          <ToolbarButton label="Insert a button" icon={CursorPointer02Icon} onClick={insertButton} />
          <span className="ml-auto">
            <VariablePicker
              target="body"
              onSelect={(v) =>
                editor.chain().focus().insertContent({ type: "variableChip", attrs: { variable: v } }).run()
              }
            />
          </span>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="relative"
        onMouseMove={!readOnly ? handleMouseMove : undefined}
        onMouseLeave={() => setHover(null)}
      >
        <EditorContent editor={editor} />

        {!readOnly && hover && (
          <div className="absolute left-2 flex -translate-y-0.5 flex-col gap-0.5" style={{ top: hover.top }}>
            <button
              type="button"
              aria-label="Move block up"
              title="Move up"
              disabled={hover.index === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveTopLevelBlock(editor, hover.index, hover.index - 1)}
              className={moveCls}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Move block down"
              title="Move down"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => moveTopLevelBlock(editor, hover.index, hover.index + 1)}
              className={moveCls}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
