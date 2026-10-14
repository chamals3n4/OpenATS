"use client";

import { useEffect, type RefObject } from "react";

const EDGE = 120;
const MAX_SPEED = 18;

/** Scroll sideways when dragging near the edge */
export function useEdgeScroll(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    let pointerX: number | null = null;
    let frame = 0;

    const onDragOver = (e: DragEvent) => {
      pointerX = e.clientX;
    };

    const tick = () => {
      const el = ref.current;
      if (el && pointerX !== null) {
        const { left, right } = el.getBoundingClientRect();
        if (pointerX < left + EDGE) {
          el.scrollLeft -= MAX_SPEED * Math.min(1, (left + EDGE - pointerX) / EDGE);
        } else if (pointerX > right - EDGE) {
          el.scrollLeft += MAX_SPEED * Math.min(1, (pointerX - (right - EDGE)) / EDGE);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("dragover", onDragOver);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      cancelAnimationFrame(frame);
    };
  }, [ref, active]);
}
