"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/queries/use-templates";
import type { Template } from "@/types";
import type { TemplateType } from "../../lib/template-form-types";
import { useTemplateForm } from "../../hooks/use-template-form";
import { buildEmailPayload, buildEventPayload } from "../../lib/template-form-utils";
import { TemplateFormHeader } from "./header";
import { TemplateNameField } from "./name-field";
import { EmailBuilder } from "./email-builder";
import { EmailPreviewPanel } from "./email-builder/email-preview";
import { EventBuilder } from "./event-builder";
import { TimeSlotsEditor } from "./event-builder/time-slots-editor";

interface TemplateFormProps {
  mode: "new" | "edit";
  templateType: TemplateType;
  templateId?: number;
  existingTemplate?: Template;
  readOnly?: boolean;
}

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

  useEffect(() => {
    if (mode === "edit" && existingTemplate) {
      form.hydrate({
        name: existingTemplate.name,
        subject: existingTemplate.subject,
        bodyJson: existingTemplate.bodyJson,
        type: existingTemplate.type as TemplateType,
      });
    }
  }, [mode, existingTemplate]);

  const isPending = mode === "new" ? createMutation.isPending : updateMutation.isPending;

  const nameValue = templateType === "event" ? form.eventName : form.name;

  const handleSave = () => {
    if (!nameValue.trim()) return;

    const payload = {
      name: nameValue.trim(),
      type: templateType,
      subject: templateType === "event" ? nameValue.trim() : form.subject,
      bodyJson:
        templateType === "email"
          ? buildEmailPayload(form.blocks)
          : buildEventPayload(
              nameValue.trim(),
              form.eventTypeRadio,
              form.meetingUrl,
              form.location,
              form.eventDesc,
              form.timeSlots,
            ),
    };

    if (mode === "new") {
      createMutation.mutate(payload, {
        onSuccess: () => router.push("/templates"),
      });
    } else if (templateId) {
      updateMutation.mutate(
        { id: templateId, data: payload },
        { onSuccess: () => router.push("/templates") },
      );
    }
  };

  if (mode === "edit" && !existingTemplate) {
    return (
      <div className="flex items-center justify-center flex-1 bg-white dark:bg-neutral-950">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const header = (
    <TemplateFormHeader
      templateType={templateType}
      mode={mode}
      canSave={!!nameValue.trim()}
      isPending={isPending}
      onSave={handleSave}
      readOnly={readOnly}
    />
  );

  // ── Email: split editor / preview ────────────────────────────────────────
  if (templateType === "email") {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950">
        {header}

        <div className="flex flex-1 min-h-0">
          {/* Left — editor */}
          <div className="flex-1 overflow-y-auto border-r border-slate-200 dark:border-neutral-800">
            <div className="px-8 py-6 space-y-5 max-w-xl">
              <TemplateNameField
                value={form.name}
                onChange={form.setName}
                placeholder="e.g. Standard Offer Letter"
                readOnly={readOnly}
              />
              <EmailBuilder
                subject={form.subject}
                onSubjectChange={form.setSubject}
                blocks={form.blocks}
                onAddBlock={form.addBlock}
                onUpdateBlock={form.updateBlock}
                onDeleteBlock={form.deleteBlock}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Right — live preview */}
          <div className="w-[420px] xl:w-[480px] shrink-0 overflow-y-auto bg-slate-50 dark:bg-neutral-900/40 border-l border-slate-200 dark:border-neutral-800">
            <EmailPreviewPanel subject={form.subject} blocks={form.blocks} />
          </div>
        </div>
      </div>
    );
  }

  // ── Event: details / time slots ─────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950">
      {header}

      <div className="flex flex-1 min-h-0">
        {/* Left — event details */}
        <div className="flex-1 overflow-y-auto border-r border-slate-200 dark:border-neutral-800">
          <div className="px-8 py-6 space-y-4 max-w-xl">
            <EventBuilder
              eventName={form.eventName}
              onEventNameChange={form.setEventName}
              eventDesc={form.eventDesc}
              onEventDescChange={form.setEventDesc}
              eventTypeRadio={form.eventTypeRadio}
              onEventTypeChange={form.setEventTypeRadio}
              meetingUrl={form.meetingUrl}
              onMeetingUrlChange={form.setMeetingUrl}
              location={form.location}
              onLocationChange={form.setLocation}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Right — time slots */}
        <div className="w-[420px] xl:w-[480px] shrink-0 overflow-y-auto bg-white dark:bg-neutral-950 border-l border-slate-200 dark:border-neutral-800">
          <div className="px-7 py-6">
            <TimeSlotsEditor
              slots={form.timeSlots}
              onAdd={form.addSlot}
              onUpdate={form.updateSlot}
              onRemove={form.removeSlot}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
