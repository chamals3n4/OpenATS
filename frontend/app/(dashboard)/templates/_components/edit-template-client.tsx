"use client";

import { useTemplate } from "@/hooks/queries/use-templates";
import { TemplateForm } from "./template-form";
import { TemplateType } from "../lib/templates-utils";
import { useIsManager } from "@/hooks/use-role";

interface EditTemplateClientProps {
  templateId: number;
}

export function EditTemplateClient({ templateId }: EditTemplateClientProps) {
  const isManager = useIsManager();
  const { data: tplData } = useTemplate(templateId);
  const template = tplData?.data;

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <TemplateForm
      mode="edit"
      templateType={template.type as TemplateType}
      templateId={templateId}
      existingTemplate={template}
      readOnly={!isManager}
    />
  );
}
