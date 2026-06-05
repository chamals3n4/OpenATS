"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete02Icon,
  Heading01Icon,
  TextIcon,
  EyeIcon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTemplate } from "@/hooks/queries/use-templates";
import type { TemplateBodyBlock } from "@/types";

type TemplateType = "email" | "event";
type BlockKind = "heading" | "text" | "button";
type Block = { id: string; kind: BlockKind; content: string };

const VARS = ["candidate_name", "job_title", "company_name"];
const SAMPLE: Record<string, string> = {
  candidate_name: "Alex Johnson",
  job_title: "Senior Software Engineer",
  company_name: "OpenATS Inc.",
};

const INPUT_CLASS =
  "h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0";
const TEXTAREA_CLASS =
  "w-full bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg px-4 py-3 text-[14px] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 resize-none focus:outline-none focus-visible:border-slate-300 dark:focus-visible:border-neutral-600";
const LABEL_CLASS =
  "text-sm font-semibold text-slate-700 dark:text-neutral-300";

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

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") as TemplateType | null;
  const templateType: TemplateType = rawType === "event" ? "event" : "email";

  const createMutation = useCreateTemplate();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTypeRadio, setEventTypeRadio] = useState<"virtual" | "onsite">(
    "virtual",
  );
  const [meetingUrl, setMeetingUrl] = useState("");
  const [timeSlots, setTimeSlots] = useState([{ datetime: "" }]);

  const addBlock = (kind: BlockKind) =>
    setBlocks((p) => [
      ...p,
      {
        id: `${kind}-${Date.now()}`,
        kind,
        content:
          kind === "heading"
            ? "Your Heading"
            : kind === "text"
              ? "Write your message."
              : "Click Here",
      },
    ]);
  const updateBlock = (id: string, c: string) =>
    setBlocks((p) => p.map((b) => (b.id === id ? { ...b, content: c } : b)));
  const deleteBlock = (id: string) =>
    setBlocks((p) => p.filter((b) => b.id !== id));
  const addSlot = () => setTimeSlots([...timeSlots, { datetime: "" }]);

  const handleSave = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      {
        name: name.trim(),
        type: templateType,
        subject: templateType === "event" ? eventName || name : subject,
        bodyJson:
          templateType === "email"
            ? blocks.map((b) => ({
                type: b.kind as TemplateBodyBlock["type"],
                content: b.content,
              }))
            : [
                // Store event config as a text block with JSON
                {
                  type: "text" as const,
                  content: JSON.stringify({
                    eventName: eventName || name,
                    eventType: eventTypeRadio,
                    meetingUrl:
                      eventTypeRadio === "virtual" ? meetingUrl : null,
                    description: eventDesc,
                    timeSlots: timeSlots
                      .filter((s) => s.datetime)
                      .map((s) => s.datetime),
                  }),
                },
              ],
      },
      { onSuccess: () => router.push("/settings/templates") },
    );
  };

  return (
    <div className="flex flex-col bg-white dark:bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-slate-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/templates"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800" />
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${templateType === "email" ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" : "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"}`}
          >
            {templateType === "email" ? "Email" : "Interview Event"}
          </span>
          <span className="text-[14px] text-slate-400 dark:text-neutral-500">
            New template
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
          className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
        >
          {createMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>

      {/* Centered form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-7 py-8 space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label className={LABEL_CLASS}>Template Name</Label>
            <Input
              placeholder="e.g. Standard Offer Letter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {/* ─── Email fields ─── */}
          {templateType === "email" && (
            <>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Email Subject</Label>
                <Input
                  placeholder="e.g. Interview Invitation — {{job_title}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <Label className={`${LABEL_CLASS} flex items-center gap-2`}>
                  Variables{" "}
                  <span className="text-xs font-normal text-slate-400 dark:text-neutral-500">
                    · click to copy
                  </span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {VARS.map((v) => (
                    <button
                      key={v}
                      onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                      className="text-[12px] font-mono px-2.5 py-1 rounded-md bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 dark:bg-[var(--theme-color)]/10 dark:border-[var(--theme-color)]/30 transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Content Blocks</Label>
                <div className="flex flex-wrap gap-2">
                  {(["heading", "text", "button"] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => addBlock(kind)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-[13px] font-medium hover:border-[var(--theme-color)]/40 hover:text-[var(--theme-color)] transition-all"
                    >
                      <HugeiconsIcon
                        icon={
                          kind === "heading"
                            ? Heading01Icon
                            : kind === "text"
                              ? TextIcon
                              : EyeIcon
                        }
                        className="size-3.5"
                      />{" "}
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed border-slate-200 dark:border-neutral-700 text-center gap-2">
                  <p className="text-[13px] font-medium text-slate-400 dark:text-neutral-500">
                    No blocks yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((b) => (
                    <div
                      key={b.id}
                      className="border border-slate-200 dark:border-neutral-700 rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border-b border-slate-100 dark:border-neutral-700">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase">
                          {b.kind}
                        </span>
                        <button
                          onClick={() => deleteBlock(b.id)}
                          className="text-slate-300 dark:text-neutral-600 hover:text-red-500"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-3.5"
                          />
                        </button>
                      </div>
                      <textarea
                        value={b.content}
                        onChange={(e) => updateBlock(b.id, e.target.value)}
                        rows={b.kind === "text" ? 5 : 2}
                        className="w-full px-4 py-3 text-[14px] bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 leading-relaxed resize-none focus:outline-none placeholder:text-slate-300 dark:placeholder:text-neutral-600"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Email preview */}
              {blocks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className={LABEL_CLASS}>Preview</Label>
                  <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-6">
                    <div className="space-y-4">
                      {blocks.map((b) => {
                        switch (b.kind) {
                          case "heading":
                            return (
                              <h2
                                key={b.id}
                                style={{
                                  fontSize: 22,
                                  fontWeight: 700,
                                  color: "inherit",
                                  margin: 0,
                                }}
                                className="text-slate-900 dark:text-neutral-100"
                                dangerouslySetInnerHTML={{
                                  __html: renderPreview(b.content, VARS),
                                }}
                              />
                            );
                          case "text":
                            return (
                              <p
                                key={b.id}
                                style={{
                                  fontSize: 14,
                                  lineHeight: 1.8,
                                  margin: 0,
                                }}
                                className="text-slate-600 dark:text-neutral-300"
                                dangerouslySetInnerHTML={{
                                  __html: renderPreview(
                                    b.content,
                                    VARS,
                                  ).replace(/\n/g, "<br/>"),
                                }}
                              />
                            );
                          case "button":
                            return (
                              <div
                                key={b.id}
                                style={{ textAlign: "center", margin: "8px 0" }}
                              >
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
                                  {b.content}
                                </span>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Event fields ─── */}
          {templateType === "event" && (
            <>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Event Name</Label>
                <Input
                  placeholder="e.g. Technical Interview Round 1"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-2">
                <Label className={LABEL_CLASS}>
                  Description{" "}
                  <span className="text-slate-400 dark:text-neutral-500 font-normal">
                    (for hiring team context)
                  </span>
                </Label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={3}
                  placeholder="e.g. Focus on system design and architecture"
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Event Type</Label>
                <div className="flex items-center gap-4">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${eventTypeRadio === "virtual" ? "border-[var(--theme-color)] bg-(--theme-color)/5 dark:bg-(--theme-color)/10" : "border-slate-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800"}`}
                  >
                    <input
                      type="radio"
                      checked={eventTypeRadio === "virtual"}
                      onChange={() => setEventTypeRadio("virtual")}
                      className="text-[var(--theme-color)]"
                    />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                      Virtual
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${eventTypeRadio === "onsite" ? "border-[var(--theme-color)] bg-(--theme-color)/5 dark:bg-(--theme-color)/10" : "border-slate-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800"}`}
                  >
                    <input
                      type="radio"
                      checked={eventTypeRadio === "onsite"}
                      onChange={() => setEventTypeRadio("onsite")}
                      className="text-[var(--theme-color)]"
                    />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                      On-site
                    </span>
                  </label>
                </div>
              </div>

              {eventTypeRadio === "virtual" && (
                <div className="space-y-2">
                  <Label className={LABEL_CLASS}>Meeting URL</Label>
                  <Input
                    placeholder="Zoom / Teams / Meet link"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={LABEL_CLASS}>Default Time Slots</Label>
                  <button
                    onClick={addSlot}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--theme-color)] hover:underline"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3" /> Add
                    Slot
                  </button>
                </div>
                <div className="space-y-2">
                  {timeSlots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        value={s.datetime}
                        onChange={(e) => {
                          const n = [...timeSlots];
                          n[i].datetime = e.target.value;
                          setTimeSlots(n);
                        }}
                        className={INPUT_CLASS + " flex-1"}
                      />
                      {timeSlots.length > 1 && (
                        <button
                          onClick={() =>
                            setTimeSlots(
                              timeSlots.filter((_, idx) => idx !== i),
                            )
                          }
                          className="size-9 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
