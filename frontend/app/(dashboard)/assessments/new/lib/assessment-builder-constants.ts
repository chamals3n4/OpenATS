import { AnswerOption } from "./assessment-builder-types";

export const TRUE_FALSE_OPTIONS: AnswerOption[] = [
  { id: -1, text: "True", isCorrect: false },
  { id: -2, text: "False", isCorrect: false },
];

export const inputCls =
  "h-8 bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100";

export const textareaCls =
  "bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 resize-none";
