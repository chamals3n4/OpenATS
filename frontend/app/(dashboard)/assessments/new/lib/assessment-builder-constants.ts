import { AnswerOption } from "./assessment-builder-types";

export const TRUE_FALSE_OPTIONS: AnswerOption[] = [
  { id: -1, text: "True", isCorrect: false },
  { id: -2, text: "False", isCorrect: false },
];

export const inputCls =
  "h-11 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-lg shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:ring-0 focus-visible:border-slate-400 transition-colors";

export const textareaCls =
  "w-full px-3.5 py-3 text-sm bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-slate-400 resize-none transition-colors";
