"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare as ChatTextIcon, FileText, MessageCircle, Tag, CornerDownRight,
  Smile as SmileyIcon, Check as CheckIcon, RotateCcw as ArrowCounterClockwiseIcon,
  MoreHorizontal as DotsThreeIcon, Pencil as PencilSimpleIcon, Link as LinkIcon,
  BellOff as BellSlashIcon, Trash2 as TrashIcon, Paperclip,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CommentComposer } from "@/components/editor/comment-composer";
import { EmojiPicker, SimpleDropdown, DropdownItem, DropdownSeparator, ImageAttachment, FileAttachment } from "@/components/editor/comment-card";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { onCommentsChanged, emitCommentsChanged } from "@/lib/comments/comment-events";

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
  editedAt:           string | null;
  content:            Record<string, unknown> | null;
  reactions:          Record<string, string[]>;
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

// The snippet used to only ever show extractText()'s plain-text result, so a
// comment with an attachment silently looked like it lost the attachment —
// it was never rendered here at all, on top of comment-composer.tsx's own
// (now-fixed) data-loss bug. This walks the doc for the first image/file/
// attachment node (the three shapes used across this app's different
// composers) and normalizes it so an actual image thumbnail can render here
// too, matching Notion, instead of just a paperclip icon.
interface FoundAttachment { src: string; name: string; kind: "image" | "file"; }
function extractFirstAttachment(node: Record<string, unknown> | null | undefined): FoundAttachment | null {
  if (!node) return null;
  const type = node.type as string | undefined;
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;
  if (type === "image") {
    const src = attrs.src as string | undefined;
    if (src) return { src, name: (attrs.alt as string) ?? "image", kind: "image" };
  }
  if (type === "file" || type === "attachment") {
    const src = (attrs.src as string | undefined) ?? (attrs.url as string | undefined);
    if (src) {
      const mimeType = attrs.mimeType as string | undefined;
      return { src, name: (attrs.name as string) ?? "file", kind: mimeType?.startsWith("image/") ? "image" : "file" };
    }
  }
  const children = (node.content as Record<string, unknown>[]) ?? [];
  for (const child of children) {
    const found = extractFirstAttachment(child);
    if (found) return found;
  }
  return null;
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

// ---------- Discussion item ----------
//
// Mirrors the same set of actions the inline CommentCard offers (react,
// resolve/reopen, edit-in-place, copy link, mute, delete) so the sidebar
// "All discussions" pane is a real Notion-parity surface, not just a
// read-only jump-to-comment list.

interface DiscussionItemProps {
  thread:        CommentThread;
  pageId:        string;
  workspaceId:   string;
  currentUserId: string;
  isAdmin:       boolean;
  onOpen:        () => void;
  onPatch:       (patch: Partial<CommentThread>) => void;
  onDeleted:     () => void;
}

function DiscussionItem({ thread, pageId, workspaceId, currentUserId, isAdmin, onOpen, onPatch, onDeleted }: DiscussionItemProps) {
  const [isEditing, setIsEditing]     = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<DOMRect | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const isAuthor  = thread.author?.id === currentUserId;
  const reactions = thread.reactions ?? {};
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  async function toggleReaction(emoji: string) {
    const hadThisEmoji = (reactions[emoji] ?? []).includes(currentUserId);
    const next: Record<string, string[]> = {};
    for (const [e, userIds] of Object.entries(reactions)) {
      const filtered = userIds.filter((u) => u !== currentUserId);
      if (filtered.length > 0) next[e] = filtered;
    }
    if (!hadThisEmoji) next[emoji] = [...(next[emoji] ?? []), currentUserId];
    onPatch({ reactions: next });
    const res = await fetch(`/api/comments/${thread.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const data = await res.json() as { reactions: Record<string, string[]> };
      onPatch({ reactions: data.reactions });
    }
  }

  // Optimistic instant update here; emitCommentsChanged only fires once the
  // request has actually persisted so other listeners (topbar badge, the
  // page's own inline comment card) can't refetch mid-flight and read stale
  // pre-persist state (see the same fix in comment-card.tsx).
  async function resolveThread() {
    onPatch({ isResolved: true });
    const res = await fetch(`/api/comments/${thread.id}/resolve`, { method: "POST" });
    if (!res.ok) onPatch({ isResolved: false });
    emitCommentsChanged(pageId);
  }

  async function reopenThread() {
    onPatch({ isResolved: false });
    const res = await fetch(`/api/comments/${thread.id}/reopen`, { method: "POST" });
    if (!res.ok) { onPatch({ isResolved: true }); return; }
    emitCommentsChanged(pageId);
    // Matching Notion — reopening jumps you to the comment's own location
    // (its block, or the page-level thread) instead of leaving you looking
    // at the now-empty spot in the Resolved tab it just disappeared from.
    onOpen();
  }

  async function handleEditSubmit(content: Record<string, unknown>) {
    await fetch(`/api/comments/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    onPatch({ content, editedAt: new Date().toISOString() });
    setIsEditing(false);
    emitCommentsChanged(pageId);
  }

  async function handleDelete() {
    await fetch(`/api/comments/${thread.id}`, { method: "DELETE" });
    onDeleted();
    emitCommentsChanged(pageId);
  }

  const snippet = thread.deletedAt ? "[Comment deleted]" : extractText(thread.content).trim() || "…";
  const attachment = !thread.deletedAt ? extractFirstAttachment(thread.content) : null;
  const kindLabel = thread.blockId
    ? "Comment on a block"
    : thread.propertyId
      ? `${thread.propertyName ?? "Property"}${thread.propertyValueLabel ? `: ${thread.propertyValueLabel}` : ""}`
      : "Page comment";
  const KindIcon = thread.blockId ? MessageCircle : thread.propertyId ? Tag : FileText;

  return (
    <li className="group/discussion relative">
      {!thread.deletedAt && !isEditing && (
        <div className="absolute top-2 right-2 z-10 hidden items-center gap-px rounded-[var(--radius-sm)] border border-border/60 bg-card px-0.5 py-0.5 group-hover/discussion:flex">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEmojiAnchor(e.currentTarget.getBoundingClientRect()); }}
            onMouseEnter={(e) => showTooltip("Add reaction", e)}
            onMouseLeave={hideTooltip}
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          >
            <SmileyIcon size={12} />
          </button>
          {emojiAnchor && (
            <EmojiPicker
              anchor={emojiAnchor}
              onSelect={(emoji) => { void toggleReaction(emoji); }}
              onClose={() => setEmojiAnchor(null)}
            />
          )}
          {thread.isResolved ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void reopenThread(); }}
              onMouseEnter={(e) => showTooltip("Reopen thread", e)}
              onMouseLeave={hideTooltip}
              className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-primary hover:bg-accent transition-colors duration-150"
            >
              <ArrowCounterClockwiseIcon size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void resolveThread(); }}
              onMouseEnter={(e) => showTooltip("Resolve thread", e)}
              onMouseLeave={hideTooltip}
              className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
            >
              <CheckIcon size={12} />
            </button>
          )}
          <SimpleDropdown
            trigger={
              <button
                type="button"
                onMouseEnter={(e) => showTooltip("More options", e)}
                onMouseLeave={hideTooltip}
                className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              >
                <DotsThreeIcon size={13} />
              </button>
            }
          >
            {isAuthor && (
              <DropdownItem icon={<PencilSimpleIcon size={13} />} onClick={() => setIsEditing(true)}>
                Edit
              </DropdownItem>
            )}
            <DropdownItem
              icon={<LinkIcon size={13} />}
              onClick={() => {
                const url = `${window.location.href.split("#")[0]}#comment-${thread.id}`;
                navigator.clipboard.writeText(url);
              }}
            >
              Copy link
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={<BellSlashIcon size={13} />} onClick={() => setIsMuted((v) => !v)}>
              {isMuted ? "Unmute replies" : "Mute replies"}
            </DropdownItem>
            {(isAuthor || isAdmin) && (
              <DropdownItem icon={<TrashIcon size={13} />} danger onClick={() => setPendingDelete(true)}>
                Delete
              </DropdownItem>
            )}
          </SimpleDropdown>
        </div>
      )}

      {isEditing ? (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5">
          <ThreadAvatar name={thread.author?.name} image={thread.author?.image} />
          <div className="min-w-0 flex-1">
            <span className="mb-1 block truncate text-xs font-semibold text-foreground">
              {thread.author?.name ?? "Former Member"}
            </span>
            <CommentComposer
              workspaceId={workspaceId}
              mode="edit"
              initialContent={thread.content ?? undefined}
              autoFocus
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </div>
      ) : (
        // A plain clickable div, not a <button> — the reaction pills below
        // need to be real, independently-clickable <button>s (toggling a
        // reaction, not opening the thread), and a <button> can't legally
        // nest another <button> inside it.
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
          className="flex w-full cursor-pointer flex-col gap-2 rounded-[var(--radius-md)] border border-transparent px-3 py-2.5 text-left transition-colors duration-150 hover:border-border hover:bg-accent"
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
                  {thread.editedAt && !thread.deletedAt ? " (edited)" : ""}
                </span>
              </div>
              <div className="mt-0.5 flex items-start gap-1">
                {attachment?.kind === "file" && <Paperclip size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />}
                <p className={`line-clamp-2 min-w-0 flex-1 text-xs leading-relaxed ${thread.deletedAt ? "italic text-muted-foreground/50" : "text-foreground/75"}`}>
                  {snippet}
                </p>
              </div>
              {attachment && (
                // stopPropagation — this whole row is one clickable "open
                // thread" surface; without it, clicking the thumbnail (or its
                // own lightbox trigger) would also navigate away instead of
                // just previewing the image, same fix as the reaction pills.
                <div onClick={(e) => e.stopPropagation()}>
                  {attachment.kind === "image" ? (
                    <ImageAttachment src={attachment.src} alt={attachment.name} />
                  ) : (
                    <FileAttachment src={attachment.src} name={attachment.name} />
                  )}
                </div>
              )}
              {Object.keys(reactions).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(reactions).map(([emoji, userIds]) => {
                    const iMine = userIds.includes(currentUserId);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void toggleReaction(emoji); }}
                        className={`flex items-center gap-0.5 rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[10px] transition-colors duration-150 ${
                          iMine
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/50 text-foreground/70 hover:border-border hover:bg-accent"
                        }`}
                      >
                        {emoji}
                        <span className="font-semibold">{userIds.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {thread.replies.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <CornerDownRight size={10} className="shrink-0" />
                  {thread.replies.length} repl{thread.replies.length === 1 ? "y" : "ies"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        title="Delete this comment?"
        description="The entire thread and all replies will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </li>
  );
}

// Topbar "Comments" button for database entry pages — opens a side panel
// listing every comment on the page (page-level, block-level, and property
// comments together, Notion-style "All discussions" pane). Each item
// supports the same actions as the inline comment card (react, resolve/
// reopen, edit-in-place, copy link, mute, delete); clicking the item body
// itself still jumps to wherever it lives on the page.
export function PageCommentButton({ pageId, workspaceId, currentUserId, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  // Two loads can overlap (e.g. opening the sheet right as an emitCommentsChanged
  // fires) — without a sequence guard, an older request that happens to resolve
  // last would overwrite newer state with stale data. requestId tracks which
  // call is the most recent so only its response is applied.
  const requestId = useRef(0);

  function load(showSpinner: boolean) {
    if (showSpinner) setLoading(true);
    const thisRequest = ++requestId.current;
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || thisRequest !== requestId.current) return;
        const all = data.comments as CommentThread[];
        setThreads(all);
        setUnresolvedCount(all.filter((t) => !t.isResolved && !t.deletedAt).length);
      })
      .catch(() => {})
      .finally(() => { if (thisRequest === requestId.current) setLoading(false); });
  }

  useEffect(() => {
    load(false);
  }, [pageId]);

  // Any comment mutation anywhere on this page (block card, page-level
  // thread, property popover, or this panel's own items) re-fetches here too
  // — keeps the badge count and thread list live instead of only refreshing
  // on next mount/open.
  useEffect(() => onCommentsChanged(pageId, () => load(false)), [pageId]);

  // Auto-open on arrival — set by "View all in full page" links elsewhere
  // (e.g. the table row's comment popover, once there are more comments than
  // that small popup can comfortably show), so landing here immediately
  // reveals the full thread list instead of requiring an extra click.
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("comments") !== "1") return;
    setOpen(true);
    load(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("comments");
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function patchThread(id: string, patch: Partial<CommentThread>) {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeThread(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  }

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
      // The page-level section may not be rendered yet (page-client.tsx hides
      // it until "Add comment" is used or a thread already exists) — ask it
      // to reveal itself first rather than scrolling to an element that may
      // not exist in the DOM.
      window.dispatchEvent(new CustomEvent("workflik:show-page-comments", { detail: { pageId } }));
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
  const { tooltip: triggerTooltip, showTooltip: showTriggerTooltip, hideTooltip: hideTriggerTooltip } = useHoverTooltip();

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) load(true); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comments"
        onMouseEnter={(e) => showTriggerTooltip("Comments", e)}
        onMouseLeave={hideTriggerTooltip}
        className="relative flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
      >
        <ChatTextIcon size={15} />
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular-nums text-primary-foreground">
            {unresolvedCount}
          </span>
        )}
      </button>

      {triggerTooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={triggerTooltip.rect} label={triggerTooltip.label} />,
        document.body,
      )}

      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-sm"
        // Radix listens for Escape at the document level in the capture
        // phase, so it would otherwise close this whole panel before an
        // inline comment composer's own Escape handler (cancel-this-edit)
        // ever gets a chance to run. Let the composer handle it instead.
        onEscapeKeyDown={(e) => {
          if ((e.target as HTMLElement)?.closest?.('[contenteditable="true"]')) e.preventDefault();
        }}
      >
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
                    {group.map((thread) => (
                      <DiscussionItem
                        key={thread.id}
                        thread={thread}
                        pageId={pageId}
                        workspaceId={workspaceId}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onOpen={() => openThread(thread)}
                        onPatch={(patch) => patchThread(thread.id, patch)}
                        onDeleted={() => removeThread(thread.id)}
                      />
                    ))}
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
