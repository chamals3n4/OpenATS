import Link from "next/link";

export type AssessmentsTab = "assessments" | "assignments";

const TABS: { value: AssessmentsTab; label: string; href: string }[] = [
  { value: "assessments", label: "Assessments", href: "/assessments" },
  { value: "assignments", label: "Assignments", href: "/assessments?tab=assignments" },
];

/** Question-based assessments and take-home assignments */
export function AssessmentsTabs({ tab }: { tab: AssessmentsTab }) {
  return (
    <nav aria-label="Assessment kinds" className="flex shrink-0 gap-6 border-b border-slate-300 px-6 dark:border-neutral-700">
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
