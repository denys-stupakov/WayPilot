import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

export function SortableItem({ id, className, children }) {
  const sortable = useSortable({ id });
  const { setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      {...sortable.attributes}
    >
      {typeof children === "function" ? children(sortable) : children}
    </div>
  );
}