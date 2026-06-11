export type TemplateType = "email" | "event";

export const TYPE_META: Record<TemplateType, { label: string; badge: string }> =
  {
    email: {
      label: "Email",
      badge: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    event: {
      label: "Interview Event",
      badge: "bg-purple-50 text-purple-700 border border-purple-200",
    },
  };

export function getTypeMeta(type: string) {
  return (
    TYPE_META[type as TemplateType] ?? {
      label: "Unknown",
      badge: "bg-slate-100 text-slate-600 border border-slate-200",
    }
  );
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}
