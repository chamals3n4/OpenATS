import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

interface UseDragSortOptions {
  id: string | number;
  index: number;
  type: string;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

export function useDragSort({ id, index, type, onMove }: UseDragSortOptions) {
  const ref = useRef<HTMLElement>(null);

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

  dragRef(dropRef(ref));

  return { ref, isDragging, isOver, dragPreviewRef };
}
