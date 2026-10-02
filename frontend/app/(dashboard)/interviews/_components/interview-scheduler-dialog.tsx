"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serverFetch } from "@/lib/auth-action";
import { useUserIntegrationStatus } from "@/hooks/queries/use-integrations";
import { useAllocatedSlots } from "@/hooks/queries/use-interviews";
import { useUsers } from "@/hooks/queries/use-user";
import {
  currentTime,
  hasScheduleErrors,
  isFutureSlot,
  parseTemplate,
  validateSchedule,
  type EventType,
  type LinkMode,
} from "../lib/scheduler-utils";

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

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-slate-200 px-6 py-5 first:border-t-0 dark:border-neutral-800">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SchedulerForm({
  candidateId,
  candidateName,
  templates,
  pipelineStageId,
  onSuccess,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const eventTemplates = templates.filter((t) => t.type === "event");
  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];

  const [templateId, setTemplateId] = useState("");
  const [interviewerId, setInterviewerId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<EventType>("virtual");
  const [linkChoice, setLinkChoice] = useState<LinkMode>("manual");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [slots, setSlots] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // "Now" for judging whether a time has passed; refreshed whenever the form is submitted.
  const [now, setNow] = useState(currentTime);

  const { data: statusData } = useUserIntegrationStatus(interviewerId);
  const googleConnected =
    statusData?.data.find((s) => s.provider === "google_meet")?.connected ?? false;
  // A Google link can only be created for an interviewer who has connected Google.
  const linkMode: LinkMode = linkChoice === "auto" && googleConnected ? "auto" : "manual";

  const { data: allocatedData } = useAllocatedSlots(true);
  const allocatedTimes = new Set(
    (allocatedData?.data ?? []).map((s) => new Date(s.datetime).getTime()),
  );
  const isAllocated = (slot: string) => {
    if (!slot) return false;
    const t = new Date(slot).getTime();
    return !Number.isNaN(t) && allocatedTimes.has(t);
  };

  const scheduleInput = { templateId, interviewerId, bodyText, slots, eventType, linkMode, meetingUrl };
  const errors = validateSchedule(scheduleInput, now);

  const templateItems = eventTemplates.map((t) => ({ value: String(t.id), label: t.name }));
  const interviewerItems = users.map((u) => ({
    value: String(u.id),
    label: `${u.firstName} ${u.lastName}`.trim(),
  }));

  const handleTemplate = (id: string | null) => {
    const value = id ?? "";
    setTemplateId(value);
    const template = eventTemplates.find((t) => String(t.id) === value);
    if (!template) return;

    const config = parseTemplate(template, now);
    setEventType(config.eventType);
    setLinkChoice(config.autoGenerate ? "auto" : "manual");
    setMeetingUrl(config.meetingUrl);
    setLocation(config.location);
    setSlots(config.timeSlots.length > 0 ? config.timeSlots : [""]);
    setBodyText(config.bodyText);
    if (config.skippedPastSlots > 0) {
      toast.info("Some of this template's times have already passed. Add new ones.");
    }
  };

  const setSlot = (index: number, value: string) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? value : s)));

  const handleSubmit = async () => {
    const submittedAt = currentTime();
    setNow(submittedAt);
    setShowErrors(true);
    if (hasScheduleErrors(validateSchedule(scheduleInput, submittedAt))) {
      toast.error("Fill in the highlighted fields first.");
      return;
    }

    const autoGenerate = eventType === "virtual" && linkMode === "auto";
    const usable = slots.filter((s) => s && isFutureSlot(s, submittedAt));

    setSaving(true);
    try {
      await serverFetch(`/candidates/${candidateId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          eventName: eventTemplates.find((t) => String(t.id) === templateId)?.name.trim(),
          eventType,
          meetingUrl: eventType === "virtual" && !autoGenerate ? meetingUrl.trim() || null : null,
          meetingProvider: autoGenerate ? "google_meet" : undefined,
          interviewerId,
          location: eventType === "onsite" ? location.trim() || null : null,
          bodyText: bodyText || null,
          stageId: pipelineStageId,
          timeSlots: usable.map((s) => ({
            datetime: new Date(s).toISOString(),
            selected: false,
          })),
        }),
      });
      toast.success(`Interview scheduled. ${candidateName} has been emailed.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to schedule the interview");
    } finally {
      setSaving(false);
    }
  };

  const err = <K extends keyof typeof errors>(key: K) =>
    showErrors ? (errors[key] as string | undefined) ?? null : null;

  return (
    <>
      <DialogHeader className="shrink-0 gap-1 border-b border-slate-200 px-6 py-5 dark:border-neutral-800">
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          Schedule interview
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          Invite {candidateName} to choose a time. They get an email with the
          options you add here.
        </DialogDescription>
      </DialogHeader>

      <div className="grid overflow-y-auto lg:grid-cols-2">
        <div className="lg:border-r lg:border-slate-200 lg:dark:border-neutral-800">
        <Section title="Interview">
          <FormField
            label="Event template"
            htmlFor="sched-template"
            required
            error={err("template")}
            hint={
              eventTemplates.length === 0
                ? "No event templates yet. Create one under Templates."
                : templateId
                  ? undefined
                  : "The template sets the format, times and message to start from."
            }
          >
            <Select
              items={templateItems}
              value={templateId}
              onValueChange={handleTemplate}
              disabled={eventTemplates.length === 0}
            >
              <SelectTrigger id="sched-template" className={selectTriggerCls}>
                <SelectValue placeholder="Choose an event template" />
              </SelectTrigger>
              <SelectContent>
                {templateItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Interviewer"
            htmlFor="sched-interviewer"
            required
            error={err("interviewer")}
            hint={
              interviewerId
                ? googleConnected
                  ? "Google Meet is connected for this person."
                  : "Google Meet is not connected for this person."
                : undefined
            }
          >
            <Select
              items={interviewerItems}
              value={interviewerId ? String(interviewerId) : ""}
              onValueChange={(v) => setInterviewerId(v ? Number(v) : null)}
            >
              <SelectTrigger id="sched-interviewer" className={selectTriggerCls}>
                <SelectValue placeholder="Choose the interviewer" />
              </SelectTrigger>
              <SelectContent>
                {interviewerItems.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {templateId && eventType === "virtual" && (
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                Meeting link
              </Label>
              <RadioGroup
                value={linkMode}
                onValueChange={(v) => setLinkChoice(v as LinkMode)}
                className="gap-2.5"
              >
                <label
                  className={`flex items-start gap-3 text-sm ${
                    googleConnected ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <RadioGroupItem
                    variant="theme"
                    value="auto"
                    disabled={!googleConnected}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-slate-900 dark:text-neutral-100">
                      Create a Google Meet link
                    </span>
                    <span className="block text-slate-500 dark:text-neutral-400">
                      {googleConnected
                        ? "Made automatically once the candidate picks a time."
                        : "Choose an interviewer who has connected Google Meet to use this."}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <RadioGroupItem variant="theme" value="manual" className="mt-0.5" />
                  <span className="font-medium text-slate-900 dark:text-neutral-100">
                    Use my own link
                  </span>
                </label>
              </RadioGroup>

              {linkMode === "manual" && (
                <FormField
                  label="Link"
                  htmlFor="sched-link"
                  required
                  error={err("meetingUrl")}
                >
                  <Input
                    id="sched-link"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..., Zoom or Teams link"
                    className={inputCls}
                  />
                </FormField>
              )}
            </div>
          )}

          {templateId && eventType === "onsite" && (
            <FormField label="Location" htmlFor="sched-location" hint="Where the candidate should go.">
              <Input
                id="sched-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office address and floor"
                className={inputCls}
              />
            </FormField>
          )}
        </Section>
        </div>

        <div>
        {!templateId && (
          <p className="m-6 rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
            Choose an event template to set the times and the message.
          </p>
        )}
        {templateId && (
          <>
            <Section
              title="Times to offer"
              description="Add a few times. The candidate picks the one that suits them."
            >
              <div className="space-y-3">
                {slots.map((slot, i) => {
                  const slotError = showErrors ? errors.slotErrors[i] : undefined;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div
                        className={`flex items-center gap-2 rounded-md border px-2.5 py-1 ${
                          slotError
                            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                            : isAllocated(slot)
                              ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
                              : "border-slate-300 bg-gray-100 dark:border-neutral-600 dark:bg-neutral-800"
                        }`}
                      >
                        <DateTimePicker
                          value={slot}
                          onChange={(value) => setSlot(i, value)}
                          className="h-9 min-w-0 flex-1 text-sm"
                        />
                        {isAllocated(slot) && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Already booked
                          </span>
                        )}
                        {slots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`Remove time ${i + 1}`}
                            onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))}
                            className="size-8 shrink-0 rounded-md p-0 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                          </Button>
                        )}
                      </div>
                      {slotError && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                          {slotError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {err("slots") && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {err("slots")}
                </p>
              )}

              <Button
                type="button"
                variant="cancel"
                onClick={() => setSlots((prev) => [...prev, ""])}
                className="h-9 gap-2 border-dashed px-3.5 text-sm"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
                Add another time
              </Button>
            </Section>

            <Section title="Message">
              <FormField
                label="Email to the candidate"
                htmlFor="sched-body"
                required
                error={err("body")}
              >
                <Textarea
                  id="sched-body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Write the message the candidate will receive"
                  rows={5}
                  className="resize-y border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
                />
              </FormField>
            </Section>
          </>
        )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950/50">
        <Button
          variant="cancel"
          onClick={onClose}
          disabled={saving}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !templateId}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {saving && <Spinner className="size-3.5" />}
          {saving ? "Sending" : "Send to candidate"}
        </Button>
      </div>
    </>
  );
}

export function InterviewSchedulerDialog({ open, onOpenChange, ...formProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-[calc(100%-2rem)] flex-col gap-0 rounded-xl border-slate-200 bg-white p-0 sm:max-w-5xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mounted only while open, so every interview starts from a blank form. */}
        <SchedulerForm {...formProps} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
