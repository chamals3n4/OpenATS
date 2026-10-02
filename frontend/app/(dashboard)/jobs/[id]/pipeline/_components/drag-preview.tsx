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
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="w-64 rounded-md border border-slate-400 bg-white px-3 py-2.5 shadow-md dark:border-neutral-500 dark:bg-neutral-900">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">{item.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">{item.subtitle}</p>
      </div>
    </div>
  );
}
