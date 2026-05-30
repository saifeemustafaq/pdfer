"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, FileText, Image as ImageIcon } from "lucide-react";
import { IconTouchButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/file-utils";
import type { StagedFileItem } from "@/types";

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

type SortableItemProps = {
  item: StagedFileItem;
  onRemove: (id: string) => void;
  sortable?: boolean;
};

function SortableItem({ item, onRemove, sortable = true }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card",
        isDragging && "shadow-sm opacity-80 z-10"
      )}
    >
      {sortable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
        {isImageFile(item.file) ? (
          <ImageIcon className="w-5 h-5 text-primary" aria-hidden />
        ) : (
          <FileText className="w-5 h-5 text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {formatBytes(item.file.size)}
        </p>
      </div>

      <IconTouchButton
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.file.name}`}
      >
        <X className="w-5 h-5" />
      </IconTouchButton>
    </div>
  );
}

type FileListProps = {
  items: StagedFileItem[];
  onReorder: (items: StagedFileItem[]) => void;
  sortable?: boolean;
};

export function FileList({ items, onReorder, sortable = true }: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!sortable) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  const list = (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <SortableItem
          key={item.id}
          item={item}
          onRemove={(id) => onReorder(items.filter((i) => i.id !== id))}
          sortable={sortable}
        />
      ))}
    </div>
  );

  if (!sortable) return list;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </DndContext>
  );
}
