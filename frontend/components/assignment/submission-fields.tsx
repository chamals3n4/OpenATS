import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SubmissionField } from "@/types";

interface SubmissionFieldsProps {
  fields: SubmissionField[];
  values: Record<string, string>;
  onChange?: (id: string, value: string) => void;
  /** Switched off in the preview the hiring team sees. */
  disabled?: boolean;
}

const LIMITS = { link: 2000, short_text: 500, long_text: 5000 } as const;

/** The hand-in form, drawn from the fields set on the assignment. Shared by the candidate's page and the preview. */
export function SubmissionFields({ fields, values, onChange, disabled }: SubmissionFieldsProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = `field-${field.id}`;
        const common = {
          id,
          disabled,
          value: values[field.id] ?? "",
          maxLength: LIMITS[field.type],
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange?.(field.id, event.target.value),
        };
        return (
          <div key={field.id}>
            <Label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-neutral-200">
              {field.label || "Untitled field"}
              {field.required ? (
                <span className="ml-0.5 text-red-600" aria-hidden="true">
                  *
                </span>
              ) : (
                <span className="ml-1.5 font-normal text-slate-400">(optional)</span>
              )}
            </Label>
            {field.type === "long_text" ? (
              <Textarea {...common} rows={4} required={field.required} />
            ) : (
              <Input
                {...common}
                type={field.type === "link" ? "url" : "text"}
                inputMode={field.type === "link" ? "url" : undefined}
                placeholder={field.type === "link" ? "https://" : undefined}
                required={field.required}
              />
            )}
            {field.hint && <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{field.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
