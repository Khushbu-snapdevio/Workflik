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
import { CaretDownIcon, StarIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VISIBLE_MAX = 3;

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
  const [expanded, setExpanded] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  if (
    localFavs.length !== favorites.length ||
    localFavs.some((f, i) => f.pageId !== favorites[i]?.pageId)
  ) {
    setLocalFavs(favorites);
  }

  useEffect(() => {
    if (!popupOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node)) return;
      setPopupOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popupOpen]);

  function openPopup() {
    if (moreRef.current) {
      const r = moreRef.current.getBoundingClientRect();
      setPopupPos({ top: r.top, left: r.right + 8 });
    }
    setPopupOpen((v) => !v);
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

  const visible = localFavs.slice(0, VISIBLE_MAX);
  const hasMore = localFavs.length > VISIBLE_MAX;

  return (
    <div className="px-2">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <StarIcon size={15} className="shrink-0" />
        <span className="flex-1 text-left">Favorites</span>
        {localFavs.length > 0 && (
          <span className="text-2xs text-sidebar-foreground/30">{localFavs.length}</span>
        )}
        <CaretDownIcon
          size={11}
          className={`shrink-0 transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        localFavs.length === 0 ? (
          <p className="px-2 py-1 text-xs text-sidebar-foreground/30">
            Star a page to add it here.
          </p>
        ) : (
          <>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={visible.map((f) => f.pageId)}
                strategy={verticalListSortingStrategy}
              >
                {visible.map((fav) => {
                  const page = pagesMap[fav.pageId];
                  return (
                    <FavoriteRow
                      favoriteId={fav.pageId}
                      icon={page?.icon ?? null}
                      key={fav.pageId}
                      shortId={page?.shortId ?? fav.pageId}
                      title={page?.title ?? "Untitled"}
                      workspaceSlug={workspaceSlug}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            {hasMore && (
              <button
                ref={moreRef}
                type="button"
                onClick={openPopup}
                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
              >
                <span className="flex size-3.5 items-center justify-center">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
                  </svg>
                </span>
                {localFavs.length - VISIBLE_MAX} more
              </button>
            )}
          </>
        )
      )}

      {/* Popup flyout */}
      {popupOpen && popupPos && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[300] w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-xs font-semibold text-foreground">Favorites</span>
            <span className="text-xs text-muted-foreground">{localFavs.length} pages</span>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {localFavs.map((fav) => {
              const page = pagesMap[fav.pageId];
              return (
                <Link
                  key={fav.pageId}
                  href={`/app/${workspaceSlug}/${page?.shortId ?? fav.pageId}`}
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {page?.icon ? (
                    <span className="shrink-0 text-sm leading-none">{page.icon}</span>
                  ) : (
                    <svg className="size-3.5 shrink-0 text-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  )}
                  <span className="min-w-0 truncate">{page?.title || "Untitled"}</span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Link
              href={`/app/${workspaceSlug}/library`}
              onClick={() => setPopupOpen(false)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Open in Library
            </Link>
          </div>
        </div>,
        document.body,
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
}: {
  favoriteId: string;
  icon: string | null;
  title: string;
  shortId: string;
  workspaceSlug: string;
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
          <svg className="size-3 shrink-0 text-sidebar-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        )}
        <span className="min-w-0 truncate">{title || "Untitled"}</span>
      </Link>
    </div>
  );
}
