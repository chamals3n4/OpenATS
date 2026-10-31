/** A briefcase with a closed sign. Colours follow the theme */
export function JobClosedIllustration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 180"
      fill="none"
      className="mx-auto h-auto w-52 sm:w-60"
    >
      <ellipse cx="120" cy="164" rx="84" ry="8" className="fill-slate-100 dark:fill-neutral-800" />
      <path
        d="M92 58V46a10 10 0 0 1 10-10h36a10 10 0 0 1 10 10v12"
        strokeWidth="6"
        className="stroke-slate-300 dark:stroke-neutral-600"
      />
      <rect
        x="48"
        y="58"
        width="144"
        height="98"
        rx="12"
        strokeWidth="3"
        className="fill-slate-100 stroke-slate-300 dark:fill-neutral-800 dark:stroke-neutral-600"
      />
      <path
        d="M48 98c22 12 46 18 72 18s50-6 72-18"
        strokeWidth="3"
        className="stroke-slate-300 dark:stroke-neutral-600"
      />
      <rect
        x="110"
        y="106"
        width="20"
        height="20"
        rx="4"
        strokeWidth="3"
        className="fill-white stroke-slate-300 dark:fill-neutral-900 dark:stroke-neutral-600"
      />
      <circle
        cx="184"
        cy="58"
        r="26"
        strokeWidth="3"
        className="fill-white stroke-slate-300 dark:fill-neutral-900 dark:stroke-neutral-600"
      />
      <path
        d="M175 49l18 18M193 49l-18 18"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-slate-400 dark:stroke-neutral-500"
      />
    </svg>
  );
}
