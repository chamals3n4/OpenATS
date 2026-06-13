"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateTemplate } from "@/hooks/queries/use-templates";
import { useUpdateTemplate } from "@/hooks/queries/use-templates";
import type { Template } from "@/types";
import type { TemplateType } from "../../lib/template-form-types";
import { useTemplateForm } from "../../hooks/use-template-form";
import {
  buildEmailPayload,
  buildEventPayload,
} from "../../lib/template-form-utils";
import { TemplateFormHeader } from "./header";
import { TemplateFormShell } from "./form-shell";
import { TemplateNameField } from "./name-field";
import { EmailBuilder } from "./email-builder";
import { EventBuilder } from "./event-builder";

interface TemplateFormProps {
  mode: "new" | "edit";
  templateType: TemplateType;
  templateId?: number;
  existingTemplate?: Template;
}

export function TemplateForm({
  mode,
  templateType,
  templateId,
  existingTemplate,
}: TemplateFormProps) {
  const router = useRouter();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const form = useTemplateForm(templateType);

  // Hydrate form when editing
  useEffect(() => {
    if (mode === "edit" && existingTemplate) {
      form.hydrate({
        name: existingTemplate.name,
        subject: existingTemplate.subject,
        bodyJson: existingTemplate.bodyJson,
        type: existingTemplate.type as TemplateType,
      });
    }
  }, [mode, existingTemplate, form]);

  const isPending =
    mode === "new" ? createMutation.isPending : updateMutation.isPending;

  const handleSave = () => {
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      type: templateType,
      subject:
        templateType === "event" ? form.eventName || form.name : form.subject,
      bodyJson:
        templateType === "email"
          ? buildEmailPayload(form.blocks)
          : buildEventPayload(
              form.name,
              form.eventName,
              form.eventTypeRadio,
              form.meetingUrl,
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
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-neutral-950 min-h-screen">
      <TemplateFormHeader
        templateType={templateType}
        mode={mode}
        canSave={!!form.name.trim()}
        isPending={isPending}
        onSave={handleSave}
      />

      <TemplateFormShell>
        <TemplateNameField
          value={form.name}
          onChange={form.setName}
          placeholder={
            templateType === "email"
              ? "e.g. Standard Offer Letter"
              : "e.g. Technical Interview Round 1"
          }
        />

        {templateType === "email" ? (
          <EmailBuilder
            subject={form.subject}
            onSubjectChange={form.setSubject}
            blocks={form.blocks}
            onAddBlock={form.addBlock}
            onUpdateBlock={form.updateBlock}
            onDeleteBlock={form.deleteBlock}
          />
        ) : (
          <EventBuilder
            eventName={form.eventName}
            onEventNameChange={form.setEventName}
            eventDesc={form.eventDesc}
            onEventDescChange={form.setEventDesc}
            eventTypeRadio={form.eventTypeRadio}
            onEventTypeChange={form.setEventTypeRadio}
            meetingUrl={form.meetingUrl}
            onMeetingUrlChange={form.setMeetingUrl}
            timeSlots={form.timeSlots}
            onAddSlot={form.addSlot}
            onUpdateSlot={form.updateSlot}
            onRemoveSlot={form.removeSlot}
          />
        )}
      </TemplateFormShell>
    </div>
  );
}
