"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { useTemplate, useUpdateTemplate } from "@/hooks/queries/use-templates";
import type { TemplateBodyBlock } from "@/types";

type BlockKind = "heading" | "text" | "button";
type Block = { id: string; kind: BlockKind; content: string };

const INPUT_CLASS =
  "h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0";
const TEXTAREA_CLASS =
  "w-full bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg px-4 py-3 text-[14px] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 resize-none focus:outline-none focus-visible:border-slate-300 dark:focus-visible:border-neutral-600";
const LABEL_CLASS =
  "text-sm font-semibold text-slate-700 dark:text-neutral-300";

export default function EditTemplatePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const templateId = parseInt(id);
  const { data: tplData } = useTemplate(templateId);
  const updateMutation = useUpdateTemplate();
  const template = tplData?.data;

  const isEvent = template?.type === "event";

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

  // Load existing data when template loads
  useEffect(() => {
    if (!template) return;
    setName(template.name);
    if (isEvent) {
      // Parse event config from bodyJson
      const blocks =
        (template.bodyJson as Array<{ type?: string; content?: string }>) ?? [];
      const configBlock = blocks.find((b: { content?: string }) =>
        b.content?.startsWith("{"),
      );
      if (configBlock) {
        try {
          const config = JSON.parse(configBlock.content!);
          setEventName(config.eventName || template.name);
          setEventDesc(config.description || "");
          setEventTypeRadio(config.eventType || "virtual");
          setMeetingUrl(config.meetingUrl || "");
          if (config.timeSlots?.length > 0) {
            setTimeSlots(
              config.timeSlots.map((dt: string) => ({ datetime: dt })),
            );
          }
        } catch {
          /* ignore */
        }
      }
      // Email body from non-JSON text block
      const textBlock = blocks.find(
        (b: { content?: string }) => b.content && !b.content.startsWith("{"),
      );
      // We'll use bodyText state — but since we don't have it in the form, just store in a text block
      if (textBlock) {
        setBlocks([
          { id: "existing", kind: "text", content: textBlock.content! },
        ]);
      }
    } else {
      setSubject(template.subject);
      const blks =
        (template.bodyJson as Array<{ type?: string; content?: string }>) ?? [];
      setBlocks(
        blks
          .filter((b) => b.type)
          .map((b, i) => ({
            id: `e${i}`,
            kind: (b.type as BlockKind) || "text",
            content: b.content || "",
          })),
      );
    }
  }, [template, isEvent]);

  const addBlock = (kind: BlockKind) =>
    setBlocks((p) => [
      ...p,
      { id: `${kind}-${Date.now()}`, kind, content: "Write your message." },
    ]);
  const updateBlock = (id: string, c: string) =>
    setBlocks((p) => p.map((b) => (b.id === id ? { ...b, content: c } : b)));
  const deleteBlock = (id: string) =>
    setBlocks((p) => p.filter((b) => b.id !== id));
  const addSlot = () => setTimeSlots([...timeSlots, { datetime: "" }]);

  const handleSave = () => {
    if (!name.trim()) return;
    updateMutation.mutate(
      {
        id: templateId,
        data: {
          name: name.trim(),
          subject: isEvent ? eventName || name : subject,
          bodyJson: isEvent
            ? [
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
              ]
            : blocks.map((b) => ({
                type: b.kind as TemplateBodyBlock["type"],
                content: b.content,
              })),
        },
      },
      { onSuccess: () => router.push("/settings/templates") },
    );
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-neutral-950 min-h-screen">
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
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isEvent ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"}`}
          >
            {isEvent ? "Interview Event" : "Email"}
          </span>
          <span className="text-[14px] text-slate-400 dark:text-neutral-500">
            Edit template
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || updateMutation.isPending}
          className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-7 py-8 space-y-6">
          <div className="space-y-2">
            <Label className={LABEL_CLASS}>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {isEvent ? (
            <>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Event Name</Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>
                  Description{" "}
                  <span className="text-slate-400 dark:text-neutral-500 font-normal">
                    (for hiring team)
                  </span>
                </Label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={3}
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
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={LABEL_CLASS}>Time Slots</Label>
                  <button
                    onClick={addSlot}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--theme-color)] hover:underline"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3" /> Add
                    Slot
                  </button>
                </div>
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
                          setTimeSlots(timeSlots.filter((_, j) => j !== i))
                        }
                        className="size-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className={LABEL_CLASS}>Email Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
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
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={b.content}
                    onChange={(e) => updateBlock(b.id, e.target.value)}
                    rows={b.kind === "text" ? 5 : 2}
                    className="w-full px-4 py-3 text-[14px] bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
