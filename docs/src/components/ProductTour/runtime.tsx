import {useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {CheckmarkCircle02Icon} from '@hugeicons/core-free-icons';

/** The width the screens are drawn at, as in a desktop browser; they are scaled down to fit. */
export const DESIGN_WIDTH = 1440;
export const DESIGN_HEIGHT = 640;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  return reduced;
}

/** Draws its children at DESIGN_WIDTH and scales them to the space available, like a screenshot. */
export function ScaledFrame({children}: {children: ReactNode}): ReactNode {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / DESIGN_WIDTH);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} style={{height: DESIGN_HEIGHT * scale, overflow: 'hidden', position: 'relative'}}>
      <div
        className="oa-app"
        style={{height: DESIGN_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left', width: DESIGN_WIDTH}}
      >
        {children}
      </div>
    </div>
  );
}

type Point = {x: number; y: number};
export type Box = {x: number; y: number; width: number; height: number};

export type Script = {
  /** Waits, and stops the story when the screen goes away. */
  wait: (ms: number) => Promise<void>;
  /** Moves the pointer to the middle of the element marked data-tour="name". */
  pointTo: (name: string) => Promise<void>;
  /** Moves the pointer to a point on the screen. */
  moveTo: (point: Point, ms?: number) => Promise<void>;
  /** Where the element marked data-tour="name" is, in screen units (before scaling). */
  measure: (name: string) => Box | null;
  /** Holds the pointer down, or lets go, for a drag. */
  press: (down: boolean) => void;
  /** Presses the pointer where it is. */
  click: () => Promise<void>;
  /** Calls set with the text one letter at a time. */
  type: (text: string, set: (value: string) => void) => Promise<void>;
};

class Stopped extends Error {}

/**
 * Plays a screen's story with a pointer, then calls onDone and plays it again. With reduced
 * motion nothing plays and the screen keeps its first state.
 */
export function useStory(
  root: RefObject<HTMLElement | null>,
  story: (s: Script) => Promise<void>,
  onDone?: () => void,
): {pointer: Point | null; pressed: boolean} {
  const reduced = useReducedMotion();
  const [pointer, setPointer] = useState<Point | null>(null);
  const [pressed, setPressed] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (reduced) return;
    let stopped = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) =>
        setTimeout(() => (stopped ? reject(new Stopped()) : resolve()), ms),
      );
    const measure = (name: string): Box | null => {
      const el = root.current?.querySelector(`[data-tour="${name}"]`);
      const box = root.current;
      if (!el || !box) return null;
      const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
      const a = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      return {x: (a.left - b.left) / scale, y: (a.top - b.top) / scale, width: a.width / scale, height: a.height / scale};
    };
    const script: Script = {
      wait,
      measure,
      press: setPressed,
      async moveTo(point, ms = 750) {
        setPointer(point);
        await wait(ms);
      },
      async pointTo(name) {
        const box = measure(name);
        if (!box) return;
        setPointer({x: box.x + box.width / 2, y: box.y + box.height / 2});
        await wait(750);
      },
      async click() {
        setPressed(true);
        await wait(160);
        setPressed(false);
        await wait(140);
      },
      async type(text, set) {
        for (let i = 1; i <= text.length; i++) {
          set(text.slice(0, i));
          await wait(45);
        }
      },
    };
    (async () => {
      for (;;) {
        setPointer(null);
        await story(script);
        await wait(1800);
        done.current?.();
      }
    })().catch(() => {});
    return () => {
      stopped = true;
    };
    // The story is fixed for a screen; it restarts only when the screen mounts again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return {pointer, pressed};
}

/** A mouse pointer that glides to where the story points. */
export function Pointer({at, pressed}: {at: Point | null; pressed: boolean}): ReactNode {
  if (!at) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="26"
      height="26"
      style={{
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        transform: `translate(${at.x - 4}px, ${at.y - 3}px) scale(${pressed ? 0.85 : 1})`,
        transition: 'transform 0.7s cubic-bezier(0.45, 0, 0.2, 1)',
        zIndex: 50,
      }}
    >
      <path d="M4 3l15 7.5-6.5 1.8L9.8 19z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The app's success toast (components/ui/sonner.tsx): a solid green pill at the top centre. */
export function Toast({children}: {children: ReactNode}): ReactNode {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 animate-[tour-toast_2.6s_ease_forwards] items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-md">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" strokeWidth={2} />
      {children}
    </div>
  );
}
