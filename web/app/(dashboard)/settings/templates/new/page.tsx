"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  TextIcon,
  Heading01Icon,
  LinkSquare02Icon,
  Image01Icon,
  MinusSignIcon,
  EyeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useCreateTemplate } from "@/hooks/use-api";
import {
  TemplateBlockPreview,
  renderPreviewHtml,
  type TemplateEditorBlock,
} from "@/components/template-block-preview";
import {
  createDefaultOfferBlocks,
  createDefaultOfferWithdrawalBlocks,
  createDefaultRejectionBlocks,
  createDefaultAssessmentBlocks,
  createDefaultGeneralBlocks,
  createDefaultApplicationReceivedBlocks,
  createDefaultAssessmentCompletionBlocks,
  createDefaultInterviewInviteBlocks,
  DEFAULT_OFFER_TEMPLATE_NAME,
  DEFAULT_OFFER_TEMPLATE_SUBJECT,
  DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_NAME,
  DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_SUBJECT,
  DEFAULT_REJECTION_TEMPLATE_NAME,
  DEFAULT_REJECTION_TEMPLATE_SUBJECT,
  DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME,
  DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT,
  DEFAULT_GENERAL_TEMPLATE_NAME,
  DEFAULT_GENERAL_TEMPLATE_SUBJECT,
  DEFAULT_APPLICATION_RECEIVED_TEMPLATE_NAME,
  DEFAULT_APPLICATION_RECEIVED_TEMPLATE_SUBJECT,
  DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_NAME,
  DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_SUBJECT,
  DEFAULT_INTERVIEW_INVITE_TEMPLATE_NAME,
  DEFAULT_INTERVIEW_INVITE_TEMPLATE_SUBJECT,
  DEFAULT_TEMPLATE_BUTTON_LABEL,
  DEFAULT_TEMPLATE_HINT,
} from "@/lib/template-defaults";
import {
  VARIABLES,
  TYPE_META,
  uiTemplateTypeToApi,
  type TemplateTypeUi,
} from "@/lib/template-defaults";
import { editorBlocksToApiBodyJson } from "@/lib/template-mapper";
import type { TemplateBodyBlock } from "@/types";
import {
  TemplateBlockEditor,
  TemplateVariablesToolbar,
} from "@/components/template-editor-block";
import { useTemplateVariableInsert } from "@/hooks/use-template-variable-insert";

type BlockKind = TemplateBodyBlock["type"];

export type { TemplateEditorBlock as Block } from "@/components/template-block-preview";

const DEFAULT_CONTENT: Record<BlockKind, string> = {
  heading: "",
  text: "",
  button: "",
  image: "",
  divider: "",
  spacer: "",
};

const BLOCK_ICONS: Record<BlockKind, IconSvgElement> = {
  heading: Heading01Icon,
  text: TextIcon,
  button: LinkSquare02Icon,
  image: Image01Icon,
  divider: MinusSignIcon,
  spacer: PlusSignIcon,
};

