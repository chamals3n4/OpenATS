import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/** Field group with a divider */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 py-7 first:pt-0 last:pb-0">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Label, control and hint or error */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | undefined;
  optional?: boolean;
  children: ReactNode;
}) {
  // Link the hint or error for screen readers
  const describedBy = htmlFor && (error || hint) ? `${htmlFor}-description` : undefined;
  const control =
    describedBy && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": describedBy })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800 dark:text-neutral-200">
        {label}
        {optional && <span className="ml-1.5 font-normal text-slate-500 dark:text-neutral-500">Optional</span>}
      </label>
      {control}
      {error ? (
        <p id={describedBy} role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={describedBy} className="text-[13px] text-slate-500 dark:text-neutral-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
