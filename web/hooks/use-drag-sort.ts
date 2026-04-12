import { useRef, type RefObject } from "react";
import type { ConnectDragPreview } from "react-dnd";
import { useDrag, useDrop } from "react-dnd";

interface UseDragSortOptions {
  id: string | number;
  index: number;
  type: string;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  /** When true, only the element with `dragHandleRef` starts a drag; the row is still the drop target. */
  dragHandleOnly?: boolean;
}

export type UseDragSortReturn = {
  ref: RefObject<HTMLElement | null>;
  isDragging: boolean;
  isOver: boolean;
  dragPreviewRef: ConnectDragPreview;
  dragHandleRef?: RefObject<HTMLElement | null>;
};

export function useDragSort({
  id,
  index,
  type,
  onMove,
  dragHandleOnly = false,
}: UseDragSortOptions): UseDragSortReturn {
  const ref = useRef<HTMLElement>(null);
  const dragHandleRef = useRef<HTMLElement>(null);

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
    type,
    item: () => ({ id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, dropRef] = useDrop<
    { id: string | number; index: number },
    void,
    { isOver: boolean }
  >({
    accept: type,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMidY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMidY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMidY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  if (dragHandleOnly) {
    dragRef(dragHandleRef);
    dropRef(ref);
  } else {
    dragRef(dropRef(ref));
  }

  return {
    ref,
    isDragging,
    isOver,
    dragPreviewRef,
    ...(dragHandleOnly ? { dragHandleRef } : {}),
  };
}
