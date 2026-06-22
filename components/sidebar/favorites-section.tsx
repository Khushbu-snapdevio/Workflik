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
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => { setMounted(true); }, []);

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
        className="group mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-all duration-100 hover:bg-muted/50 hover:text-foreground"
      >
        <StarIcon size={15} className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
        <span className="flex-1 text-left">Favorites</span>
        {localFavs.length > 0 && (
          <span className="text-[11px] text-muted-foreground/50">{localFavs.length}</span>
        )}
        <CaretDownIcon
          size={13}
          className={`shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:text-muted-foreground ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        localFavs.length === 0 ? (
          <p className="px-2.5 py-1 text-xs text-muted-foreground/40">
            Star a page to add it here.
          </p>
        ) : (
          <>
            {mounted ? (
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
            ) : (
              visible.map((fav) => {
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
              })
            )}

            {hasMore && (
              <button
                ref={moreRef}
                type="button"
                onClick={openPopup}
                className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-muted-foreground/40 transition-all duration-100 hover:bg-muted/50 hover:text-muted-foreground"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                  <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
                </svg>
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
          className="fixed z-[300] w-64 overflow-hidden rounded-[var(--radius-md)] border border-primary/30 shadow-[var(--shadow-raised)]"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="flex items-center justify-between px-3 py-2.5" style={{ background: "linear-gradient(135deg, #0284c7, #0ea5e9)" }}>
            <span className="text-xs font-semibold text-white">Favorites</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">{localFavs.length} total</span>
          </div>
          <div className="max-h-72 overflow-y-auto bg-white py-1">
            {localFavs.map((fav) => {
              const page = pagesMap[fav.pageId];
              return (
                <Link
                  key={fav.pageId}
                  href={`/app/${workspaceSlug}/${page?.shortId ?? fav.pageId}`}
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-primary/[0.07] hover:text-primary"
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
          <div className="border-t border-border bg-white px-3 py-2">
            <Link
              href={`/app/${workspaceSlug}/library`}
              onClick={() => setPopupOpen(false)}
              className="flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:text-[var(--primary-hover)]"
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
      className="group flex items-center rounded-[var(--radius-md)] hover:bg-muted/50"
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        href={`/app/${workspaceSlug}/${shortId}`}
        {...listeners}
      >
        {icon ? (
          <span className="shrink-0 text-sm leading-none">{icon}</span>
        ) : (
          <svg className="size-3 shrink-0 text-muted-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        )}
        <span className="min-w-0 truncate">{title || "Untitled"}</span>
      </Link>
    </div>
  );
}
