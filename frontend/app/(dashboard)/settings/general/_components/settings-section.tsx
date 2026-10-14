import type { ReactNode } from "react";

/** Settings section with a heading and a divider */
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: ReactNode;
  /** Button next to the section heading */
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
