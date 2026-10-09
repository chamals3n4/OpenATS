"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  MinusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useIsManager } from "@/hooks/use-role";
import { useAttemptResults, useGradeAnswer } from "@/hooks/queries/use-assessments";
import { formatDate } from "./constants";
import {
  earnedPoints,
  formatDuration,
  getQuestionState,
  isWrittenQuestion,
  summarizeQuestions,
  type QuestionState,
} from "../lib/assessment-result-utils";

type Results = NonNullable<
  NonNullable<ReturnType<typeof useAttemptResults>["data"]>["data"]
>;
type ResultQuestion = Results["questions"][number];

const STATE_STYLES: Record<
  QuestionState,
  { label: string; pill: string; chip: string; icon: typeof CheckmarkCircle02Icon }
> = {
  correct: {
    label: "Correct",
    pill: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
    chip: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300",
    icon: CheckmarkCircle02Icon,
  },
  incorrect: {
    label: "Incorrect",
    pill: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
    chip: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
    icon: CancelCircleIcon,
  },
  partial: {
    label: "Partly correct",
    pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    chip: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    icon: CheckmarkCircle01Icon,
  },
  graded: {
    label: "Graded",
    pill: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
    chip: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300",
    icon: CheckmarkCircle02Icon,
  },
  review: {
    label: "Needs review",
    pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    chip: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    icon: Alert02Icon,
  },
  unanswered: {
    label: "Not answered",
    pill: "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300",
    chip: "border-slate-300 bg-slate-100 text-slate-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    icon: MinusSignCircleIcon,
  },
};

function Tile({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-300 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1.5 text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
      {sub && (
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          {sub}
        </p>
      )}
    </div>
  );
}

function Summary({ results }: { results: Results }) {
  const { attempt, questions } = results;
  const summary = summarizeQuestions(questions);
  const choiceTotal = questions.filter((q) => !isWrittenQuestion(q.questionType)).length;

  // Postgres `numeric` reaches us as a string, so convert it.
  const score =
    attempt.scorePercentage === null ? null : Number(attempt.scorePercentage);
  const hasScore = score !== null && Number.isFinite(score);
  const barColor =
    attempt.passed === true
      ? "bg-green-500"
      : attempt.passed === false
        ? "bg-red-500"
        : "bg-slate-500";
  const duration = formatDuration(attempt.startedAt, attempt.completedAt);

  return (
    <section className="space-y-4 px-6 py-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Tile
          label="Score"
          sub={
            attempt.scoreRaw !== null && attempt.scoreTotal !== null
              ? `${attempt.scoreRaw} of ${attempt.scoreTotal} points`
              : null
          }
        >
          {hasScore ? (
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-semibold leading-none">
                {Math.round(score)}%
              </span>
              {attempt.passed !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    attempt.passed
                      ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                      : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {attempt.passed ? "Passed" : "Failed"}
                </span>
              )}
            </div>
          ) : results.pendingReview > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">Pending review</span>
          ) : (
            <span className="text-slate-400">No score</span>
          )}
          {hasScore && (
            <div
              role="progressbar"
              aria-label="Score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(score)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
            >
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          )}
        </Tile>

        {choiceTotal > 0 && (
          <Tile label="Choice questions">
            {summary.correct} of {choiceTotal} correct
          </Tile>
        )}

        {results.pendingReview > 0 && (
          <Tile label="Written answers">{results.pendingReview} to grade</Tile>
        )}

        <Tile label="Completed" sub={duration ? `Took ${duration}` : null}>
          {formatDate(attempt.completedAt)}
        </Tile>
      </dl>

      {results.pendingReview > 0 && (
        <p className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            {results.pendingReview === 1
              ? "1 written answer is waiting for you to grade it."
              : `${results.pendingReview} written answers are waiting for you to grade them.`}{" "}
            The score and the pass or fail result appear once every one is graded, and until then
            this assessment does not count toward the candidate&apos;s total.
          </span>
        </p>
      )}
    </section>
  );
}

