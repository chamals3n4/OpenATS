import {useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {
  ArrowDown01Icon,
  CallIcon,
  Clock01Icon,
  CoPresentIcon,
  Delete01Icon,
  Edit02Icon,
  File01Icon,
  Mail01Icon,
  QuestionIcon,
  Quiz03Icon,
  StarIcon,
  TaskDone01Icon,
  TelegramIcon,
  TextAlignLeftIcon,
  UserRemove01Icon,
} from '@hugeicons/core-free-icons';
import Shell from '../Shell';
import {Pointer, Toast, useStory} from '../runtime';

// Copied from app/(dashboard)/candidates/[id]: candidate-header, section-tabs, score-breakdown
const SECTIONS: [string, IconSvgElement][] = [
  ['CV Summary', TextAlignLeftIcon],
  ['Answers', QuestionIcon],
  ['Stage History', Clock01Icon],
  ['Offer', TelegramIcon],
  ['Interviews', CoPresentIcon],
  ['Rejection', UserRemove01Icon],
  ['Send Email', Mail01Icon],
  ['Scores', Quiz03Icon],
  ['Assignments', TaskDone01Icon],
];
const RATING_LABELS = ['Poor', 'Below average', 'Average', 'Good', 'Excellent'];
const cancelBtn =
  'inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3.5 text-sm font-medium text-slate-700 dark:border-neutral-600 dark:text-neutral-200';

/** A candidate's page: the reviewer rates the CV and the score updates. */
export default function CandidateScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<number | null>(null);

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setPicked(0);
      setRating(null);
      setToast(null);
      await s.wait(1200);
      await s.pointTo('star-4');
      await s.click();
      setPicked(4);
      await s.wait(500);
      await s.pointTo('update');
      await s.click();
      setUpdating(true);
      await s.wait(700);
      setUpdating(false);
      setRating(75);
      setToast(Date.now());
      await s.wait(2200);
    },
    onDone,
  );

  const parts = [
    {label: 'Questions', value: 92 as number | null},
    {label: 'Assessment', value: 86 as number | null},
    {label: 'Rating', value: rating},
    {label: 'Interview', value: null as number | null},
  ];
  const scored = parts.filter((p) => p.value !== null);
  const total = Math.round(scored.reduce((n, p) => n + (p.value ?? 0), 0) / scored.length);
  const changed = picked > 0 && rating === null;

  return (
    <Shell active="Candidates">
      <div ref={root} className="relative flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl leading-tight font-bold text-slate-950 dark:text-neutral-50">Alan Turing</h1>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-neutral-400">
                <span className="truncate">Backend Engineer</span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:bg-emerald-950/30 dark:text-emerald-400">
                  active
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-6 min-w-10 items-center justify-center rounded-md bg-emerald-50 px-2 text-sm font-semibold text-emerald-800 tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300">
                    {total}
                  </span>
                  <span className="text-sm text-slate-500 tabular-nums dark:text-neutral-400">{scored.length}/4</span>
                </span>
              </div>
              <div className="mt-2 flex gap-x-5 text-sm text-slate-600 dark:text-neutral-300">
                {[
                  [Mail01Icon, 'alan@example.com'],
                  [CallIcon, '+44 20 7946 0958'],
                  [Clock01Icon, 'Applied Oct 21, 2026'],
                ].map(([icon, text]) => (
                  <span key={text as string} className="inline-flex items-center gap-2 font-medium">
                    <HugeiconsIcon icon={icon as IconSvgElement} className="size-5 shrink-0 text-theme dark:text-[oklch(0.7_0.15_162)]" />
                    {text as string}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cancelBtn}>
                <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={1.75} />
                View CV
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 dark:border-neutral-600 dark:text-neutral-200">
                Screening <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 opacity-60" />
              </span>
              <span className="mx-1 h-6 w-px bg-slate-300 dark:bg-neutral-700" />
              <span className={cancelBtn}>
                <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                Edit
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
                <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                Delete
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-5">
          <div className="mb-4 flex w-fit max-w-full gap-1 rounded-lg border border-slate-300 p-1 dark:border-neutral-700">
            {SECTIONS.map(([label, icon]) => (
              <span
                key={label}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm leading-none font-medium ${
                  label === 'Scores'
                    ? 'bg-theme text-white'
                    : 'bg-slate-200/70 text-slate-800 dark:bg-neutral-800 dark:text-neutral-200'
                }`}
              >
                <HugeiconsIcon icon={icon} className="size-3.5" />
                {label}
              </span>
            ))}
          </div>

          <div className="rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
            <section className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">Score</h3>
                  <p className="mt-0.5 text-[15px] text-slate-500 dark:text-neutral-400">{scored.length} of 4 parts scored so far</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    data-tour="update"
                    className={`inline-flex h-9 items-center gap-2 rounded-md bg-theme px-4 text-sm font-semibold text-white ${changed ? '' : 'opacity-50'}`}
                  >
                    {updating ? 'Updating' : 'Update score'}
                  </span>
                  <p className="text-4xl leading-none font-semibold text-slate-900 tabular-nums dark:text-neutral-100">
                    {total}
                    <span className="ml-1 text-lg font-medium text-slate-400">/100</span>
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {parts.map((part) => (
                  <li key={part.label} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-x-4">
                    <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                      {part.label}
                      <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-neutral-400">25%</span>
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                      <div
                        className="h-full rounded-full bg-theme transition-[width] duration-700"
                        style={{width: `${part.value ?? 0}%`}}
                      />
                    </div>
                    <span className="text-right text-sm text-slate-700 tabular-nums dark:text-neutral-300">
                      {part.value === null ? 'Not yet' : `${part.value} / 100`}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-x-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">Your rating</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">After reading the CV.</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} data-tour={`star-${n}`} className="rounded-md p-0.5">
                      <HugeiconsIcon
                        icon={StarIcon}
                        className={`size-6 ${n <= picked ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-neutral-600'}`}
                      />
                    </span>
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-neutral-400">{picked ? RATING_LABELS[picked - 1] : 'Not rated'}</span>
              </div>
            </section>
          </div>
        </div>
        {toast && <Toast key={toast}>Score updated</Toast>}
        <Pointer at={pointer} pressed={pressed} />
      </div>
    </Shell>
  );
}
