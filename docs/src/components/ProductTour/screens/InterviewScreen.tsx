import {useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {Calendar02Icon, Link01Icon, Tick02Icon} from '@hugeicons/core-free-icons';
import {Pointer, useStory} from '../runtime';

// Copied from app/interview/_components: slot-picker and confirmed-state
const SLOTS = [
  ['Wednesday, October 22, 2026', '2:00 PM'],
  ['Thursday, October 23, 2026', '10:00 AM'],
  ['Friday, October 24, 2026', '11:30 AM'],
];

/** The page a candidate opens from the email: they pick a time and it is booked. */
export default function InterviewScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<'pick' | 'confirming' | 'done'>('pick');
  // The page scrolls down to the confirm button once a time is picked
  const [scrolled, setScrolled] = useState(false);

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setSelected(null);
      setScrolled(false);
      setState('pick');
      await s.wait(1200);
      await s.pointTo('slot-1');
      await s.click();
      setSelected(1);
      await s.wait(500);
      setScrolled(true);
      await s.wait(800);
      await s.pointTo('confirm');
      await s.click();
      setState('confirming');
      await s.wait(900);
      setState('done');
      await s.wait(2200);
    },
    onDone,
  );

  return (
    <div ref={root} className="relative h-full overflow-hidden bg-white dark:bg-neutral-950">
      {state === 'done' ? (
        <div className="flex h-full items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-theme/10">
              <HugeiconsIcon icon={Tick02Icon} className="size-5 text-theme" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">You&apos;re all set</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
              Your interview for <strong className="font-medium text-slate-700 dark:text-neutral-200">Backend Engineer</strong> is
              confirmed. A confirmation email with the details is on its way.
            </p>
            <p className="mt-8 text-xs text-slate-400 dark:text-neutral-500">Powered by OpenATS</p>
          </div>
        </div>
      ) : (
        <div
          className="mx-auto max-w-[600px] px-8 pt-14 pb-24 transition-transform duration-700 ease-out"
          style={{transform: scrolled ? 'translateY(-150px)' : 'none'}}
        >
          <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">Interview Scheduling</p>
          <h1 className="mt-4 text-[32px] leading-tight font-semibold text-slate-900 dark:text-neutral-100">Technical interview</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Backend Engineer · Virtual · 45 minutes</p>
          <div className="mt-8 flex items-center gap-3 rounded-md bg-slate-100 px-4 py-3 dark:bg-neutral-800/60">
            <HugeiconsIcon icon={Link01Icon} className="size-4 shrink-0 text-slate-400 dark:text-neutral-500" />
            <span className="text-sm text-slate-700 dark:text-neutral-200">https://meet.google.com/abc-defg-hij</span>
          </div>

          <h2 className="mt-12 text-xl font-semibold text-slate-900 dark:text-neutral-100">Pick a time</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Select the slot that works best for you.</p>

          <div className="mt-6 space-y-2.5">
            {SLOTS.map(([date, time], i) => {
              const active = selected === i;
              return (
                <div
                  key={date}
                  data-tour={`slot-${i}`}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-5 py-4 transition-colors ${
                    active ? 'border-theme bg-theme/5' : 'border-slate-200 dark:border-neutral-800'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <HugeiconsIcon icon={Calendar02Icon} className={`size-4 shrink-0 ${active ? 'text-theme' : 'text-slate-400 dark:text-neutral-500'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 dark:text-neutral-100">{date}</span>
                      <span className="mt-0.5 block text-sm text-slate-500 dark:text-neutral-400">{time}</span>
                    </span>
                  </span>
                  {active && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-theme">
                      <HugeiconsIcon icon={Tick02Icon} className="size-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <span
              data-tour="confirm"
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-theme px-6 text-sm font-medium text-white ${
                selected === null || state === 'confirming' ? 'opacity-50' : ''
              }`}
            >
              {state === 'confirming' ? 'Confirming' : 'Confirm this time'}
            </span>
          </div>
        </div>
      )}
      <Pointer at={pointer} pressed={pressed} />
    </div>
  );
}
