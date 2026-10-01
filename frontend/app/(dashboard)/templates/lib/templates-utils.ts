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

export const TEMPLATE_NAME_MAX = 255;

const COPY_SUFFIX = " (copy)";

/** "Offer letter" becomes "Offer letter (copy)", cut short enough to stay within the name limit. */
export function suggestCopyName(name: string): string {
  const base = name.trim();
  const room = TEMPLATE_NAME_MAX - COPY_SUFFIX.length;
  return `${base.length > room ? base.slice(0, room).trimEnd() : base}${COPY_SUFFIX}`;
}

export function validateTemplateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Give the copy a name.";
  if (trimmed.length > TEMPLATE_NAME_MAX) {
    return `Keep the name under ${TEMPLATE_NAME_MAX} characters.`;
  }
  return null;
}
