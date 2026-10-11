"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/queries/use-templates";
import { Input } from "@/components/ui/input";
import type { Template } from "@/types";
import type { TemplateType } from "../../lib/template-form-types";
import { useTemplateForm } from "../../hooks/use-template-form";
import { INPUT_CLASS } from "../../lib/template-form-constants";
import { buildEventPayload, validateTemplateForm } from "../../lib/template-form-utils";
import { TemplateFormHeader } from "./header";
import { FormField } from "./form-field";
import { EmailBuilder } from "./email-builder";
import { EmailPreviewPanel } from "./email-builder/email-preview";
import { EventBuilder } from "./event-builder";
import { EventPreviewPanel } from "./event-builder/event-preview";

interface TemplateFormProps {
  mode: "new" | "edit";
  templateType: TemplateType;
  templateId?: number;
  existingTemplate?: Template;
  readOnly?: boolean;
}

type Pane = "edit" | "preview";

const PANES: { value: Pane; label: string }[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
];

export function TemplateForm({
  mode,
  templateType,
  templateId,
  existingTemplate,
  readOnly = false,
}: TemplateFormProps) {
  const router = useRouter();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const form = useTemplateForm(templateType);
  const { hydrate } = form;
  // Errors stay hidden until the first save attempt, so an empty new form is not red.
  const [showErrors, setShowErrors] = useState(false);
  // On small screens only one side fits, so this picks which.
  const [pane, setPane] = useState<Pane>("edit");

  // Fill the form once. A background refetch of the same template must not undo typing.
  const hydratedId = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== "edit" || !existingTemplate || hydratedId.current === existingTemplate.id) return;
    hydratedId.current = existingTemplate.id;
    hydrate({
      name: existingTemplate.name,
      subject: existingTemplate.subject,
      bodyJson: existingTemplate.bodyJson,
      type: existingTemplate.type as TemplateType,
    });
  }, [mode, existingTemplate, hydrate]);

  const isPending =
    mode === "new" ? createMutation.isPending : updateMutation.isPending;

  const nameValue = templateType === "event" ? form.eventName : form.name;
  const errors = validateTemplateForm({ type: templateType, name: nameValue, subject: form.subject });
  const shown = showErrors ? errors : {};

  const handleSave = () => {
    if (errors.name || errors.subject) {
      setShowErrors(true);
      setPane("edit");
      const firstInvalid = errors.name ? "template-name" : "template-subject";
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

    const payload = {
      name: nameValue.trim(),
      type: templateType,
      subject: templateType === "event" ? nameValue.trim() : form.subject.trim(),
      bodyJson:
        templateType === "email"
          ? form.emailBodyHtml
          : buildEventPayload(
              nameValue.trim(),
              form.eventTypeRadio,
              form.meetingUrl,
              form.autoGenerateMeet,
              form.location,
              form.eventDesc,
              form.timeSlots,
            ),
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(mode === "new" ? "Template saved." : "Changes saved.");
        router.push("/templates");
      },
      onError: () => toast.error("Could not save the template. Please try again."),
    };

    if (mode === "new") {
      createMutation.mutate(payload, callbacks);
    } else if (templateId) {
      updateMutation.mutate({ id: templateId, data: payload }, callbacks);
    }
  };

  if (mode === "edit" && !existingTemplate) {
    return (
      <div className="flex items-center justify-center flex-1 bg-white dark:bg-neutral-950">
        <p className="text-slate-500 dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950">
      <TemplateFormHeader
        templateType={templateType}
        mode={mode}
        name={nameValue}
        isPending={isPending}
        onSave={handleSave}
        readOnly={readOnly}
      />

      {/* Small screens: switch between the two sides */}
      <div
        role="tablist"
        aria-label="View"
        className="flex shrink-0 gap-1 border-b border-slate-200 px-4 py-2 lg:hidden dark:border-neutral-800"
      >
        {PANES.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={pane === p.value}
            onClick={() => setPane(p.value)}
            className={`h-8 flex-1 cursor-pointer rounded-md text-sm font-medium transition-colors ${
              pane === p.value
                ? "bg-theme/10 text-theme dark:text-primary"
                : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]">
        <div className={`h-full overflow-y-auto ${pane === "edit" ? "" : "hidden lg:block"}`}>
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
            {templateType === "email" ? (
              <div className="space-y-6">
                <FormField
                  label="Template name"
                  htmlFor="template-name"
                  hint="Only your team sees the name. It is how you find this template later."
                  error={shown.name}
                >
                  <Input
                    id="template-name"
                    placeholder="e.g. Standard offer letter"
                    value={form.name}
                    onChange={(e) => form.setName(e.target.value)}
                    readOnly={readOnly}
                    aria-invalid={!!shown.name || undefined}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <EmailBuilder
                  subject={form.subject}
                  onSubjectChange={form.setSubject}
                  subjectError={shown.subject}
                  bodyHtml={form.emailBodyHtml}
                  onBodyHtmlChange={form.setEmailBodyHtml}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <EventBuilder
                eventName={form.eventName}
                onEventNameChange={form.setEventName}
                nameError={shown.name}
                eventDesc={form.eventDesc}
                onEventDescChange={form.setEventDesc}
                eventTypeRadio={form.eventTypeRadio}
                onEventTypeChange={form.setEventTypeRadio}
                meetingUrl={form.meetingUrl}
                onMeetingUrlChange={form.setMeetingUrl}
                autoGenerateMeet={form.autoGenerateMeet}
                onAutoGenerateMeetChange={form.setAutoGenerateMeet}
                location={form.location}
                onLocationChange={form.setLocation}
                timeSlots={form.timeSlots}
                onAddSlot={form.addSlot}
                onUpdateSlot={form.updateSlot}
                onRemoveSlot={form.removeSlot}
                readOnly={readOnly}
              />
            )}
          </div>
        </div>

        <div
          className={`h-full overflow-y-auto border-slate-200 lg:border-l dark:border-neutral-800 ${
            pane === "preview" ? "" : "hidden lg:block"
          }`}
        >
          {templateType === "email" ? (
            <EmailPreviewPanel subject={form.subject} bodyHtml={form.emailBodyHtml} />
          ) : (
            <EventPreviewPanel
              eventName={form.eventName}
              eventType={form.eventTypeRadio}
              meetingUrl={form.meetingUrl}
              autoGenerateMeet={form.autoGenerateMeet}
              location={form.location}
              slots={form.timeSlots}
            />
          )}
        </div>
      </div>
    </div>
  );
}
