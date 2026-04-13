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

import { useTemplate, useUpdateTemplate } from "@/hooks/use-api";
import type { TemplateBodyBlock } from "@/types";
import {
  type EmailTemplateType,
  EMAIL_TEMPLATE_TYPE_CONFIG,
  EMAIL_TEMPLATE_VARIABLES,
} from "@/lib/email-template-types";

type BlockKind = TemplateBodyBlock["type"] | "divider" | "spacer";

export interface Block {
  id: string;
  kind: BlockKind;
  content: string;
}

const SAMPLE: Record<string, string> = {
  candidate_name: "Alex Johnson",
  job_title: "Senior Software Engineer",
  salary: "5,000",
  currency: "USD",
  start_date: "March 15, 2026",
  expiry_date: "March 5, 2026",
  company_name: "OpenATS Inc.",
  assessment_link: "https://openats.io/assess/abc123",
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

function renderPreview(text: string, vars: string[]) {
  let out = text;
  vars.forEach((key) => {
    out = out.replaceAll(
      `{{${key}}}`,
      `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-weight:600;font-size:0.85em">${SAMPLE[key] ?? key}</span>`,
    );
  });
  return out;
}

function BlockPreview({ block, vars }: { block: Block; vars: string[] }) {
  switch (block.kind) {
    case "heading":
      return (
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1e293b",
            margin: "0 0 4px",
          }}
          dangerouslySetInnerHTML={{
            __html: renderPreview(block.content, vars),
          }}
        />
      );
    case "text":
      return (
        <p
          style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, margin: 0 }}
          dangerouslySetInnerHTML={{
            __html: renderPreview(block.content, vars).replace(/\n/g, "<br/>"),
          }}
        />
      );
    case "button":
      return (
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <span
            style={{
              display: "inline-block",
              background: "var(--theme-color)",
              color: "#fff",
              padding: "10px 28px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {block.content}
          </span>
        </div>
      );
    case "image":
      return (
        <div
          style={{
            background: "#f1f5f9",
            borderRadius: 8,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            Image placeholder
          </span>
        </div>
      );
    case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e2e8f0",
            margin: "4px 0",
          }}
        />
      );
    case "spacer":
      return <div style={{ height: 24 }} />;
    default:
      return null;
  }
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  vars,
}: {
  block: Block;
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
        {vars.slice(0, 5).map((v) => (
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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [templateType, setTemplateType] =
    useState<EmailTemplateType>("general");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isError) {
      setNotFound(true);
      return;
    }
    const t = templateRes?.data;
    if (t) {
      setName(t.name);
      setSubject(t.subject);
      setTemplateType(t.type);

      // Map API blocks to UI Blocks
      const mappedBlocks: Block[] = t.bodyJson.map((b, i) => ({
        id: `blk-${i}-${Date.now()}`,
        kind: b.type,
        content: b.content,
      }));
      if (mappedBlocks.length > 0) {
        setBlocks(mappedBlocks);
      }
    }
  }, [templateRes, isError]);

  const vars = EMAIL_TEMPLATE_VARIABLES[templateType];

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

    // Convert editor blocks to API TemplateBodyBlocks, filtering out UI-only blocks
    const bodyJson: TemplateBodyBlock[] = blocks
      .filter((b) => ["heading", "text", "button", "image"].includes(b.kind))
      .map((b) => ({
        type: b.kind as TemplateBodyBlock["type"],
        content: b.content,
      }));

    updateMutation.mutate(
      {
        id,
        data: {
          name: name.trim(),
          type: templateType,
          subject,
          bodyJson,
        },
      },
      {
        onSuccess: () => {
          router.push("/settings/templates");
        },
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
            href="settings/templates"
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
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${EMAIL_TEMPLATE_TYPE_CONFIG[templateType].badge}`}
          >
            {EMAIL_TEMPLATE_TYPE_CONFIG[templateType].label}
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
                className="h-10 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-[15px]"
              />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2 block">
                Email Subject
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
              />
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
                  ["From", "hr@openats.io"],
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
                      className="text-slate-900 font-semibold leading-snug"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(subject, vars),
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
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight">
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
                      <BlockPreview key={b.id} block={b} vars={vars} />
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
