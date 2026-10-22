import { z } from "zod";

export const MAX_RESOURCES = 10;
export const MAX_DUE_DAYS = 90;

/** Only web addresses: a link a candidate or a reviewer clicks must never be `javascript:`. */
const webUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  }, "Must be a web address starting with http:// or https://");

export const resourceSchema = z.object({
  label: z.string().trim().min(1, "Give each link a name").max(120),
  url: webUrl,
});

export const MAX_FIELDS = 10;
const MAX_LENGTH = { link: 2000, short_text: 500, long_text: 5000 } as const;

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/, "Invalid field id"),
  label: z.string().trim().min(1, "Give each field a label").max(120),
  type: z.enum(["link", "short_text", "long_text"]),
  required: z.boolean(),
  hint: z.string().trim().max(200).optional(),
});

/** The form a candidate fills in: at least one question, ids that are not repeated. */
export const fieldsSchema = z
  .array(fieldSchema)
  .min(1, "Add at least one field to the hand-in form")
  .max(MAX_FIELDS)
  .refine((fields) => new Set(fields.map((f) => f.id)).size === fields.length, "Field ids must be different");

export const answersSchema = z.record(z.string(), z.string());

type Field = z.infer<typeof fieldSchema>;

const isWebUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};

/**
 * Checks what a candidate filled in against the form they were sent. Returns the answers to
 * keep (trimmed, only for fields on the form, empty ones left out) or the first problem found.
 */
export function checkAnswers(
  fields: Field[],
  answers: Record<string, string>,
): { ok: true; answers: Record<string, string> } | { ok: false; error: string } {
  const kept: Record<string, string> = {};
  for (const field of fields) {
    const value = (answers[field.id] ?? "").trim();
    if (!value) {
      if (field.required) return { ok: false, error: `${field.label} is required` };
      continue;
    }
    if (value.length > MAX_LENGTH[field.type]) return { ok: false, error: `${field.label} is too long` };
    if (field.type === "link" && !isWebUrl(value)) {
      return { ok: false, error: `${field.label} must be a web address starting with http:// or https://` };
    }
    kept[field.id] = value;
  }
  return { ok: true, answers: kept };
}

export type AssignmentStatus = "pending" | "submitted" | "expired";

/** Work is handed in once, before the deadline. A handed-in or expired assignment takes no more. */
export function isOpenForSubmission(status: AssignmentStatus, dueAt: Date, now: Date): boolean {
  return status === "pending" && now.getTime() <= dueAt.getTime();
}

export function dueDateFor(sentAt: Date, dueDays: number): Date {
  const due = new Date(sentAt);
  due.setDate(due.getDate() + dueDays);
  return due;
}
