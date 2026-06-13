import { AnswerOption } from "./assessment-builder-types";

export const TRUE_FALSE_OPTIONS: AnswerOption[] = [
  { id: -1, text: "True", isCorrect: false },
  { id: -2, text: "False", isCorrect: false },
];

export const inputCls =
  "h-8 bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 rounded-md shadow-none text-[13px] placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:ring-0 focus-visible:border-slate-400 transition-colors";

export const textareaCls =
  "w-full px-3 py-2 text-[13px] bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 rounded-md shadow-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-slate-400 resize-none transition-colors";
