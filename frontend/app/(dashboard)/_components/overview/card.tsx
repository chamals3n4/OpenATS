import type { ReactNode } from "react";

export const cardCls =
  "rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

/** A titled card with an optional line of explanation under the title. */
export function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${cardCls} overflow-hidden`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      <div className="px-3 pt-3 pb-4">{children}</div>
    </section>
  );
}
