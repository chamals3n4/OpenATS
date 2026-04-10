"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  Delete02Icon,
  TextIcon,
  Heading01Icon,
  LinkSquare02Icon,
  Image01Icon,
  MinusSignIcon,
  EyeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useTemplate, useUpdateTemplate } from "@/hooks/use-api";
import {
  TemplateBlockPreview,
  renderPreviewHtml,
  type TemplateEditorBlock,
} from "@/components/template-block-preview";
import {
  createDefaultOfferBlocks,
  createDefaultRejectionBlocks,
  createDefaultAssessmentBlocks,
  createDefaultGeneralBlocks,
  DEFAULT_OFFER_TEMPLATE_NAME,
  DEFAULT_OFFER_TEMPLATE_SUBJECT,
  DEFAULT_REJECTION_TEMPLATE_NAME,
  DEFAULT_REJECTION_TEMPLATE_SUBJECT,
  DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME,
  DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT,
  DEFAULT_GENERAL_TEMPLATE_NAME,
  DEFAULT_GENERAL_TEMPLATE_SUBJECT,
  DEFAULT_TEMPLATE_BUTTON_LABEL,
  DEFAULT_TEMPLATE_HINT,
} from "@/lib/template-defaults";
import {
  apiBodyJsonToEditorBlocks,
  editorBlocksToApiBodyJson,
} from "@/lib/template-mapper";
import type { TemplateBodyBlock } from "@/types";

type TemplateType = "offer" | "rejection" | "assessment" | "general";
type BlockKind = TemplateBodyBlock["type"];

export type { TemplateEditorBlock as Block } from "@/components/template-block-preview";

const TYPE_META: Record<TemplateType, { label: string; badge: string }> = {
  offer: {
    label: "Offer Letter",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  rejection: {
    label: "Rejection",
    badge: "bg-red-50 text-red-600 border border-red-200",
  },
  assessment: {
    label: "Assessment Invite",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  general: {
    label: "General",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
  },
};

const VARIABLES: Record<TemplateType, string[]> = {
  offer: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "pay_frequency",
    "start_date",
    "expiry_date",
    "benefits",
    "company_name",
  ],
  rejection: ["candidate_name", "job_title", "company_name"],
  assessment: [
    "candidate_name",
    "job_title",
    "company_name",
    "assessment_link",
    "expiry_date",
  ],
  general: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "start_date",
    "expiry_date",
    "benefits",
    "company_name",
    "assessment_link",
  ],
};

const DEFAULT_CONTENT: Record<BlockKind, string> = {
  heading: "Your Heading Here",
  text: "Start writing your paragraph here. You can use variables like {{candidate_name}}.",
  button: "Click Here",
  image: "",
  divider: "",
  spacer: "",
};

const BLOCK_ICONS: Record<BlockKind, any> = {
  heading: Heading01Icon,
  text: TextIcon,
  button: LinkSquare02Icon,
  image: Image01Icon,
  divider: MinusSignIcon,
  spacer: PlusSignIcon,
};

