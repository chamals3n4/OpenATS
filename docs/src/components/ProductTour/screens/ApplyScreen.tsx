import {useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {ArrowDown02Icon, ArrowRight02Icon, ArrowDown01Icon, Search01Icon, Upload06Icon} from '@hugeicons/core-free-icons';
import {Pointer, useStory} from '../runtime';

// Copied from app/careers: the list (careers-jobs-list.tsx) and the job page (job-application-form.tsx)
const fieldCls =
  'h-8 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-900 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100';
const fieldInput =
  'flex h-11 w-full items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-900 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100';

const JOBS = [
  {dept: 'Engineering', items: [['backend', 'Backend Engineer', 'Full-time · Remote · Posted 2 days ago'], ['frontend', 'Frontend Engineer', 'Full-time · London · Posted 5 days ago']]},
  {dept: 'Design', items: [['designer', 'Product Designer', 'Full-time · Remote · Posted 1 week ago']]},
] as const;

type Form = {first: string; last: string; email: string; phone: string; cv: boolean; answer: boolean};
const EMPTY: Form = {first: '', last: '', email: '', phone: '', cv: false, answer: false};

function Placeholder({value, text}: {value: string; text: string}): ReactNode {
  return value ? <span>{value}</span> : <span className="text-slate-400 dark:text-neutral-500">{text}</span>;
}

/** A candidate finds the role on the careers page, opens it and applies. */
export default function ApplyScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<'list' | 'job'>('list');
  const [hover, setHover] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({...f, [key]: value}));

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setPage('list');
      setHover(null);
      setScrolled(false);
      setForm(EMPTY);
      setStatus('idle');
      await s.wait(900);
      await s.pointTo('job-backend');
      setHover('backend');
      await s.wait(500);
      await s.click();
      setPage('job');
      setHover(null);
      await s.wait(900);
      await s.pointTo('apply-top');
      await s.click();
      setScrolled(true);
      await s.wait(900);
      await s.pointTo('first');
      await s.click();
      await s.type('Alan', set('first'));
      await s.pointTo('last');
      await s.click();
      await s.type('Turing', set('last'));
      await s.pointTo('email');
      await s.click();
      await s.type('alan@example.com', set('email'));
      await s.pointTo('phone');
      await s.click();
      await s.type('+44 20 7946 0958', set('phone'));
      await s.pointTo('cv');
      await s.click();
      setForm((f) => ({...f, cv: true}));
      await s.pointTo('answer');
      await s.click();
      setForm((f) => ({...f, answer: true}));
      await s.pointTo('submit');
      await s.click();
      setStatus('sending');
      await s.wait(900);
      setStatus('sent');
      await s.wait(1600);
    },
    onDone,
  );

  return (
    <div ref={root} className="relative h-full overflow-hidden bg-white dark:bg-neutral-950">
      {page === 'list' ? (
        <div className="mx-auto max-w-[960px] px-8 pt-14 pb-24">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-center gap-4">
              <p className="text-base font-semibold text-slate-900 dark:text-neutral-100">Acme</p>
              <span className="h-8 w-px shrink-0 bg-slate-300 dark:bg-neutral-700" />
              <h1 className="text-2xl leading-tight font-semibold text-slate-900 dark:text-neutral-100">Open roles</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-52">
                <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
                <div className={`${fieldCls} flex items-center pl-9 text-slate-400 dark:text-neutral-500`}>Search roles</div>
              </div>
              <div className={`${fieldCls} flex w-36 items-center justify-between`}>
                All departments <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 opacity-60" />
              </div>
            </div>
          </div>
          <hr className="my-5 border-t border-slate-200 dark:border-neutral-800" />
          <p className="mb-4 text-sm text-slate-500 dark:text-neutral-400">3 open roles</p>
          <div className="space-y-10">
            {JOBS.map(({dept, items}) => (
              <section key={dept}>
                <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  {dept}
                  <span className="font-normal text-slate-500 dark:text-neutral-400">{items.length}</span>
                </h2>
                <ul className="space-y-3">
                  {items.map(([id, title, meta]) => {
                    const on = hover === id;
                    return (
                      <li key={id}>
                        <div
                          data-tour={`job-${id}`}
                          className={`flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-[border-color,background-color,box-shadow] duration-200 ${
                            on
                              ? 'border-neutral-900 bg-slate-50 shadow-sm dark:border-neutral-300 dark:bg-neutral-800/70'
                              : 'border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                          }`}
                        >
                          <div className="min-w-0">
                            <h3 className="text-[17px] leading-snug font-semibold text-slate-900 dark:text-neutral-100">{title}</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{meta}</p>
                          </div>
                          <span
                            className={`relative isolate inline-flex h-9 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-4 text-sm font-medium transition-colors duration-300 ${
                              on ? 'border-neutral-900 text-white dark:border-neutral-100 dark:text-neutral-900' : 'border-slate-300 text-slate-800 dark:border-neutral-600 dark:text-neutral-200'
                            }`}
                          >
                            <span className={`absolute inset-0 -z-10 origin-left rounded-full bg-neutral-900 transition-transform duration-300 dark:bg-neutral-100 ${on ? 'scale-x-100' : 'scale-x-0'}`} />
                            Apply
                            <HugeiconsIcon icon={ArrowRight02Icon} className={`size-4 transition-transform duration-300 ${on ? 'translate-x-0.5' : ''}`} strokeWidth={1.75} />
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="mx-auto max-w-[720px] px-8 pt-14 pb-24 transition-transform duration-700 ease-out"
          style={{transform: scrolled ? 'translateY(-430px)' : 'none'}}
        >
          <span className="text-sm font-medium text-slate-500 dark:text-neutral-400">Careers</span>
          <h1 className="mt-6 text-[32px] leading-tight font-semibold text-slate-900 dark:text-neutral-100">Backend Engineer</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Full-time · Remote · USD 120,000 – 150,000/yearly</p>
          <span
            data-tour="apply-top"
            className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Apply <HugeiconsIcon icon={ArrowDown02Icon} className="size-4" />
          </span>
          <div className="mt-10 space-y-1.5 text-sm leading-[1.45] text-slate-600 dark:text-neutral-300">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-neutral-100">About the role</h2>
            <p>You will build the services behind our hiring product: the API, background jobs and the database.</p>
            <h3 className="pt-1.5 text-lg font-medium text-slate-800 dark:text-neutral-200">What you will do</h3>
            <ul className="list-disc pl-6">
              <li>Design and ship API endpoints in TypeScript and Express</li>
              <li>Keep PostgreSQL fast and the queues healthy</li>
              <li>Review code and pair with the frontend team</li>
            </ul>
          </div>

          <div className="mt-16">
            <h2 className="mb-8 text-xl font-semibold text-slate-900 dark:text-neutral-100">Apply for this role</h2>
            {status === 'sent' ? (
              <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-neutral-800/60 dark:text-neutral-300">
                Application submitted successfully.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                    Name <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div data-tour="first" className={fieldInput}><Placeholder value={form.first} text="First name" /></div>
                    <div data-tour="last" className={fieldInput}><Placeholder value={form.last} text="Last name" /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                      Email <span className="text-red-500">*</span>
                    </p>
                    <div data-tour="email" className={fieldInput}><Placeholder value={form.email} text="example@gmail.com" /></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">Phone</p>
                    <div data-tour="phone" className={fieldInput}><Placeholder value={form.phone} text="Add country code eg :+94" /></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">Resume</p>
                  <div
                    data-tour="cv"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-100 text-[13.5px] font-medium text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300"
                  >
                    {form.cv ? (
                      'alan-turing-cv.pdf (click to replace)'
                    ) : (
                      <>
                        <HugeiconsIcon icon={Upload06Icon} className="size-4" /> Upload file
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                    Do you have the right to work in the UK?<span className="ml-1 text-red-500">*</span>
                  </p>
                  <div className="space-y-2.5">
                    {['Yes', 'No'].map((option) => {
                      const checked = option === 'Yes' && form.answer;
                      return (
                        <div key={option} data-tour={option === 'Yes' ? 'answer' : undefined} className="flex items-center gap-3">
                          <span className={`relative flex size-5 rounded-full border ${checked ? 'border-theme bg-theme' : 'border-slate-300 dark:border-neutral-700'}`}>
                            {checked && <span className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-neutral-400">{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-2">
                  <span
                    data-tour="submit"
                    className={`inline-flex h-11 items-center gap-2 rounded-full bg-neutral-900 px-6 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900 ${status === 'sending' ? 'opacity-60' : ''}`}
                  >
                    {status === 'sending' ? 'Applying' : 'Submit application'}
                    {status !== 'sending' && <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <Pointer at={pointer} pressed={pressed} />
    </div>
  );
}
