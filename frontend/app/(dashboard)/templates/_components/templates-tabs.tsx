import Link from "next/link";

export type TemplatesTab = "yours" | "automatic";

const TABS: { value: TemplatesTab; label: string; href: string }[] = [
  { value: "yours", label: "Your templates", href: "/templates" },
  { value: "automatic", label: "Automatic emails", href: "/templates?tab=automatic" },
];

/** Switches between the templates people pick by hand and the emails the app sends by itself. */
export function TemplatesTabs({ tab }: { tab: TemplatesTab }) {
  return (
    <nav aria-label="Template kinds" className="flex shrink-0 gap-6 border-b border-slate-300 px-6 dark:border-neutral-700">
      {TABS.map((item) => {
        const active = item.value === tab;
        return (
          <Link
            key={item.value}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
              active
                ? "border-theme text-slate-950 dark:text-neutral-50"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
