"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare as ChatTextIcon, FileText, MessageCircle, Tag, CornerDownRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { onCommentsChanged } from "@/lib/comments/comment-events";

interface CommentAuthor {
  id:    string | null;
  name:  string | null;
  image: string | null;
}

interface CommentReply {
  id:        string;
  createdAt: string;
}

interface CommentThread {
  id:                 string;
  blockId:            string | null;
  propertyId:         string | null;
  propertyName:       string | null;
  propertyValueLabel: string | null;
  isResolved:         boolean;
  deletedAt:          string | null;
  content:            Record<string, unknown> | null;
  createdAt:          string;
  author:             CommentAuthor | null;
  replies:            CommentReply[];
}

interface Props {
  pageId:        string;
  workspaceId:   string;
  currentUserId: string;
  isAdmin:       boolean;
}

function extractText(node: Record<string, unknown> | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return String(node.text ?? "");
  const children = (node.content as Record<string, unknown>[]) ?? [];
  return children.map(extractText).join("");
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Groups threads the way Notion's comment pane does — most recently active
// thread first, bucketed under "Today" / "Yesterday" / an absolute date.
function dateBucket(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function lastActivity(thread: CommentThread): number {
  const times = [new Date(thread.createdAt).getTime(), ...thread.replies.map((r) => new Date(r.createdAt).getTime())];
  return Math.max(...times);
}

function ThreadAvatar({ name, image }: { name?: string | null; image?: string | null }) {
  if (image) {
    return <img src={image} alt={name ?? ""} className="size-7 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground select-none">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// Topbar "Comments" button for database entry pages — opens a side panel
// listing every comment on the page (page-level, block-level, and property
// comments together, Notion-style "All discussions" pane), instead of just
// scrolling to the page-level thread. Clicking a comment jumps to wherever it
// lives on the page — the block, the property popover, or the page-level
// thread at the bottom — and opens the same reply box that's already there.
export function PageCommentButton({ pageId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);
  const [tab, setTab] = useState<"open" | "resolved">("open");

  function load(showSpinner: boolean) {
    if (showSpinner) setLoading(true);
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const all = data.comments as CommentThread[];
        setThreads(all);
        setUnresolvedCount(all.filter((t) => !t.isResolved && !t.deletedAt).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(false);
  }, [pageId]);

  // Any comment mutation anywhere on this page (block card, page-level
  // thread, property popover) re-fetches here too — keeps the badge count
  // and, if the panel is already open, the thread list itself live instead
  // of only refreshing on next mount/open.
  useEffect(() => onCommentsChanged(pageId, () => load(false)), [pageId]);

  function openThread(thread: CommentThread) {
    setOpen(false);
    if (thread.blockId) {
      window.dispatchEvent(
        new CustomEvent("workflik:jump-to-page-comment", { detail: { pageId, blockId: thread.blockId } })
      );
    } else if (thread.propertyId) {
      window.dispatchEvent(
        new CustomEvent("workflik:jump-to-page-comment", { detail: { pageId, propertyId: thread.propertyId } })
      );
    } else {
      document.getElementById("page-comments-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Threads with no content left and no replies have nothing left to show or
  // jump to — everything else (including deleted-but-replied-to threads,
  // which still render "[Comment deleted]" the same way the block/page
  // comment threads themselves do) stays visible.
  const grouped = useMemo(() => {
    const visible = threads
      .filter((t) => !(t.deletedAt && t.replies.length === 0))
      .filter((t) => (tab === "open" ? !t.isResolved : t.isResolved));
    const sorted = [...visible].sort((a, b) => lastActivity(b) - lastActivity(a));

    const buckets = new Map<string, CommentThread[]>();
    for (const t of sorted) {
      const key = dateBucket(new Date(lastActivity(t)).toISOString());
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    }
    return [...buckets.entries()];
  }, [threads, tab]);

  const openCount = threads.filter((t) => !t.isResolved && !t.deletedAt).length;
  const resolvedCount = threads.filter((t) => t.isResolved && !t.deletedAt).length;

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) load(true); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
      >
        <ChatTextIcon size={14} />
        Comments
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
            {unresolvedCount}
          </span>
        )}
      </button>

      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="gap-3 border-b border-border px-5 pb-4 pt-5">
          <SheetTitle className="text-base">Comments</SheetTitle>
          <div className="inline-flex w-fit items-center gap-0.5 rounded-[var(--radius-sm)] bg-muted p-0.5">
            {(["open", "resolved"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  tab === t
                    ? "border-border bg-card text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "open" ? "Open" : "Resolved"}
                <span className="tabular-nums text-[11px] text-muted-foreground/70">
                  {t === "open" ? openCount : resolvedCount}
                </span>
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted/50">
                <MessageCircle size={22} className="text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80">
                  {tab === "open" ? "No open comments" : "No resolved comments"}
                </p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  Comments on this page will show up here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map(([label, group]) => (
                <div key={label}>
                  <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">
                    {label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.map((thread) => {
                      const snippet = thread.deletedAt ? "[Comment deleted]" : extractText(thread.content).trim() || "…";
                      const kindLabel = thread.blockId
                        ? "Comment on a block"
                        : thread.propertyId
                          ? `${thread.propertyName ?? "Property"}${thread.propertyValueLabel ? `: ${thread.propertyValueLabel}` : ""}`
                          : "Page comment";
                      const KindIcon = thread.blockId ? MessageCircle : thread.propertyId ? Tag : FileText;
                      return (
                        <li key={thread.id}>
                          <button
                            type="button"
                            onClick={() => openThread(thread)}
                            className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] border border-transparent px-3 py-2.5 text-left transition-colors duration-150 hover:border-border hover:bg-accent"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex min-w-0 items-center gap-1 rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80">
                                <KindIcon size={10} className="shrink-0" />
                                <span className="truncate">{kindLabel}</span>
                              </span>
                              {thread.isResolved && !thread.deletedAt && (
                                <span className="shrink-0 rounded-[var(--radius-xs)] bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-2.5">
                              <ThreadAvatar name={thread.author?.name} image={thread.author?.image} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="truncate text-xs font-semibold text-foreground">
                                    {thread.author?.name ?? "Former Member"}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-muted-foreground/60">
                                    {timeAgo(thread.createdAt)}
                                  </span>
                                </div>
                                <p className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${thread.deletedAt ? "italic text-muted-foreground/50" : "text-foreground/75"}`}>
                                  {snippet}
                                </p>
                                {thread.replies.length > 0 && (
                                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                    <CornerDownRight size={10} className="shrink-0" />
                                    {thread.replies.length} repl{thread.replies.length === 1 ? "y" : "ies"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
