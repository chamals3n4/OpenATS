import {useRef, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {ArrowLeft01Icon, Search01Icon} from '@hugeicons/core-free-icons';
import Shell from '../Shell';
import {Pointer, Toast, useStory} from '../runtime';

// Copied from app/(dashboard)/jobs/[id]/pipeline: board-header, board-column, board-card, drag-preview
type StageId = 'applied' | 'screening' | 'interview' | 'offer';
const STAGES: {id: StageId; name: string; dot: string}[] = [
  {id: 'applied', name: 'Applied', dot: 'bg-slate-400'},
  {id: 'screening', name: 'Screening', dot: 'bg-amber-500'},
  {id: 'interview', name: 'Interview', dot: 'bg-blue-500'},
  {id: 'offer', name: 'Offer', dot: 'bg-green-500'},
];
const PEOPLE: Record<string, {name: string; applied: string; score: number | null; parts: string}> = {
  alan: {name: 'Alan', applied: 'Oct 21, 2026', score: 76, parts: '1/4'},
  ada: {name: 'Ada', applied: 'Oct 18, 2026', score: 82, parts: '1/4'},
  grace: {name: 'Grace', applied: 'Oct 17, 2026', score: 64, parts: '1/4'},
  margaret: {name: 'Margaret', applied: 'Oct 16, 2026', score: 71, parts: '1/4'},
  katherine: {name: 'Katherine', applied: 'Oct 14, 2026', score: 77, parts: '2/4'},
  linus: {name: 'Linus', applied: 'Oct 11, 2026', score: 45, parts: '2/4'},
  barbara: {name: 'Barbara', applied: 'Oct 9, 2026', score: 91, parts: '3/4'},
  edsger: {name: 'Edsger', applied: 'Oct 8, 2026', score: 79, parts: '3/4'},
  radia: {name: 'Radia', applied: 'Oct 2, 2026', score: 94, parts: '4/4'},
};
type Board = Record<StageId, string[]>;
const START: Board = {
  applied: ['ada', 'grace', 'margaret'],
  screening: ['katherine', 'linus'],
  interview: ['barbara', 'edsger'],
  offer: ['radia'],
};

const TONE = (score: number) =>
  score >= 75
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
    : score >= 50
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300';

/** The pipeline: a new applicant shows up and candidates are dragged to their next stage. */
export default function PipelineScreen({onDone}: {onDone?: () => void}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<Board>(START);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<StageId | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [toast, setToast] = useState<{text: string; key: number} | null>(null);

  const {pointer, pressed} = useStory(
    root,
    async (s) => {
      setBoard(START);
      setToast(null);
      setFresh(null);
      await s.wait(900);
      setBoard((b) => ({...b, applied: ['alan', ...b.applied]}));
      setFresh('alan');
      await s.wait(1500);

      const drag = async (id: string, from: StageId, to: StageId, toast?: string) => {
        await s.pointTo(`card-${id}`);
        s.press(true);
        setDragging(id);
        await s.wait(250);
        const target = s.measure(`col-${to}`);
        if (target) {
          setOver(to);
          await s.moveTo({x: target.x + target.width / 2, y: target.y + 40}, 900);
        }
        s.press(false);
        setBoard((b) => ({...b, [from]: b[from].filter((c) => c !== id), [to]: [id, ...b[to]]}));
        setDragging(null);
        setOver(null);
        setFresh(id);
        if (toast) setToast({text: toast, key: Date.now()});
        await s.wait(1700);
      };
      await drag('alan', 'applied', 'screening', 'Assessment invite sent');
      await drag('katherine', 'screening', 'interview');
    },
    onDone,
  );

  const total = Object.values(board).reduce((n, ids) => n + ids.length, 0);

  return (
    <Shell active="Manage Jobs">
      <div ref={root} className="relative flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
        <header className="shrink-0 border-b border-slate-300 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-neutral-100">Backend Engineer</h1>
                <span className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Published
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Full-time · Remote · {total} candidates in process</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-72">
                <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500 dark:text-neutral-400" />
                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-gray-100 pl-9 text-sm text-slate-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  Search candidates
                </div>
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 dark:border-neutral-600 dark:text-neutral-200">
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
                Back to job
              </span>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full w-max items-stretch gap-4 p-6">
            {STAGES.map((stage) => (
              <section key={stage.id} className="flex min-h-0 w-72 shrink-0 flex-col">
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span className={`size-2 rounded-full ${stage.dot}`} />
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">{stage.name}</h2>
                  <span className="ml-auto rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                    {board[stage.id].length}
                  </span>
                </header>
                <div
                  data-tour={`col-${stage.id}`}
                  className={`relative min-h-0 flex-1 space-y-2 rounded-lg border p-2 transition-colors duration-200 ${
                    over === stage.id
                      ? 'border-theme bg-theme/5'
                      : 'border-slate-300 bg-slate-100/60 dark:border-neutral-700 dark:bg-neutral-900/40'
                  }`}
                >
                  {board[stage.id].map((id) => {
                    const p = PEOPLE[id]!;
                    return (
                      <div
                        key={id}
                        data-tour={`card-${id}`}
                        className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2.5 transition-[border-color,opacity] duration-200 dark:bg-neutral-900 ${
                          dragging === id
                            ? 'border-dashed border-slate-400 opacity-40 dark:border-neutral-500'
                            : fresh === id
                              ? 'border-theme bg-theme/5'
                              : 'border-slate-300 dark:border-neutral-700'
                        }`}
                      >
                        <span className="size-5 shrink-0 rounded-[4px] border border-slate-300 bg-white dark:border-neutral-600 dark:bg-neutral-900" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">{p.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-neutral-400">Applied {p.applied}</p>
                        </div>
                        {p.score !== null && (
                          <span className="inline-flex shrink-0 items-center gap-1.5">
                            <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${TONE(p.score)}`}>
                              {p.score}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums dark:text-neutral-400">{p.parts}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* The card under the pointer while dragging (drag-preview.tsx) */}
        {dragging && pointer && (
          <div
            className="pointer-events-none absolute top-0 left-0 z-40"
            style={{transform: `translate(${pointer.x + 8}px, ${pointer.y + 6}px)`, transition: 'transform 0.7s cubic-bezier(0.45, 0, 0.2, 1)'}}
          >
            <div className="w-64 rounded-md border border-slate-400 bg-white px-3 py-2.5 shadow-lg dark:border-neutral-500 dark:bg-neutral-900">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">{PEOPLE[dragging]!.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-neutral-400">Applied {PEOPLE[dragging]!.applied}</p>
            </div>
          </div>
        )}
        {toast && <Toast key={toast.key}>{toast.text}</Toast>}
        <Pointer at={pointer} pressed={pressed} />
      </div>
    </Shell>
  );
}
