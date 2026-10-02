"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, QuestionIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { formatDate } from "../constants";
import {
  asWebUrl,
  groupAnswers,
  isAnswered,
  type AnswerItem,
} from "../../lib/answer-utils";
import type { CandidateDetail } from "@/types";

function AnswerCard({ item, number }: { item: AnswerItem; number: number }) {
  const answered = isAnswered(item);
  const link = asWebUrl(item.text);

  return (
    <article className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="px-5 pt-4">
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Question {number}
        </p>
        <h4 className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-900 dark:text-neutral-100">
          {item.title}
        </h4>
      </header>

      <div className="space-y-3 px-5 pb-5 pt-3">
        {item.text && link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-[15px] font-medium text-theme transition-colors hover:bg-slate-100 hover:underline dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-primary dark:hover:bg-neutral-800"
          >
            <span className="truncate">{item.text.trim()}</span>
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              className="size-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

        {item.text && !link && (
          <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-950/40">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 dark:text-neutral-100">
              {item.text}
            </p>
          </div>
        )}

        {item.options.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Chosen options">
            {item.options.map((option) => (
              <li
                key={option.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-[15px] font-medium text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <HugeiconsIcon
                  icon={Tick02Icon}
                  className="size-4 text-theme dark:text-primary"
                  strokeWidth={2.5}
                />
                {option.label}
              </li>
            ))}
          </ul>
        )}

        {!answered && (
          <p className="text-[15px] italic text-slate-500 dark:text-neutral-400">
            No answer given
          </p>
        )}
      </div>
    </article>
  );
}

export function AnswersSection({ candidate }: { candidate: CandidateDetail }) {
  const items = useMemo(
    () => groupAnswers(candidate.answers, candidate.selections),
    [candidate.answers, candidate.selections],
  );
  const answeredCount = items.filter(isAnswered).length;

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Candidate Answers
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Responses to custom application questions
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={QuestionIcon}
              className="size-5 text-slate-400 dark:text-neutral-500"
            />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No answers submitted
          </p>
          <p className="mx-auto mt-1 max-w-[320px] text-sm text-slate-500 dark:text-neutral-400">
            This job had no custom questions, or {candidate.firstName} didn&apos;t
            answer any of them.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600 dark:text-neutral-400">
            {answeredCount} of {items.length}{" "}
            {items.length === 1 ? "question" : "questions"} answered
            {candidate.appliedAt && ` · Submitted ${formatDate(candidate.appliedAt)}`}
          </p>
          <div className="space-y-4">
            {items.map((item, i) => (
              <AnswerCard key={item.questionId} item={item} number={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