/** Sticky strip of numbered chips, one per question, that scrolls to that question. */
function QuestionNavigator({ questions }: { questions: ResultQuestion[] }) {
  return (
    <nav
      aria-label="Jump to a question"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-y border-slate-300 bg-white px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span className="mr-1.5 text-sm font-medium text-slate-600 dark:text-neutral-400">
        Questions
      </span>
      {questions.map((q, idx) => {
        const state = getQuestionState(q);
        return (
          <button
            key={q.id}
            type="button"
            aria-label={`Question ${idx + 1}, ${STATE_STYLES[state].label}`}
            title={`Question ${idx + 1}: ${STATE_STYLES[state].label}`}
            onClick={() =>
              document
                .getElementById(`question-${q.id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={`flex size-8 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold ${STATE_STYLES[state].chip}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </nav>
  );
}

function OptionRow({
  label,
  isSelected,
  isCorrect,
}: {
  label: string;
  isSelected: boolean;
  isCorrect: boolean;
}) {
  let box =
    "border-slate-300 bg-white text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200";
  let icon = null;
  let tag: string | null = null;

  if (isSelected && isCorrect) {
    box =
      "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200";
    icon = (
      <HugeiconsIcon
        icon={CheckmarkCircle02Icon}
        className="size-5 shrink-0 text-green-600 dark:text-green-400"
      />
    );
    tag = "Candidate's answer";
  } else if (isSelected) {
    box =
      "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200";
    icon = (
      <HugeiconsIcon
        icon={CancelCircleIcon}
        className="size-5 shrink-0 text-red-600 dark:text-red-400"
      />
    );
    tag = "Candidate's answer";
  } else if (isCorrect) {
    box =
      "border-green-300 bg-white text-slate-900 dark:border-green-800 dark:bg-neutral-900 dark:text-neutral-100";
    icon = (
      <HugeiconsIcon
        icon={CheckmarkCircle01Icon}
        className="size-5 shrink-0 text-green-600 dark:text-green-400"
      />
    );
    tag = "Correct answer";
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-md border px-3.5 py-2.5 ${box}`}
    >
      {icon ?? (
        <span className="size-5 shrink-0 rounded-full border border-slate-300 dark:border-neutral-600" />
      )}
      <span className="min-w-0 flex-1 text-[15px]">{label}</span>
      {tag && (
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium dark:bg-neutral-900/60">
          {tag}
        </span>
      )}
    </li>
  );
}

/** Where a reviewer gives a written answer its points, from 0 up to the question's points. */
function GradeForm({ attemptId, question }: { attemptId: number; question: ResultQuestion }) {
  const grade = useGradeAnswer(attemptId);
  const saved = question.answer?.pointsEarned;
  const [value, setValue] = useState(saved === null || saved === undefined ? "" : String(Number(saved)));

  const points = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(points) && points >= 0 && points <= question.points;

  const submit = () => {
    if (!valid || grade.isPending) return;
    grade.mutate(
      { questionId: question.id, points },
      {
        onSuccess: () => toast.success("Grade saved"),
        onError: (e) => toast.error(e.message || "Failed to save the grade"),
      },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label htmlFor={`grade-${question.id}`} className="text-sm font-medium text-slate-800 dark:text-neutral-200">
        Points
      </label>
      <Input
        id={`grade-${question.id}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={question.points}
        step={0.5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-24 rounded-md border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
      />
      <span className="text-sm text-slate-500 dark:text-neutral-400">out of {question.points}</span>
      <Button
        type="submit"
        disabled={!valid || grade.isPending}
        className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
      >
        {grade.isPending && <Spinner className="size-3.5" />}
        {saved === null || saved === undefined ? "Save grade" : "Update grade"}
      </Button>
      {!valid && value.trim() !== "" && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          Enter 0 to {question.points}.
        </span>
      )}
    </form>
  );
}

function QuestionCard({
  question,
  index,
  attemptId,
}: {
  question: ResultQuestion;
  index: number;
  attemptId: number;
}) {
  const isManager = useIsManager();
  const state = getQuestionState(question);
  const style = STATE_STYLES[state];
  const isWritten = isWrittenQuestion(question.questionType);
  const earned = earnedPoints(question);
  const canGrade = isManager && isWritten && (state === "review" || state === "graded");

  return (
    <article
      id={`question-${question.id}`}
      className="scroll-mt-16 rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Question {index + 1}
        </span>
        <div className="flex items-center gap-2.5">
          {(!isWritten || state === "graded") && (
            <span className="text-sm text-slate-600 dark:text-neutral-400">
              {earned}/{question.points} {question.points === 1 ? "pt" : "pts"}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.pill}`}
          >
            <HugeiconsIcon icon={style.icon} className="size-3.5" />
            {style.label}
          </span>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-5 pt-2">
        <div>
          <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            {question.title}
          </h3>
          {question.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              {question.description}
            </p>
          )}
        </div>

        {isWritten ? (
          <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-950/40">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Candidate&apos;s response
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 dark:text-neutral-100">
              {question.answer?.answerText?.trim() || (
                <span className="italic text-slate-500 dark:text-neutral-400">
                  No answer submitted
                </span>
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {question.options.map((opt) => (
              <OptionRow
                key={opt.id}
                label={opt.label}
                isCorrect={opt.isCorrect}
                isSelected={
                  question.answer?.selectedOptionIds?.includes(opt.id) ?? false
                }
              />
            ))}
          </ul>
        )}

        {canGrade && <GradeForm key={String(question.answer?.pointsEarned)} attemptId={attemptId} question={question} />}
      </div>
    </article>
  );
}

export function AssessmentResultsSheetContent({
  attemptId,
}: {
  attemptId: number | null;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useAttemptResults(
    attemptId ?? 0,
    { enabled: attemptId !== null },
  );

  if (attemptId === null) return null;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
        <Spinner className="size-6" />
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Loading answers…
        </p>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
          We couldn&apos;t load these answers.
        </p>
        <Button
          variant="cancel"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 px-4 text-sm"
        >
          Try again
        </Button>
      </div>
    );
  }

  const results = data.data;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-neutral-950/40">
      <div className="bg-white dark:bg-neutral-900">
        <Summary results={results} />
      </div>
      <QuestionNavigator questions={results.questions} />
      <div className="space-y-4 px-6 py-5">
        {results.questions.map((q, idx) => (
          <QuestionCard key={q.id} question={q} index={idx} attemptId={results.attempt.id} />
        ))}
      </div>
    </div>
  );
}
