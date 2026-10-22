import {useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {Tick02Icon} from '@hugeicons/core-free-icons';
import {Pointer, useStory} from '../runtime';

// Copied from app/offer/[token]: page, offer-details, offer-response
const DETAILS = [
  ['Salary', 'USD 140,000'],
  ['Employment type', 'Full-time'],
  ['Start date', 'November 3, 2026'],
  ['Reporting manager', 'Mia Park'],
];

/** The offer page a candidate opens from the email, and accepting it. */
export default function OfferScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'open' | 'processing' | 'accepted'>('open');

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setState('open');
      await s.wait(1400);
      await s.pointTo('accept');
      await s.click();
      setState('processing');
      await s.wait(900);
      setState('accepted');
      await s.wait(2600);
    },
    onDone,
  );

  const accepted = state === 'accepted';

  return (
    <div ref={root} className="relative h-full overflow-hidden bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-[640px] px-8 pt-14 pb-24">
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">Offer Letter</p>
        <h1 className="mt-4 text-[32px] leading-tight font-semibold text-slate-900 dark:text-neutral-100">Backend Engineer</h1>
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-neutral-400">Alan Turing</p>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              accepted
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'bg-theme/10 text-theme'
            }`}
          >
            {accepted ? 'Accepted' : 'Awaiting Response'}
          </span>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {DETAILS.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {accepted ? (
          <div className="mt-12 rounded-xl bg-emerald-50 px-6 py-5 text-center dark:bg-emerald-950/20">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <HugeiconsIcon icon={Tick02Icon} className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
            <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">Offer accepted</p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Congratulations! The hiring team has been notified.</p>
          </div>
        ) : (
          <div className="mt-12">
            <p className="mb-4 text-sm text-slate-600 dark:text-neutral-400">
              Please respond by <span className="font-medium text-slate-900 dark:text-neutral-100">October 31, 2026, 5:00 PM</span>.
            </p>
            <div className="flex items-center gap-3">
              <span
                data-tour="accept"
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-theme px-6 text-sm font-medium text-white ${state === 'processing' ? 'opacity-50' : ''}`}
              >
                {state === 'processing' ? 'Processing' : 'Accept offer'}
              </span>
              <span className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-600 dark:border-neutral-700 dark:text-neutral-300">
                Decline
              </span>
            </div>
          </div>
        )}

        <p className="mt-12 text-center text-xs text-slate-400 dark:text-neutral-500">Powered by OpenATS</p>
      </div>
      <Pointer at={pointer} pressed={pressed} />
    </div>
  );
}
