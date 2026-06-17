"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StarIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

type FavoriteItem = {
  id: string;
  pageId: string;
  orderIndex: number;
};

type PageItem = {
  id: string;
  shortId: string;
  title: string;
  icon: string | null;
};

type Props = {
  favorites: FavoriteItem[];
  pagesMap: Record<string, PageItem>;
  workspaceSlug: string;
  onRemove: (pageId: string) => void;
  onReorder: (ids: string[]) => void;
};

export function FavoritesSection({
  favorites,
  pagesMap,
  workspaceSlug,
  onRemove,
  onReorder,
}: Props) {
  const [localFavs, setLocalFavs] = useState<FavoriteItem[]>(favorites);

  if (
    localFavs.length !== favorites.length ||
    localFavs.some((f, i) => f.pageId !== favorites[i]?.pageId)
  ) {
    setLocalFavs(favorites);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIdx = localFavs.findIndex((f) => f.pageId === active.id);
    const newIdx = localFavs.findIndex((f) => f.pageId === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(localFavs, oldIdx, newIdx);
    setLocalFavs(reordered);
    onReorder(reordered.map((f) => f.pageId));
  }

  return (
    <div className="px-2">
      {/* Clickable nav item — same style as Search / Notifications / Settings */}
      <Link
        href={`/app/${workspaceSlug}/favorites`}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <StarIcon size={15} className="shrink-0" />
        <span className="flex-1">Favorites</span>
      </Link>

      {/* Favorited pages below the nav item */}
      {localFavs.length === 0 ? (
        <p className="px-2 py-1 text-xs text-sidebar-foreground/30">
          Star a page to add it here.
        </p>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={localFavs.map((f) => f.pageId)}
            strategy={verticalListSortingStrategy}
          >
            {localFavs.map((fav) => {
              const page = pagesMap[fav.pageId];
              return (
                <FavoriteRow
                  favoriteId={fav.pageId}
                  icon={page?.icon ?? null}
                  key={fav.pageId}
                  onRemove={() => onRemove(fav.pageId)}
                  shortId={page?.shortId ?? fav.pageId}
                  title={page?.title ?? "Untitled"}
                  workspaceSlug={workspaceSlug}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function FavoriteRow({
  favoriteId,
  icon,
  title,
  shortId,
  workspaceSlug,
  onRemove,
}: {
  favoriteId: string;
  icon: string | null;
  title: string;
  shortId: string;
  workspaceSlug: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: favoriteId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group flex items-center rounded-md hover:bg-sidebar-accent"
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
        href={`/app/${workspaceSlug}/${shortId}`}
        {...listeners}
      >
        {icon ? (
          <span className="shrink-0 text-sm leading-none">{icon}</span>
        ) : (
          <StarIcon className="shrink-0 text-sidebar-foreground/30" size={12} />
        )}
        <span className="min-w-0 truncate">{title || "Untitled"}</span>
      </Link>
      <button
        className="mr-1 hidden size-5 shrink-0 items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground group-hover:flex"
        onClick={onRemove}
        title="Remove from favorites"
        type="button"
      >
        <XIcon size={11} />
      </button>
    </div>
  );
}
