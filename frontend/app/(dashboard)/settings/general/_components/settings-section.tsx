import type { ReactNode } from "react";

/**
 * One block of the settings page: a heading, a line saying what it is for, then the controls,
 * with a rule under it. The page is a plain sheet with these down it, so nothing is boxed inside
 * anything.
 */
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: ReactNode;
  /** A button that belongs to the whole section, set beside its heading. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-300 py-6 last:border-b-0 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
