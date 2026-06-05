"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { serverFetch } from "@/lib/auth-action";
import { toast } from "sonner";

interface Template {
  id: number;
  name: string;
  type: string;
  bodyJson?: unknown;
}

interface Props {
  candidateId: number;
  candidateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  pipelineStageId: number;
  onSuccess?: () => void;
}

/** Find selected template name for display in SelectValue */
function findTemplateName(templates: Template[], id: string): string | null {
  return templates.find((t) => String(t.id) === id)?.name ?? null;
}

export function InterviewSchedulerDialog({
  candidateId,
  candidateName,
  open,
  onOpenChange,
  templates,
  pipelineStageId,
  onSuccess,
}: Props) {
  const eventTemplates = templates.filter((t) => t.type === "event");

  // Whether we're using a pre-made template
  const [useTemplate, setUseTemplate] = useState("");
  const templateSelected = !!useTemplate;

  // Find selected template config
  const selectedTpl = templateSelected
    ? eventTemplates.find((t) => String(t.id) === useTemplate)
    : null;

  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<"virtual" | "onsite">("virtual");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [timeSlots, setTimeSlots] = useState([{ datetime: "" }]);
  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = (id: string | null) => {
    const val = id ?? "";
    setUseTemplate(val);
    if (!val) {
      setEventName("");
      setEventType("virtual");
      setMeetingUrl("");
      setTimeSlots([{ datetime: "" }]);
      setBodyText("");
      return;
    }
    const tpl = eventTemplates.find((t) => String(t.id) === val);
    if (!tpl) return;
    setEventName(tpl.name);
    setEventType("virtual");
    setMeetingUrl("");
    const blocks = (tpl.bodyJson as Array<{ content?: string }>) ?? [];
    // Read event config from bodyJson (stored as JSON text block)
    const configBlock = blocks.find((b: { content?: string }) =>
      b.content?.startsWith("{"),
    );
    if (configBlock) {
      try {
        const config = JSON.parse(configBlock.content!);
        setEventType(config.eventType || "virtual");
        setMeetingUrl(config.meetingUrl || "");
        if (config.timeSlots?.length > 0) {
          setTimeSlots(
            config.timeSlots.map((dt: string) => ({ datetime: dt })),
          );
        } else {
          setTimeSlots([{ datetime: "" }]);
        }
      } catch {
        setTimeSlots([{ datetime: "" }]);
      }
    }
    // Email body from first non-JSON text block
    const textBlock = blocks.find(
      (b: { content?: string }) => b.content && !b.content.startsWith("{"),
    );
    setBodyText(textBlock?.content ?? "");
  };

  const addSlot = () => setTimeSlots([...timeSlots, { datetime: "" }]);

  const handleSubmit = async () => {
    const name = eventName.trim();
    if (!name || !bodyText.trim()) return;
    const validSlots = timeSlots.filter(
      (s: { datetime: string }) => s.datetime,
    );
    setSaving(true);
    try {
      await serverFetch(`/candidates/${candidateId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          eventName: name,
          eventType,
          meetingUrl: eventType === "virtual" ? meetingUrl || null : null,
          bodyText: bodyText || null,
          stageId: pipelineStageId,
          timeSlots: validSlots.map((s) => ({
            datetime: new Date(s.datetime).toISOString(),
            selected: false,
          })),
        }),
      });
      toast.success("Interview scheduled — email sent to candidate.");
      onSuccess?.();
      onOpenChange(false);
      setEventName("");
      setBodyText("");
      setTimeSlots([{ datetime: "" }]);
      setUseTemplate("");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl sm:!max-w-2xl rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg px-6 py-4">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-[18px] font-bold text-slate-900 dark:text-neutral-100">
            Schedule Interview - {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Use Template (optional)
            </Label>
            {eventTemplates.length > 0 ? (
              <Select value={useTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] w-full rounded-lg">
                  <SelectValue placeholder="Select event template or create custom">
                    {useTemplate
                      ? findTemplateName(eventTemplates, useTemplate)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                  <SelectItem value="">Custom (no template)</SelectItem>
                  {eventTemplates.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      className="text-[13px]"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[12px] text-slate-400 dark:text-neutral-500">
                No event templates yet. Create one in Settings → Templates.
              </p>
            )}
          </div>

          {/* Template info summary when selected */}
          {templateSelected && selectedTpl && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-[13px] space-y-1">
              <p className="font-semibold text-slate-700 dark:text-neutral-300">
                Using template: {selectedTpl.name}
              </p>
              <p className="text-slate-500 dark:text-neutral-400">
                Event details are pre-configured from the template. Just write
                the email body below.
              </p>
            </div>
          )}

          {/* Only show these fields for custom (no template) */}
          {!templateSelected && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Event Name
                </Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Technical Interview Round 1"
                  className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Event Type
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${eventType === "virtual" ? "border-[var(--theme-color)] bg-(--theme-color)/5" : "border-slate-200 dark:border-neutral-700"}`}
                  >
                    <input
                      type="radio"
                      checked={eventType === "virtual"}
                      onChange={() => setEventType("virtual")}
                      className="text-[var(--theme-color)]"
                    />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                      Virtual
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${eventType === "onsite" ? "border-[var(--theme-color)] bg-(--theme-color)/5" : "border-slate-200 dark:border-neutral-700"}`}
                  >
                    <input
                      type="radio"
                      checked={eventType === "onsite"}
                      onChange={() => setEventType("onsite")}
                      className="text-[var(--theme-color)]"
                    />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                      On-site
                    </span>
                  </label>
                </div>
              </div>

              {eventType === "virtual" && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    Meeting URL
                  </Label>
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="Zoom / Teams / Meet link"
                    className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] rounded-lg"
                  />
                </div>
              )}
            </>
          )}

          {/* Time slots — always visible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Time Slots
              </Label>
              <button
                onClick={addSlot}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--theme-color)] hover:underline"
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-3"
                  strokeWidth={3}
                />{" "}
                Add Time Slot
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
                  className="h-10 flex-1 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] rounded-lg"
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

          {/* Email body — always visible */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Email Body
            </Label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Write the message the candidate will receive..."
              className="min-h-[80px] w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2.5 text-[13px] shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border-none bg-neutral-700 px-4 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !bodyText.trim() ||
              !timeSlots.some((s: { datetime: string }) => s.datetime) ||
              saving
            }
            className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send to Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
