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
import { CaretDownIcon, CaretRightIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PageItem = {
  id: string;
  shortId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  orderIndex: number;
  kind: string;
  isPrivate: boolean;
};

type TreeNode = PageItem & { children: TreeNode[] };

type Props = {
  pages: PageItem[];
  filter: string;
  loading?: boolean;
  workspaceSlug: string;
  workspaceId: string;
  onPagesChange: (pages: PageItem[]) => void;
};

function buildTree(pages: PageItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const p of pages) {
    map.set(p.id, { ...p, children: [] });
  }

  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sort(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.orderIndex - b.orderIndex);
    for (const n of nodes) {
      sort(n.children);
    }
  }
  sort(roots);
  return roots;
}

function matchesFilter(node: TreeNode, lower: string): boolean {
  if (node.title.toLowerCase().includes(lower)) {
    return true;
  }
  return node.children.some((c) => matchesFilter(c, lower));
}

function applyFilter(nodes: TreeNode[], lower: string): TreeNode[] {
  if (!lower) {
    return nodes;
  }
  return nodes.flatMap((n) => {
    if (!matchesFilter(n, lower)) {
      return [];
    }
    return [{ ...n, children: applyFilter(n.children, lower) }];
  });
}

export function PageTree({
  pages,
  filter,
  loading = false,
  workspaceSlug,
  workspaceId,
  onPagesChange,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lower = filter.toLowerCase();
  const tree = applyFilter(buildTree(pages), lower);

  function handleDragEnd(
    event: DragEndEvent,
    siblings: TreeNode[],
    parentId: string | null
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIdx = siblings.findIndex((n) => n.id === active.id);
    const newIdx = siblings.findIndex((n) => n.id === over.id);
    if (oldIdx === -1 || newIdx === -1) {
      return;
    }

    const reordered = arrayMove(siblings, oldIdx, newIdx);

    // Optimistically update local state
    const updated = pages.map((p) => {
      const idx = reordered.findIndex((r) => r.id === p.id);
      if (idx !== -1) {
        return { ...p, orderIndex: idx };
      }
      return p;
    });
    onPagesChange(updated);

    // Persist the moved page's new position
    fetch(`/api/pages/${active.id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, orderIndex: newIdx }),
    }).catch(() => {
      onPagesChange(pages); // revert on error
    });
  }

  if (loading) {
    return (
      <div className="space-y-1 px-1 py-2">
        {[80, 65, 90].map((w) => (
          <div key={w} className="flex items-center gap-1.5 rounded-md px-1 py-1">
            <div className="size-3.5 shrink-0 rounded bg-sidebar-foreground/10 animate-pulse" />
            <div className="h-2.5 rounded bg-sidebar-foreground/10 animate-pulse" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-2xs text-sidebar-foreground/40">
        {filter ? "No pages match" : "No pages yet"}
      </p>
    );
  }

  return (
    <Level
      depth={0}
      nodes={tree}
      onDragEnd={handleDragEnd}
      onPagesChange={onPagesChange}
      pages={pages}
      parentId={null}
      sensors={sensors}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
    />
  );
}

function Level({
  nodes,
  depth,
  workspaceSlug,
  workspaceId,
  sensors,
  onDragEnd,
  onPagesChange,
  pages,
  parentId,
}: {
  nodes: TreeNode[];
  depth: number;
  workspaceSlug: string;
  workspaceId: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (
    event: DragEndEvent,
    siblings: TreeNode[],
    parentId: string | null
  ) => void;
  onPagesChange: (pages: PageItem[]) => void;
  pages: PageItem[];
  parentId: string | null;
}) {
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(e) => onDragEnd(e, nodes, parentId)}
      sensors={sensors}
    >
      <SortableContext
        items={nodes.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ paddingLeft: depth > 0 ? depth * 12 : 0 }}>
          {nodes.map((node) => (
            <PageTreeNode
              depth={depth}
              key={node.id}
              node={node}
              onDragEnd={onDragEnd}
              onPagesChange={onPagesChange}
              pages={pages}
              sensors={sensors}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function PageTreeNode({
  node,
  depth,
  workspaceSlug,
  workspaceId,
  sensors,
  onDragEnd,
  onPagesChange,
  pages,
}: {
  node: TreeNode;
  depth: number;
  workspaceSlug: string;
  workspaceId: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent, siblings: TreeNode[], parentId: string | null) => void;
  onPagesChange: (pages: PageItem[]) => void;
  pages: PageItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : undefined };
  const hasChildren = node.children.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onScroll() { setMenuOpen(false); }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpen]);

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`Move "${node.title || "Untitled"}" to Trash?`)) return;
    await fetch(`/api/pages/${node.id}`, { method: "DELETE" });
    onPagesChange(pages.filter((p) => p.id !== node.id));
    router.refresh();
  }

  async function handleDuplicate() {
    setMenuOpen(false);
    const res = await fetch(`/api/pages/${node.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      const refetch = await fetch(`/api/workspaces/${workspaceId}/pages/tree`);
      if (refetch.ok) onPagesChange(await refetch.json());
      router.push(`/app/${workspaceSlug}/${dup.shortId}`);
    }
  }

  async function handleCopyLink() {
    setMenuOpen(false);
    await navigator.clipboard.writeText(`${window.location.origin}/app/${workspaceSlug}/${node.shortId}`);
  }

  const menuItem = "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground";

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group relative flex items-center gap-0.5 rounded-md py-0.5 transition-colors hover:bg-sidebar-accent">
        {/* Expand/collapse */}
        <button
          className="flex size-5 shrink-0 items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
          type="button"
        >
          {hasChildren ? (open ? <CaretDownIcon size={11} /> : <CaretRightIcon size={11} />) : null}
        </button>

        {/* Page link */}
        <Link
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-0.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
          href={`/app/${workspaceSlug}/${node.shortId}`}
          {...listeners}
        >
          {node.icon ? (
            <span className="shrink-0 text-sm leading-none">{node.icon}</span>
          ) : (
            <svg className="size-3.5 shrink-0 text-sidebar-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          )}
          <span className="min-w-0 truncate">{node.title || "Untitled"}</span>
        </Link>

        {/* Hover actions */}
        <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            className="flex size-5 items-center justify-center rounded text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            href={`/app/${workspaceSlug}/new?parent=${node.id}`}
            title="Add subpage"
          >
            <PlusIcon size={12} weight="bold" />
          </Link>
          <button
            ref={btnRef}
            className="flex size-5 items-center justify-center rounded text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={(e) => {
              e.stopPropagation();
              const rect = btnRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ x: rect.right + 4, y: rect.top });
              setMenuOpen((v) => !v);
            }}
            tabIndex={-1}
            title="Options"
            type="button"
          >
            <DotsThreeIcon size={14} weight="bold" />
          </button>
        </div>

        {/* Context menu — fixed so it escapes the sidebar's overflow clip */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed z-[200] min-w-[168px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <div className="py-1">
              <Link
                className={menuItem}
                href={`/app/${workspaceSlug}/${node.shortId}`}
                onClick={() => setMenuOpen(false)}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open
              </Link>
              <Link
                className={menuItem}
                href={`/app/${workspaceSlug}/new?parent=${node.id}`}
                onClick={() => setMenuOpen(false)}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add subpage
              </Link>
              <button className={menuItem} onClick={handleDuplicate} type="button">
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Duplicate
              </button>
              <button className={menuItem} onClick={handleCopyLink} type="button">
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                Copy link
              </button>
              <div className="my-1 border-t border-border" />
              <button className={`${menuItem} text-red-500 hover:bg-red-50 hover:text-red-600`} onClick={handleDelete} type="button">
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Move to Trash
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <Level
          depth={depth + 1}
          nodes={node.children}
          onDragEnd={onDragEnd}
          onPagesChange={onPagesChange}
          pages={pages}
          parentId={node.id}
          sensors={sensors}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
        />
      )}
    </div>
  );
}
