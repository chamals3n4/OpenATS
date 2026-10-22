import {useEffect, useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon} from '@hugeicons/core-free-icons';
import {Pointer, useReducedMotion, useStory} from '../runtime';

// Copied from app/assessment/_components: quiz-screen, question-card, question-navigator, submitted-screen
const QUESTIONS = [
  {title: 'Where should slow work, such as reading uploaded CVs, run?', options: ['In a background queue, outside the request', 'Inside the request, before replying', 'In the browser, before uploading', 'In a database trigger']},
  {title: 'Which status code fits a request with a missing required field?', options: ['200 OK', '400 Bad Request', '404 Not Found', '500 Internal Server Error']},
];
const TOTAL = 10;
const optionCls = (checked: boolean) =>
  `flex items-start gap-3 rounded-lg border px-4 py-3.5 text-base leading-snug text-slate-900 transition-[border-color,background-color] duration-150 dark:text-neutral-100 ${
    checked ? 'border-theme bg-theme/5 dark:bg-theme/10' : 'border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
  }`;

/** A candidate taking a timed test: answers two questions, submits, and sees it received. */
export default function AssessmentScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(24 * 60 + 13);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setSeconds((s) => (s > 60 ? s - 1 : 24 * 60 + 13)), 1000);
    return () => clearInterval(id);
  }, [reduced]);

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setQ(0);
      setAnswers({});
      setSubmitted(false);
      await s.wait(1200);
      await s.pointTo('option-0');
      await s.click();
      setAnswers((a) => ({...a, 6: 0}));
      await s.pointTo('next');
      await s.click();
      setQ(1);
      await s.wait(700);
      await s.pointTo('option-1');
      await s.click();
      setAnswers((a) => ({...a, 7: 1}));
      await s.pointTo('submit');
      await s.click();
      setSubmitted(true);
      await s.wait(2600);
    },
    onDone,
  );

  // Questions 1 to 6 were answered before the story starts
  const done = new Set([0, 1, 2, 3, 4, 5, ...Object.keys(answers).map(Number)]);
  const current = 6 + q;
  const question = QUESTIONS[q]!;
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div ref={root} className="relative h-full overflow-hidden bg-white dark:bg-neutral-950">
      {submitted ? (
        <main className="flex h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-theme/10 text-theme">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-6" strokeWidth={2} />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-neutral-100">Assessment submitted</h1>
            <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
              <p>Thank you, Alan. Your answers for Backend skills test have been received.</p>
              <p className="rounded-md border border-slate-300 px-4 py-3 text-slate-900 dark:border-neutral-700 dark:text-neutral-100">
                You answered <span className="font-semibold">{done.size}</span> of <span className="font-semibold">{TOTAL}</span> questions.
              </p>
              <p>The hiring team will review your result and contact you about the next steps.</p>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex h-full flex-col">
          <header className="bg-white dark:bg-neutral-950">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-neutral-100">Backend skills test</h1>
                <p className="truncate text-[15px] text-slate-500 dark:text-neutral-400">Backend Engineer at Acme · {done.size} of {TOTAL} answered</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5 rounded-md border border-slate-300 px-4 py-2 text-slate-900 dark:border-neutral-700 dark:text-neutral-100">
                <HugeiconsIcon icon={Clock01Icon} className="size-5" strokeWidth={2} />
                <span className="text-2xl leading-none font-semibold tabular-nums">{clock}</span>
              </div>
            </div>
            <div className="h-1 bg-slate-200 dark:bg-neutral-800">
              <div className="h-full bg-theme transition-[width] duration-300" style={{width: `${(done.size / TOTAL) * 100}%`}} />
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-6 py-8">
            <main className="min-w-0 flex-1">
              <div className="mx-auto max-w-2xl">
                <p className="text-[15px] font-medium text-slate-500 dark:text-neutral-400">Question {current + 1} of {TOTAL} · 1 point</p>
                <h2 className="mt-2 text-2xl leading-snug font-semibold text-slate-900 dark:text-neutral-100">{question.title}</h2>
                <p className="mt-7 mb-3 text-[15px] font-medium text-slate-700 dark:text-neutral-300">Choose one answer.</p>
                <div className="grid gap-2.5">
                  {question.options.map((option, i) => {
                    const checked = answers[current] === i;
                    return (
                      <div key={option} data-tour={`option-${i}`} className={optionCls(checked)}>
                        <span className={`relative mt-0.5 flex size-5 shrink-0 rounded-full border ${checked ? 'border-theme bg-theme' : 'border-slate-300 dark:border-neutral-600'}`}>
                          {checked && <span className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />}
                        </span>
                        <span>{option}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-neutral-800">
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 pr-4 pl-3 text-sm font-medium text-slate-700 dark:border-neutral-600 dark:text-neutral-200">
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
                    Previous
                  </span>
                  <span data-tour="next" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-theme pr-4 pl-5 text-sm font-semibold text-white">
                    Next
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2} />
                  </span>
                </div>
              </div>
            </main>

            <aside className="w-64 shrink-0 self-start">
              <div className="rounded-lg border border-slate-300 p-4 dark:border-neutral-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Questions</h2>
                <ol className="mt-3 grid grid-cols-5 gap-2">
                  {Array.from({length: TOTAL}, (_, i) => {
                    const answered = done.has(i);
                    return (
                      <li
                        key={i}
                        className={`flex h-9 items-center justify-center rounded-md text-sm font-semibold tabular-nums ${
                          answered
                            ? 'border border-theme bg-theme text-white'
                            : i === current
                              ? 'border-2 border-theme bg-white text-slate-700 dark:bg-neutral-900 dark:text-neutral-300'
                              : 'border border-slate-300 bg-white text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                        }`}
                      >
                        {i + 1}
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 flex gap-x-4 text-[13px] text-slate-600 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-theme" />
                    Answered
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-slate-300 dark:border-neutral-600" />
                    Not answered
                  </span>
                </div>
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-neutral-800">
                  <span data-tour="submit" className="inline-flex h-10 w-full items-center justify-center rounded-md bg-theme px-5 text-sm font-semibold text-white">
                    Submit assessment
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
      <Pointer at={pointer} pressed={pressed} />
    </div>
  );
}