export default function NewTemplatePage() {
  const router = useRouter();
  const createMutation = useCreateTemplate();

  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") as TemplateTypeUi | null;
  const templateType: TemplateTypeUi =
    rawType && rawType in TYPE_META ? rawType : "general";
  const vars = VARIABLES[templateType];

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<TemplateEditorBlock[]>([]);

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
      case "application_received":
        setName((n) =>
          n.trim() ? n : DEFAULT_APPLICATION_RECEIVED_TEMPLATE_NAME,
        );
        setSubject(DEFAULT_APPLICATION_RECEIVED_TEMPLATE_SUBJECT);
        setBlocks(createDefaultApplicationReceivedBlocks());
        break;
      case "assessment":
        setName((n) => (n.trim() ? n : DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME));
        setSubject(DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT);
        setBlocks(createDefaultAssessmentBlocks());
        break;
      case "assessment_completion":
        setName((n) =>
          n.trim() ? n : DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_NAME,
        );
        setSubject(DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_SUBJECT);
        setBlocks(createDefaultAssessmentCompletionBlocks());
        break;
      case "interview_invite":
        setName((n) => (n.trim() ? n : DEFAULT_INTERVIEW_INVITE_TEMPLATE_NAME));
        setSubject(DEFAULT_INTERVIEW_INVITE_TEMPLATE_SUBJECT);
        setBlocks(createDefaultInterviewInviteBlocks());
        break;
      case "offer":
        setName((n) => (n.trim() ? n : DEFAULT_OFFER_TEMPLATE_NAME));
        setSubject(DEFAULT_OFFER_TEMPLATE_SUBJECT);
        setBlocks(createDefaultOfferBlocks());
        break;
      case "offer_withdrawal":
        setName((n) => (n.trim() ? n : DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_NAME));
        setSubject(DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_SUBJECT);
        setBlocks(createDefaultOfferWithdrawalBlocks());
        break;
      case "rejection":
        setName((n) => (n.trim() ? n : DEFAULT_REJECTION_TEMPLATE_NAME));
        setSubject(DEFAULT_REJECTION_TEMPLATE_SUBJECT);
        setBlocks(createDefaultRejectionBlocks());
        break;
      case "general":
        setName((n) => (n.trim() ? n : DEFAULT_GENERAL_TEMPLATE_NAME));
        setSubject(DEFAULT_GENERAL_TEMPLATE_SUBJECT);
        setBlocks(createDefaultGeneralBlocks());
        break;
    }
  };

  const addBlock = (kind: BlockKind) =>
    setBlocks((prev) => [
      ...prev,
      { id: `${kind}-${Date.now()}`, kind, content: DEFAULT_CONTENT[kind] },
    ]);

  const updateBlock = (id: string, content: string) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));

  const deleteBlock = (id: string) =>
    setBlocks((prev) => prev.filter((b) => b.id !== id));

  const { captureSubjectCaret, captureBlockCaret, insertVariable } =
    useTemplateVariableInsert({
      subject,
      setSubject,
      blocks,
      updateBlock,
    });

  const handleSave = () => {
    if (!name.trim()) return;

    const bodyJson: TemplateBodyBlock[] = editorBlocksToApiBodyJson(blocks);

    createMutation.mutate(
      {
        name: name.trim(),
        type: uiTemplateTypeToApi(templateType),
        subject,
        bodyJson,
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

  const canSave = name.trim().length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,0px))] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/templates"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[13px] font-medium transition-colors"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              className="size-4"
              strokeWidth={2}
            />
            Back
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_META[templateType].badge}`}
          >
            {TYPE_META[templateType].label}
          </span>
          <span className="text-[14px] text-slate-400">New template</span>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || createMutation.isPending}
          className="h-9 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-lg text-sm border-none disabled:opacity-50 gap-2"
        >
          {createMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[52%] border-r border-slate-200 flex flex-col overflow-y-auto bg-white">
          <div className="p-7 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-neutral-300">
                    Starter layout
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug font-normal">
                    {DEFAULT_TEMPLATE_HINT[templateType]}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyDefaultTemplate}
                  className="h-8 shrink-0 border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  {DEFAULT_TEMPLATE_BUTTON_LABEL[templateType]}
                </Button>
              </div>
            </div>

            <TemplateVariablesToolbar vars={vars} onInsert={insertVariable} />

            <div>
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
                Template Name
              </Label>
              <Input
                placeholder="e.g. Standard Offer Letter"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-[15px] text-slate-700 placeholder:text-slate-300 dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
                Email Subject
              </Label>
              <Input
                placeholder={`e.g. Offer of Employment — {{job_title}}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={(e) => captureSubjectCaret(e.currentTarget)}
                onSelect={(e) => captureSubjectCaret(e.currentTarget)}
                onKeyUp={(e) => captureSubjectCaret(e.currentTarget)}
                onClick={(e) => captureSubjectCaret(e.currentTarget)}
                className="h-10 rounded-lg border border-slate-200 bg-white shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm text-slate-700 placeholder:text-slate-300 dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5 block">
                Add Block
              </Label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_BTNS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    onClick={() => addBlock(kind)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-medium hover:border-[var(--theme-color)]/40 hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 transition-all"
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
              <div className="flex flex-col items-center justify-center min-h-[180px] rounded-xl border-2 border-dashed border-slate-200 text-center gap-2">
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
                  <TemplateBlockEditor
                    key={b.id}
                    block={b}
                    onChange={updateBlock}
                    onDelete={deleteBlock}
                    vars={vars}
                    onTextCaret={captureBlockCaret}
                    darkMode={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-y-auto">
          <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <HugeiconsIcon
                icon={EyeIcon}
                className="size-4"
                strokeWidth={2}
              />
              <span className="font-medium">Live preview</span>
              <span className="text-[12px] text-slate-400 font-normal">
                Sample values
              </span>
            </div>
          </div>
          <div className="flex-1 p-8 flex justify-center">
            <div className="w-full max-w-[560px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 space-y-2 text-[13px]">
                {[
                  ["From", "user.openats@gmail.com"],
                  ["To", "candidate@email.com"],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-slate-400 w-14 shrink-0">
                      {label}
                    </span>
                    <span className="text-slate-700 font-medium">{val}</span>
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
                    You&apos;re receiving this because you applied for a
                    position.
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
