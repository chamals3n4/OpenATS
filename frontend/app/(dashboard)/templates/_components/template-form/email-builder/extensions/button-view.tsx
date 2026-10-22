"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVariableGroups } from "../variables-context";
import { moveTopLevelBlock } from "./block-move";
import { isUsableButtonLink } from "./button-style";

/** The button as it sits in the editor: click it to set its text and link, or move it. */
export function ButtonView({ node, updateAttributes, deleteNode, editor, getPos, selected }: ReactNodeViewProps) {
  const label = (node.attrs.label as string) || "";
  const href = (node.attrs.href as string) || "";
  const editable = editor.isEditable;
  // A button that was just inserted opens straight away, so its text and link are set first
  const [open, setOpen] = useState(() => Boolean(node.attrs.autoOpen) && editable);
  useEffect(() => {
    if (node.attrs.autoOpen) updateAttributes({ autoOpen: false });
  }, [node.attrs.autoOpen, updateAttributes]);

  // Link variables (such as the offer link) offered as one-click choices
  const linkVariables = useVariableGroups()
    .flatMap((group) => group.vars)
    .filter((v) => /(_url|_link)$/.test(v.name));

  const index = () => {
    const pos = getPos();
    return typeof pos === "number" ? editor.state.doc.resolve(pos).index(0) : -1;
  };
  const move = (by: number) => {
    const from = index();
    if (from >= 0) moveTopLevelBlock(editor, from, from + by);
  };
  const linkOk = isUsableButtonLink(href);

  return (
    <NodeViewWrapper className="group/button relative my-4 flex items-start gap-1.5" data-email-button-view="">
      {editable && (
        <span
          data-drag-handle=""
          contentEditable={false}
          title="Drag to move"
          className="-ml-7 mt-2 flex size-5 cursor-grab items-center justify-center rounded text-slate-400 opacity-0 transition-opacity group-hover/button:opacity-100 hover:text-slate-600 active:cursor-grabbing dark:text-neutral-500"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
        </span>
      )}
      <div contentEditable={false}>
        <Popover open={open && editable} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                title={editable ? "Edit the button" : undefined}
                className={`cursor-pointer rounded-md outline-offset-4 ${
                  selected || open ? "outline-2 outline-theme/60" : "hover:outline-2 hover:outline-slate-300"
                }`}
              />
            }
          >
            {/* Drawn like the real email button in email-layout.ts */}
            <span className="pointer-events-none inline-block rounded-md bg-[#145962] px-[22px] py-3 text-[15px] leading-tight font-semibold text-white">
              {label || "Button text"}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-button-label" className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                  Button text
                </Label>
                <Input
                  id="email-button-label"
                  value={label}
                  maxLength={60}
                  placeholder="e.g. View your offer"
                  onChange={(e) => updateAttributes({ label: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-button-link" className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                  Link
                </Label>
                <Input
                  id="email-button-link"
                  value={href}
                  placeholder="https://… or a link variable"
                  onChange={(e) => updateAttributes({ href: e.target.value.trim() })}
                  className="h-8 text-sm"
                />
                {linkVariables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {linkVariables.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => updateAttributes({ href: `{{${v.name}}}` })}
                        className="cursor-pointer rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 hover:border-theme hover:text-theme dark:border-neutral-700 dark:text-neutral-300"
                      >
                        {`{{${v.name}}}`}
                      </button>
                    ))}
                  </div>
                )}
                {href && !linkOk && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Use a full address starting with https://, or a link variable.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-neutral-800">
                <div className="flex gap-1">
                  <Button type="button" variant="cancel" size="icon" className="size-8" title="Move up" aria-label="Move up" onClick={() => move(-1)}>
                    <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
                  </Button>
                  <Button type="button" variant="cancel" size="icon" className="size-8" title="Move down" aria-label="Move down" onClick={() => move(1)}>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="cancel"
                    size="icon"
                    className="size-8 hover:border-red-300 hover:text-red-600"
                    title="Remove the button"
                    aria-label="Remove the button"
                    onClick={() => deleteNode()}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  className="h-8 bg-theme px-3 text-sm text-white hover:bg-theme-hover"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <p
          className={`mt-1.5 flex items-center gap-1 text-xs ${
            linkOk ? "text-slate-400 dark:text-neutral-500" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          <HugeiconsIcon icon={linkOk ? Link01Icon : Alert02Icon} className="size-3.5 shrink-0" />
          <span className="max-w-80 truncate">{linkOk ? href : "No link yet. Click the button to add one."}</span>
        </p>
      </div>
    </NodeViewWrapper>
  );
}
