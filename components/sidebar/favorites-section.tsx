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
import { ChevronDown, Star, FileText, MoreHorizontal, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageIcon } from "@/components/pages/page-icon";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

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

  useScrollLockWhileOpen(popupOpen, (target) =>
    !!popupRef.current?.contains(target) || !!moreRef.current?.contains(target));

  function openPopup() {
    if (moreRef.current) {
      const r = moreRef.current.getBoundingClientRect();
      const POPUP_MAX_H = 360;
      const POPUP_W = 288;
      const top = Math.max(8, Math.min(r.top, window.innerHeight - POPUP_MAX_H - 8));
      let left = r.right + 8;
      if (left + POPUP_W > window.innerWidth - 8) left = Math.max(8, r.left - 8 - POPUP_W);
      setPopupPos({ top, left });
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
        className="group mb-0.5 flex w-full cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Star size={15} className="shrink-0 text-muted-foreground group-hover:text-sidebar-accent-foreground" />
        <span className="text-left">Favorites</span>
        {localFavs.length > 0 && (
          <span className="text-xs text-muted-foreground">{localFavs.length}</span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground/70 transition-transform duration-150 group-hover:text-sidebar-accent-foreground ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {/* Grid-rows trick animates height without measuring it in JS — the
          row track tweens between 0fr/1fr while overflow-hidden clips the
          content, giving a smooth expand/collapse instead of an instant
          mount/unmount. Content stays mounted (just visually clipped) so the
          transition has something to animate between. */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {localFavs.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-muted-foreground/70">
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
                  className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <MoreHorizontal size={12} />
                  {localFavs.length - VISIBLE_MAX} more
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Popup flyout — portaled to document.body, making it a *sibling* of
          the sidebar's own wrapper (md:z-[550] in workspace-shell.tsx), not a
          descendant of it. z-[560] keeps it above that wrapper; anything
          lower renders half-hidden behind the sidebar wherever they overlap. */}
      {popupOpen && popupPos && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[560] w-72 overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-popover"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#0369A1] to-[#38BDF8] px-3 py-3">
            <span className="text-sm font-semibold text-white">Favorites</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">{localFavs.length}</span>
          </div>
          {/* List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {localFavs.map((fav) => {
              const page = pagesMap[fav.pageId];
              return (
                <Link
                  key={fav.pageId}
                  href={`/app/${workspaceSlug}/${page?.shortId ?? fav.pageId}`}
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                >
                  {page?.icon ? (
                    <PageIcon icon={page.icon} size={13} />
                  ) : (
                    <FileText size={13} className="shrink-0 text-muted-foreground/70" />
                  )}
                  <span className="min-w-0 truncate">{page?.title || "Untitled"}</span>
                </Link>
              );
            })}
          </div>
          {/* Footer */}
          <div className="mx-1 h-px bg-border/60" />
          <div className="px-3 py-2">
            <Link
              href={`/app/${workspaceSlug}/library`}
              onClick={() => setPopupOpen(false)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <BookOpen size={13} />
              Browse in Library
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
      className="group flex items-center rounded-[var(--radius-md)] transition-colors duration-150 hover:bg-sidebar-accent"
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-accent-foreground"
        href={`/app/${workspaceSlug}/${shortId}`}
        {...listeners}
      >
        {icon ? (
          <PageIcon icon={icon} size={13} />
        ) : (
          <FileText size={12} className="shrink-0 text-muted-foreground/60" />
        )}
        <span className="min-w-0 truncate">{title || "Untitled"}</span>
      </Link>
    </div>
  );
}
