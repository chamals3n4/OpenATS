"use client";

import { useSearchParams } from "next/navigation";
import { TemplateForm } from "./template-form";
import { TemplateType } from "../lib/templates-utils";

export function NewTemplateClient() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") as TemplateType | null;
  const templateType: TemplateType = rawType === "event" ? "event" : "email";

  return <TemplateForm mode="new" templateType={templateType} />;
}
