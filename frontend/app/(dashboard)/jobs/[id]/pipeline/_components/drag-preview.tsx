"use client";

import { useDragLayer } from "react-dnd";
import type { DragItem } from "./board-card";

/** The card that follows the pointer while dragging, drawn by us because the native image is blank. */
export function DragPreview() {
  const { item, offset, isDragging } = useDragLayer((monitor) => ({
    item: monitor.getItem() as DragItem | null,
    offset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !offset || !item) return null;

  return (
    <div
      aria-hidden
      // The browser reports the pointer every few frames while dragging. Easing between those
      // reports makes the card glide after the pointer instead of hopping from spot to spot.
      // People who ask for reduced motion get the card exactly at the pointer instead.
      className="pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform transition-transform duration-[110ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
    >
      <div
        className="w-64 rounded-md border border-slate-400 bg-white px-3 py-2.5 dark:border-neutral-500 dark:bg-neutral-900"
        style={{
          transformOrigin: "20% 0%",
          animation: "card-pickup 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <p className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">{item.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">{item.subtitle}</p>
      </div>
    </div>
  );
}