function BlockEditor({
  block,
  onChange,
  onDelete,
  vars,
}: {
  block: TemplateEditorBlock;
  onChange(id: string, c: string): void;
  onDelete(id: string): void;
  vars: string[];
}) {
  if (["divider", "spacer", "image"].includes(block.kind)) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 group">
        <span className="text-[13px] text-slate-500 dark:text-neutral-400 capitalize font-medium">
          {block.kind}
        </span>
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 group overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60">
        <span className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
          {block.kind}
        </span>
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </button>
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onChange(block.id, e.target.value)}
        rows={block.kind === "text" ? 5 : 2}
        className="w-full px-4 py-3 text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed resize-none bg-white dark:bg-neutral-950 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-neutral-700"
        placeholder={`Enter ${block.kind} content`}
      />
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {vars.map((v) => (
          <button
            key={v}
            onClick={() => onChange(block.id, block.content + `{{${v}}}`)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { data: templateRes, isLoading, isError } = useTemplate(id);
  const updateMutation = useUpdateTemplate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<TemplateEditorBlock[]>([]);
  const [templateType, setTemplateType] = useState<TemplateType>("general");
  const [notFound, setNotFound] = useState(false);

  const applyDefaultTemplate = () => {
    if (
      blocks.length > 0 &&
      !window.confirm(
        "Replace the current blocks with the standard layout for this template type? Your edits will be lost.",
      )
    ) {
      return;
    }
    switch (templateType) {
      case "offer":
        setName((n) => (n.trim() ? n : DEFAULT_OFFER_TEMPLATE_NAME));
        setSubject(DEFAULT_OFFER_TEMPLATE_SUBJECT);
        setBlocks(createDefaultOfferBlocks());
        break;
      case "rejection":
        setName((n) => (n.trim() ? n : DEFAULT_REJECTION_TEMPLATE_NAME));
        setSubject(DEFAULT_REJECTION_TEMPLATE_SUBJECT);
        setBlocks(createDefaultRejectionBlocks());
        break;
      case "assessment":
        setName((n) => (n.trim() ? n : DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME));
        setSubject(DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT);
        setBlocks(createDefaultAssessmentBlocks());
        break;
      case "general":
        setName((n) => (n.trim() ? n : DEFAULT_GENERAL_TEMPLATE_NAME));
        setSubject(DEFAULT_GENERAL_TEMPLATE_SUBJECT);
        setBlocks(createDefaultGeneralBlocks());
        break;
    }
  };

  useEffect(() => {
    if (isError) {
      setNotFound(true);
      return;
    }
    const t = templateRes?.data;
    if (t) {
      setName(t.name);
      setSubject(t.subject);
      setTemplateType(
        t.type === "offer"
          ? "offer"
          : t.type === "rejection"
            ? "rejection"
            : t.type === "assessment_invite"
              ? "assessment"
              : "general",
      );

      const mappedBlocks = apiBodyJsonToEditorBlocks(t.bodyJson);
      if (mappedBlocks.length > 0) {
        setBlocks(mappedBlocks);
      }
    }
  }, [templateRes, isError]);

  const vars = VARIABLES[templateType];

  const addBlock = (kind: BlockKind) =>
    setBlocks((prev) => [
      ...prev,
      { id: `${kind}-${Date.now()}`, kind, content: DEFAULT_CONTENT[kind] },
    ]);

  const updateBlock = (bid: string, content: string) =>
    setBlocks((prev) =>
      prev.map((b) => (b.id === bid ? { ...b, content } : b)),
    );

  const deleteBlock = (bid: string) =>
    setBlocks((prev) => prev.filter((b) => b.id !== bid));

  const handleSave = () => {
    if (!name.trim()) return;

    const bodyJson: TemplateBodyBlock[] = editorBlocksToApiBodyJson(blocks);

    updateMutation.mutate(
      {
        id,
        data: {
          name: name.trim(),
          type:
            templateType === "offer"
              ? "offer"
              : templateType === "rejection"
                ? "rejection"
                : templateType === "assessment"
                  ? "assessment_invite"
                  : "general",
          subject,
          bodyJson,
        },
      },
      {
        onSuccess: () => {
          toast.success("Template saved");
          router.push("/settings/templates");
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not save template"),
      },
    );
  };

  const BLOCK_BTNS: { kind: BlockKind; label: string }[] = [
    { kind: "heading", label: "Heading" },
    { kind: "text", label: "Text" },
    { kind: "button", label: "Button" },
    { kind: "image", label: "Image" },
    { kind: "divider", label: "Divider" },
    { kind: "spacer", label: "Spacer" },
  ];

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center space-y-3">
          <p className="text-slate-500 dark:text-neutral-400 text-[15px]">
            Template not found.
          </p>
          <Link
            href="/settings/templates"
            className="text-[var(--theme-color)] font-medium hover:underline text-sm"
          >
            ← Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <p className="text-slate-400 animate-pulse text-sm">
          Loading template...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,0px))] bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-slate-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/templates"
            className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 text-[13px] font-medium transition-colors"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              className="size-4"
              strokeWidth={2}
            />
            Back
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800" />
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_META[templateType].badge}`}
          >
            {TYPE_META[templateType].label}
          </span>
          <span className="text-[14px] text-slate-600 dark:text-neutral-300 font-medium truncate max-w-sm">
            {name || "Edit template"}
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || updateMutation.isPending}
          className="h-9 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-lg text-sm border-none disabled:opacity-50"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="w-[52%] border-r border-slate-200 dark:border-neutral-800 flex flex-col overflow-y-auto bg-white dark:bg-neutral-950">
          <div className="p-7 space-y-6">
            <div>
              <Label className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2 block">
                Template Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-[15px] text-slate-700 placeholder:text-slate-300 dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2 block">
                Email Subject
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm text-slate-700 placeholder:text-slate-300 dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:placeholder:text-slate-400"
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/50 px-4 py-3">
              <p className="text-[12px] font-medium text-slate-600 dark:text-neutral-300 mb-2">
                Start from a polished layout
              </p>
              <Button
                type="button"
                onClick={applyDefaultTemplate}
                className="h-10 px-5 rounded-lg text-white text-[13px] font-semibold shadow-none border-none"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                {DEFAULT_TEMPLATE_BUTTON_LABEL[templateType]}
              </Button>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500 mt-2 leading-relaxed">
                {templateType === "offer" ? (
                  <>
                    Fills in name, subject, and blocks (including{" "}
                    <code className="text-[10px] bg-white dark:bg-neutral-950 px-1 rounded border border-slate-200 dark:border-neutral-700">
                      {"{{benefits}}"}
                    </code>
                    ). You can edit everything afterward.
                  </>
                ) : (
                  DEFAULT_TEMPLATE_HINT[templateType]
                )}
              </p>
            </div>

            <div>
              <Label className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                Variables{" "}
                <span className="text-[10px] font-normal text-slate-400 dark:text-neutral-600 normal-case tracking-normal">
                  · click to copy
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {vars.map((v) => (
                  <button
                    key={v}
                    onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                    className="text-[12px] font-mono px-2.5 py-1 rounded-md bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 transition-colors"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2.5 block">
                Add Block
              </Label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_BTNS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    onClick={() => addBlock(kind)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium hover:border-[var(--theme-color)]/40 hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 dark:hover:bg-[var(--theme-color)]/10 transition-all"
                  >
                    <HugeiconsIcon
                      icon={BLOCK_ICONS[kind]}
                      className="size-3.5"
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[180px] rounded-xl border-2 border-dashed border-slate-200 dark:border-neutral-800 text-center gap-2">
                <span className="text-[28px] text-slate-300 select-none">
                  +
                </span>
                <p className="text-[13px] font-medium text-slate-400">
                  No blocks yet
                </p>
                <p className="text-[12px] text-slate-300">
                  Click the buttons above to add content blocks
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((b) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    onChange={updateBlock}
                    onDelete={deleteBlock}
                    vars={vars}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="flex-1 bg-[#f8fafc] dark:bg-neutral-900/50 flex flex-col overflow-y-auto">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
              <HugeiconsIcon
                icon={EyeIcon}
                className="size-4"
                strokeWidth={2}
              />
              Live Preview
              <span className="text-slate-400 font-normal">
                — variables shown as sample values
              </span>
            </div>
          </div>
          <div className="flex-1 p-8 flex justify-center">
            <div className="w-full max-w-[560px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 space-y-2 text-[13px]">
                {[
                  ["From", "user.openats@gmail.com"],
                  ["To", "candidate@email.com"],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-3">
                    <span className="text-slate-400 w-14 shrink-0">{l}</span>
                    <span className="text-slate-700 font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex gap-3">
                  <span className="text-slate-400 w-14 shrink-0">Subject</span>
                  {subject ? (
                    <span
                      className="text-[13px] font-medium leading-snug text-slate-800"
                      dangerouslySetInnerHTML={{
                        __html: renderPreviewHtml(subject, vars),
                      }}
                    />
                  ) : (
                    <span className="text-slate-300 italic">No subject</span>
                  )}
                </div>
              </div>
              <div className="px-8 py-7">
                <div className="flex items-center gap-2 mb-6 pb-5 border-b border-slate-100">
                  <div className="size-8 rounded-full bg-[var(--theme-color)] flex items-center justify-center">
                    <div className="size-3.5 rounded-full border-2 border-white" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                    OpenATS
                  </span>
                </div>
                {blocks.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-slate-300">
                    Add blocks to see a preview
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blocks.map((b) => (
                      <TemplateBlockPreview key={b.id} block={b} vars={vars} />
                    ))}
                  </div>
                )}
                <div className="mt-8 pt-5 border-t border-slate-100 text-center text-[12px] text-slate-400 space-y-1">
                  <p>OpenATS Inc. · Colombo, Sri Lanka</p>
                  <p>
                    You're receiving this because you applied for a position.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
