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
import { CaretDown, CaretRight, DotsThree, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

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

  if (tree.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-2xs text-sidebar-foreground/50">
        {filter ? "No pages match" : "No pages yet"}
      </p>
    );
  }

  return (
    <Level
      depth={0}
      nodes={tree}
      onDragEnd={handleDragEnd}
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
}: {
  node: TreeNode;
  depth: number;
  workspaceSlug: string;
  workspaceId: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (
    event: DragEndEvent,
    siblings: TreeNode[],
    parentId: string | null
  ) => void;
}) {
  const [open, setOpen] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const hasChildren = node.children.length > 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group flex items-center gap-0.5 rounded-md py-0.5 transition-colors hover:bg-sidebar-accent">
        {/* Expand/collapse toggle */}
        <button
          className="flex size-5 shrink-0 items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
          type="button"
        >
          {hasChildren ? (
            open ? (
              <CaretDown size={11} />
            ) : (
              <CaretRight size={11} />
            )
          ) : null}
        </button>

        {/* Drag handle + page link */}
        <Link
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-0.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
          href={`/${workspaceSlug}/${node.shortId}`}
          {...listeners}
        >
          {node.icon && (
            <span className="shrink-0 text-sm leading-none">{node.icon}</span>
          )}
          <span className="min-w-0 truncate">{node.title || "Untitled"}</span>
        </Link>

        {/* Hover actions */}
        <div className="hidden shrink-0 items-center gap-0.5 pr-1 group-hover:flex">
          <Link
            className="flex size-5 items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground"
            href={`/${workspaceSlug}/new?parent=${node.id}`}
            title="Add subpage"
          >
            <Plus size={12} weight="bold" />
          </Link>
          <button
            className="flex size-5 items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground"
            tabIndex={-1}
            title="Options"
            type="button"
          >
            <DotsThree size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <Level
          depth={depth + 1}
          nodes={node.children}
          onDragEnd={onDragEnd}
          parentId={node.id}
          sensors={sensors}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
        />
      )}
    </div>
  );
}
