"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { serverFetch } from "@/lib/auth-action";
import { toast } from "sonner";
import { useUsers } from "@/hooks/queries/use-user";
import { useUserIntegrationStatus } from "@/hooks/queries/use-integrations";
import { useAllocatedSlots } from "@/hooks/queries/use-interviews";

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

const inputCls =
  "h-9 bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const selectTriggerCls =
  "w-full h-9! rounded-md bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 shadow-none px-3! py-0! text-sm focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const labelCls =
  "text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block";

/** Find selected template name for display in SelectValue */
function findTemplateName(templates: Template[], id: string): string | null {
  return templates.find((t) => String(t.id) === id)?.name ?? null;
}

/** Find selected interviewer's display name for SelectValue */
function findUserName(
  users: { id: number; firstName: string; lastName: string }[],
  id: number,
): string | null {
  const u = users.find((u) => u.id === id);
  return u ? `${u.firstName} ${u.lastName}` : null;
}

/** A slot is usable only if it parses and is still in the future. */
function isFutureSlot(datetime: string): boolean {
  const d = new Date(datetime);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
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
  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];

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
  const [location, setLocation] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [timeSlots, setTimeSlots] = useState([{ datetime: "" }]);
  const [saving, setSaving] = useState(false);
  const [interviewerId, setInterviewerId] = useState<number | null>(null);
  const [linkMode, setLinkMode] = useState<"manual" | "auto">("manual");

  const { data: interviewerStatusData } = useUserIntegrationStatus(interviewerId);
  const interviewerGoogleConnected =
    interviewerStatusData?.data.find((s) => s.provider === "google_meet")?.connected ?? false;

  const { data: allocatedSlotsData } = useAllocatedSlots(open);
  const allocatedTimes = new Set(
    (allocatedSlotsData?.data ?? []).map((s) => new Date(s.datetime).getTime()),
  );
  const isAllocated = (datetime: string) => {
    if (!datetime) return false;
    const t = new Date(datetime).getTime();
    return !Number.isNaN(t) && allocatedTimes.has(t);
  };

  const handleTemplateSelect = (id: string | null) => {
    const val = id ?? "";
    setUseTemplate(val);
    if (!val) {
      setEventName("");
      setEventType("virtual");
      setMeetingUrl("");
      setLinkMode("manual");
      setLocation("");
      setTimeSlots([{ datetime: "" }]);
      setBodyText("");
      return;
    }
    const tpl = eventTemplates.find((t) => String(t.id) === val);
    if (!tpl) return;
    setEventName(tpl.name);
    setEventType("virtual");
    setMeetingUrl("");
    setLinkMode("manual");
    setLocation("");
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
        // Downgraded back to manual by the effect below if the interviewer isn't connected
        setLinkMode(config.autoGenerateMeet ? "auto" : "manual");
        setLocation(config.location || "");
        const futureSlots: string[] = (config.timeSlots ?? []).filter(
          (dt: string) => isFutureSlot(dt),
        );
        if (futureSlots.length > 0) {
          setTimeSlots(futureSlots.map((dt) => ({ datetime: dt })));
        } else {
          setTimeSlots([{ datetime: "" }]);
        }
        if ((config.timeSlots?.length ?? 0) > futureSlots.length) {
          toast.info(
            "Some of this template's time slots have already passed and were skipped — add fresh ones.",
          );
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

  useEffect(() => {
    if (linkMode === "auto" && !interviewerGoogleConnected) {
      setLinkMode("manual");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewerId, interviewerGoogleConnected]);

  const addSlot = () => setTimeSlots([...timeSlots, { datetime: "" }]);

  const resetForm = () => {
    setEventName("");
    setMeetingUrl("");
    setLocation("");
    setBodyText("");
    setTimeSlots([{ datetime: "" }]);
    setUseTemplate("");
    setInterviewerId(null);
    setLinkMode("manual");
  };

  const handleSubmit = async () => {
    const name = eventName.trim();
    if (!useTemplate || !name || !bodyText.trim() || !interviewerId) return;
    const validSlots = timeSlots.filter(
      (s: { datetime: string }) => s.datetime && isFutureSlot(s.datetime),
    );
    if (validSlots.length === 0) {
      toast.error("Add at least one time slot in the future.");
      return;
    }
    const autoGenerate = eventType === "virtual" && linkMode === "auto" && interviewerGoogleConnected;
    if (eventType === "virtual" && !autoGenerate && !meetingUrl.trim()) {
      toast.error(
        "Virtual interviews need a meeting link — auto-generate one or paste a URL.",
      );
      return;
    }
    setSaving(true);
    try {
      await serverFetch(`/candidates/${candidateId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          eventName: name,
          eventType,
          meetingUrl: eventType === "virtual" && !autoGenerate ? meetingUrl || null : null,
          meetingProvider: autoGenerate ? "google_meet" : undefined,
          interviewerId,
          location: eventType === "onsite" ? location || null : null,
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
      resetForm();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 shrink-0">
          <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
            Schedule Interview{" "}
            <span className="font-normal text-slate-400 dark:text-neutral-500">
              — {candidateName}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Schedule an interview for {candidateName}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-3 pb-5 grid grid-cols-2 gap-x-5 gap-y-5 overflow-y-auto">
          {/* Template selector */}
          <div>
            <Label className={labelCls}>Event Template</Label>
            {eventTemplates.length > 0 ? (
              <Select value={useTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select event template">
                    {useTemplate
                      ? findTemplateName(eventTemplates, useTemplate)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eventTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-2.5">
                No event templates yet. Create one in Settings → Templates.
              </p>
            )}
          </div>

          {/* Interviewer */}
          <div>
            <Label className={labelCls}>Interviewer</Label>
            <Select
              value={interviewerId ? String(interviewerId) : ""}
              onValueChange={(val) => setInterviewerId(val ? Number(val) : null)}
            >
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue placeholder="Select interviewer">
                  {interviewerId ? findUserName(users, interviewerId) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templateSelected && selectedTpl && (
            <div className="col-span-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-3.5 py-3 text-sm space-y-0.5">
              <p className="font-medium text-slate-700 dark:text-neutral-300">
                {selectedTpl.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {eventType === "virtual" ? "Virtual" : "On-site"}
                {eventType === "onsite" && location ? ` — ${location}` : ""}
                {eventType === "virtual" && linkMode === "auto"
                  ? " — Google Meet link auto-generated"
                  : ""}
                {eventType === "virtual" && linkMode === "manual" && meetingUrl
                  ? ` — ${meetingUrl}`
                  : ""}
              </p>
            </div>
          )}

          {/* Fallback when auto-generate isn't possible and no manual link exists */}
          {templateSelected && eventType === "virtual" && linkMode === "manual" && !meetingUrl && (
            <div className="col-span-2">
              <Label className={labelCls}>Meeting Link</Label>
              <p className="text-xs text-amber-600 dark:text-amber-500 mb-1.5">
                {interviewerId
                  ? "Selected interviewer hasn't connected Google Meet — paste a link instead."
                  : "Select an interviewer, or paste a meeting link."}
              </p>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="Zoom / Teams / Meet link"
                className={inputCls}
              />
            </div>
          )}

          {templateSelected && (
            <>
              {/* Time slots */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className={`${labelCls} mb-0`}>Time Slots</Label>
                  <button
                    onClick={addSlot}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--theme-color)] hover:underline"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3" strokeWidth={3} />
                    Add Time Slot
                  </button>
                </div>
                <div className="space-y-2">
                  {timeSlots.map((s, i) => {
                    const taken = isAllocated(s.datetime);
                    return (
                      <div key={i}>
                        <div
                          className={`flex items-center gap-2 rounded-md border pl-2.5 pr-1.5 py-0.5 ${
                            taken
                              ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
                              : "border-slate-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800"
                          }`}
                        >
                          <DateTimePicker
                            value={s.datetime}
                            onChange={(datetime) => {
                              const n = [...timeSlots];
                              n[i].datetime = datetime;
                              setTimeSlots(n);
                            }}
                            className="h-8 flex-1 min-w-0 text-sm"
                          />
                          {taken && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              Already allocated
                            </span>
                          )}
                          {timeSlots.length > 1 && (
                            <button
                              onClick={() =>
                                setTimeSlots(timeSlots.filter((_, j) => j !== i))
                              }
                              className="size-9 shrink-0 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email body */}
              <div>
                <Label className={labelCls}>Email Body</Label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Write the message the candidate will receive..."
                  className="min-h-[90px] w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm shadow-none resize-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end shrink-0">
          <DialogClose
            render={
              <Button
                variant="ghost"
                disabled={saving}
                className="h-9 px-4 text-sm shadow-none border-none text-slate-600 dark:text-neutral-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 w-full sm:w-auto"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={
              !useTemplate ||
              !bodyText.trim() ||
              !timeSlots.some(
                (s: { datetime: string }) =>
                  s.datetime && isFutureSlot(s.datetime),
              ) ||
              !interviewerId ||
              (eventType === "virtual" &&
                linkMode === "manual" &&
                !meetingUrl.trim()) ||
              saving
            }
            className="h-9 px-4 rounded-md text-white font-semibold text-sm shadow-none border-none w-full sm:w-auto disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--theme-color)" }}
          >
            {saving && <Spinner className="size-3.5" />}
            {saving ? "Sending" : "Send to Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
