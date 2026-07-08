"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
 Smile as SmileyIcon, Check as CheckIcon, RotateCcw as ArrowCounterClockwiseIcon,
 MoreHorizontal as DotsThreeIcon, MessageSquare as ChatTextIcon, X as XIcon,
 Mail as EnvelopeIcon, Pencil as PencilSimpleIcon, Link as LinkIcon,
 BellOff as BellSlashIcon, Trash2 as TrashIcon, Type as CursorTextIcon, MessageCircle as ChatDotsIcon,
 Paperclip,
} from "lucide-react";
import { CommentComposer } from "@/components/editor/comment-composer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

// ---------- Types ----------

interface CommentAuthor {
 id:  string | null;
 name: string | null;
 image: string | null;
}

interface CommentReply {
 id:     string;
 blockId:  string | null;
 parentId:  string | null;
 isResolved: boolean;
 isOrphaned: boolean;
 content:  Record<string, unknown> | null;
 createdAt: string;
 editedAt:  string | null;
 deletedAt: string | null;
 author:   CommentAuthor | null;
}

interface CommentThread {
 id:      string;
 blockId:   string | null;
 parentId:   string | null;
 threadNumber: number | null;
 anchorStart: number | null;
 anchorEnd:  number | null;
 isResolved:  boolean;
 isOrphaned:  boolean;
 content:   Record<string, unknown> | null;
 reactions:  Record<string, string[]>;
 // Set when this thread was opened from a database property cell (e.g. the
 // "Category" column) rather than the whole page — these are shown in their
 // own property-scoped popover (CellCommentPopover), never in this card's
 // page-level/block-level lists.
 propertyId:  string | null;
 createdAt:  string;
 editedAt:   string | null;
 deletedAt:  string | null;
 author:    CommentAuthor | null;
 replies:   CommentReply[];
}

interface CommentsData {
 comments:    CommentThread[];
 totalCount:   number;
 unresolvedCount: number;
}

// ---------- Helpers ----------

function formatTime(iso: string): string {
 const date = new Date(iso);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const mins = Math.floor(diffMs / 60_000);
 if (mins < 1) return "just now";
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 const days = Math.floor(hrs / 24);
 if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
 const sameYear = date.getFullYear() === now.getFullYear();
 return date.toLocaleDateString("en-US", {
  month: "short", day: "numeric",
  ...(sameYear ? {} : { year: "numeric" }),
 });
}

// ---------- Image Lightbox ----------

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
 useEffect(() => {
  function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
 }, [onClose]);

 if (typeof document === "undefined") return null;
 return createPortal(
  <div
   className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
   onClick={onClose}
  >
   <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
    <img
     src={src}
     alt={alt}
     className="max-w-[90vw] max-h-[90vh] rounded-[var(--radius-md)] object-contain"
    />
    <button
     type="button"
     onClick={onClose}
     className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card border border-border text-foreground transition-colors duration-150 hover:bg-accent"
    >
     <XIcon size={14} />
    </button>
   </div>
  </div>,
  document.body,
 );
}

function ImageAttachment({ src, alt }: { src: string; alt: string }) {
 const [open, setOpen] = useState(false);
 return (
  <>
   <button
    type="button"
    onClick={() => setOpen(true)}
    className="mt-1.5 block focus:outline-none rounded-[var(--radius-sm)]"
    title="Click to enlarge"
   >
    <img
     src={src}
     alt={alt}
     className="h-14 w-auto max-w-[120px] rounded-[var(--radius-sm)] border border-border object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
    />
   </button>
   {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
  </>
 );
}

function FileAttachment({ src, name }: { src: string; name: string }) {
 function handleClick() {
  if (src.startsWith("data:")) {
   fetch(src)
    .then((r) => r.blob())
    .then((blob) => {
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.target = "_blank";
     a.rel = "noopener noreferrer";
     a.click();
     setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  } else {
   window.open(src, "_blank", "noopener,noreferrer");
  }
 }

 return (
  <button
   type="button"
   onClick={handleClick}
   title={`Open ${name}`}
   className="group mt-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted px-3 py-2 transition-colors duration-150 hover:bg-accent"
  >
   <Paperclip size={13} className="shrink-0 text-muted-foreground" />
   <span className="max-w-[180px] truncate text-xs text-foreground/80 group-hover:text-foreground">
    {name}
   </span>
  </button>
 );
}

// ---------- Content renderer ----------

function renderContent(content: Record<string, unknown> | null): React.ReactNode {
 if (!content) return null;
 const parts: React.ReactNode[] = [];
 let key = 0;

 function walk(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;

  if (n.type === "text" && typeof n.text === "string") {
   parts.push(<span key={key++}>{n.text}</span>);
  }

  if (n.type === "file") {
   const attrs = n.attrs as { src?: string; name?: string } | undefined;
   if (attrs?.src && attrs?.name) {
    parts.push(<FileAttachment key={key++} src={attrs.src} name={attrs.name} />);
   }
  }

  if (n.type === "image") {
   const attrs = n.attrs as { src?: string; alt?: string } | undefined;
   if (attrs?.src) {
    const isImage = attrs.src.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(attrs.src);
    if (isImage) {
     parts.push(<ImageAttachment key={key++} src={attrs.src} alt={attrs.alt ?? "attachment"} />);
    } else {
     parts.push(<FileAttachment key={key++} src={attrs.src} name={attrs.alt ?? "attachment"} />);
    }
   }
  }

  if (n.type === "mention") {
   const attrs = n.attrs as { mentionType?: string; label?: string } | undefined;
   if (attrs?.label) {
    if (attrs.mentionType === "user") {
     parts.push(
      <span key={key++} className="text-primary font-medium bg-primary/5 rounded-[var(--radius-xs)] px-0.5 mx-px">
       @{attrs.label}
      </span>
     );
    } else if (attrs.mentionType === "page") {
     parts.push(
      <span key={key++} className="text-foreground/80 underline decoration-dotted cursor-pointer">
       📄 {attrs.label}
      </span>
     );
    } else {
     parts.push(
      <span key={key++} className="text-primary font-medium">
       @{attrs.label}
      </span>
     );
    }
   }
  }

  if (Array.isArray(n.content)) n.content.forEach(walk);
 }

 walk(content);
 return <>{parts}</>;
}

function UserAvatar({ name, image, size = 24 }: { name?: string | null; image?: string | null; size?: number }) {
 const initial = name?.[0]?.toUpperCase() ?? "?";
 const px = `${size}px`;
 if (image) {
  return <img src={image} alt={name ?? ""} style={{ width: px, height: px }} className="rounded-full object-cover flex-shrink-0" />;
 }
 return (
  <div
   style={{ width: px, height: px, fontSize: size <= 24 ? "11px" : "13px" }}
   className="rounded-full bg-primary flex items-center justify-center font-semibold text-primary-foreground flex-shrink-0 select-none"
  >
   {initial}
  </div>
 );
}

// ---------- Emoji Picker ----------

const EMOJI_LIST = [
 "👍","👎","❤️","😄","😮","😢","😡","🎉",
 "🚀","👀","🔥","✅","💯","🙏","💪","🤔",
 "💡","⚡","🎯","✨","🎊","😂","🫡","🫶",
];

function EmojiPicker({
 anchor,
 onSelect,
 onClose,
}: {
 anchor: DOMRect;
 onSelect: (e: string) => void;
 onClose: () => void;
}) {
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
  function handler(e: MouseEvent) {
   if (ref.current && !ref.current.contains(e.target as Node)) onClose();
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [onClose]);

 useScrollLockWhileOpen(true, (target) => !!ref.current?.contains(target));

 if (typeof document === "undefined") return null;

 // Position below the button, aligned to its right edge, clamped to viewport
 const pickerW = 186;
 const left = Math.max(8, Math.min(anchor.right - pickerW, window.innerWidth - pickerW - 8));
 const top = anchor.bottom + 6;

 return createPortal(
  <div
   ref={ref}
   data-comment-exempt     // tells the card's outside-click handler to ignore this portal
   style={{ position: "fixed", top, left, zIndex: 9999 }}
   className="bg-card border border-border rounded-[var(--radius-md)] p-2"
  >
   <div className="grid grid-cols-6 gap-0.5">
    {EMOJI_LIST.map((emoji) => (
     <button
      key={emoji}
      type="button"
      onClick={() => { onSelect(emoji); onClose(); }}
      className="text-lg rounded-[var(--radius-sm)] hover:bg-accent p-1.5 transition-colors duration-150 leading-none"
     >
      {emoji}
     </button>
    ))}
   </div>
  </div>,
  document.body,
 );
}

// ---------- Simple Dropdown ----------

function SimpleDropdown({ trigger, children, onClose }: { trigger: React.ReactNode; children: React.ReactNode; onClose?: () => void }) {
 const [open, setOpen] = useState(false);
 const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
 const triggerRef = useRef<HTMLDivElement>(null);
 const menuRef = useRef<HTMLDivElement>(null);

 function close() { setOpen(false); onClose?.(); }

 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   if (menuRef.current?.contains(e.target as Node)) return;
   if (triggerRef.current?.contains(e.target as Node)) return;
   close();
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

 useScrollLockWhileOpen(open, (target) =>
  !!menuRef.current?.contains(target) || !!triggerRef.current?.contains(target));

 function handleOpen() {
  const r = triggerRef.current?.getBoundingClientRect();
  if (!open && r) setMenuRect(r);
  setOpen((v) => !v);
 }

 return (
  <div className="relative">
   <div ref={triggerRef} className="cursor-pointer" onClick={handleOpen}>{trigger}</div>
   {open && menuRect && typeof document !== "undefined" && createPortal(
    <div
     ref={menuRef}
     data-comment-exempt
     style={{ position: "fixed", top: menuRect.bottom + 4, right: window.innerWidth - menuRect.right, zIndex: 9999 }}
     className="w-[188px] rounded-[var(--radius-sm)] border border-border bg-card py-1"
    >
     {/* Pass close fn via context-like prop-drilling trick: clone children with close */}
     {React.Children.map(children, (child) =>
      React.isValidElement(child) && child.type !== React.Fragment
       ? React.cloneElement(child as React.ReactElement<{ _close?: () => void }>, { _close: close })
       : child
     )}
    </div>,
    document.body
   )}
  </div>
 );
}

function DropdownItem({
 children, onClick, danger, icon, _close,
}: {
 children: React.ReactNode;
 onClick?: () => void;
 danger?: boolean;
 icon?: React.ReactNode;
 _close?: () => void;
}) {
 return (
  <button
   type="button"
   onClick={() => { onClick?.(); _close?.(); }}
   className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors duration-150 ${
    danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"
   }`}
  >
   {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
   {children}
  </button>
 );
}

function DropdownSeparator() {
 return <div className="my-1 border-t border-border/40" />;
}

// ---------- CommentCard ----------

interface CommentCardProps {
 pageId:    string;
 workspaceId:  string;
 blockId:    string | null;
 anchorStart?: number | null;
 anchorEnd?:  number | null;
 currentUserId: string;
 isAdmin:    boolean;
 onClose:    () => void;
 variant?:   "floating" | "inline";
}

export function CommentCard({
 pageId,
 workspaceId,
 blockId,
 anchorStart,
 anchorEnd,
 currentUserId,
 isAdmin,
 onClose,
 variant = "floating",
}: CommentCardProps) {
 const cardRef = useRef<HTMLDivElement>(null);
 const [data, setData]       = useState<CommentsData | null>(null);
 const [loading, setLoading]    = useState(true);
 const [showResolved, setShowResolved] = useState(false);

 const loadComments = useCallback(async () => {
  setLoading(true);
  try {
   const res = await fetch(`/api/pages/${pageId}/comments`);
   if (res.ok) setData(await res.json());
  } finally {
   setLoading(false);
  }
 }, [pageId]);

 // Re-fetch when mounted OR when switching to a different block (card stays open)
 useEffect(() => {
  setData(null);
  loadComments();
 }, [blockId, loadComments]);

 // Close on click outside (floating only) — but NOT when clicking inside an exempt portal
 useEffect(() => {
  if (variant !== "floating") return;
  function handler(e: MouseEvent) {
   const target = e.target as HTMLElement;
   if (cardRef.current?.contains(target)) return;
   if (target.closest("[data-comment-exempt]")) return;
   onClose();
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [onClose, variant]);

 // Close on Escape (floating only)
 useEffect(() => {
  if (variant !== "floating") return;
  function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
 }, [onClose, variant]);

 // Page-level threads (blockId === null) exclude property-scoped comments —
 // those belong to CellCommentPopover / the property row, not this card.
 const threads = (data?.comments ?? []).filter((t) =>
  blockId ? t.blockId === blockId : (!t.blockId && !t.propertyId)
 );
 const nonOrphaned = threads.filter((t) => !t.isOrphaned);
 const orphaned  = threads.filter((t) => t.isOrphaned);
 const resolvedCount = nonOrphaned.filter((t) => t.isResolved && !t.deletedAt).length;

 // Show resolved threads only when toggled on
 const activeVisible = nonOrphaned.filter((t) => !t.isResolved || showResolved);

 // Count only for this block/context, not the whole page
 const unresolvedCount = threads.filter((t) => !t.isResolved && !t.deletedAt).length;

 async function createComment(content: Record<string, unknown>) {
  await fetch(`/api/pages/${pageId}/comments`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({
    blockId:   blockId ?? null,
    anchorStart: anchorStart ?? null,
    anchorEnd:  anchorEnd ?? null,
    content,
   }),
  });
  loadComments();
 }

 async function createReply(parentId: string, content: Record<string, unknown>) {
  await fetch(`/api/pages/${pageId}/comments`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ blockId: blockId ?? null, parentId, content }),
  });
  loadComments();
 }

 async function resolveThread(id: string) {
  await fetch(`/api/comments/${id}/resolve`, { method: "POST" });
  loadComments();
 }

 async function reopenThread(id: string) {
  await fetch(`/api/comments/${id}/reopen`, { method: "POST" });
  loadComments();
 }

 // ── Inline variant — renders inside the Comments panel ───────────────────
 if (variant === "inline") {
  return (
   <div ref={cardRef}>
    {/* ── Compose area ── */}
    <div className="px-4 pt-4 pb-4">
     <CommentComposer
      workspaceId={workspaceId}
      mode="new"
      placeholder="Write a comment…"
      onSubmit={createComment}
     />
    </div>

    {/* ── Divider + resolved toggle row ── */}
    <div className="flex items-center gap-3 px-4 mb-1">
     <div className="flex-1 border-t border-border/30" />
     {resolvedCount > 0 && (
      <button
       type="button"
       onClick={() => setShowResolved((v) => !v)}
       className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
       <CheckIcon size={10} className={showResolved ? "text-primary" : ""} />
       {showResolved ? "Hide resolved" : `${resolvedCount} resolved`}
      </button>
     )}
     {resolvedCount === 0 && <div className="flex-1 border-t border-border/30" />}
    </div>

    {/* ── Thread list / states ── */}
    {loading ? (
     <div className="flex items-center justify-center py-16">
      <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
     </div>
    ) : activeVisible.length === 0 ? (
     <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50 border border-border">
       <ChatDotsIcon size={24} className="text-muted-foreground/70" />
      </div>
      <div>
       <p className="text-sm font-semibold text-foreground/70">No page-level comments</p>
       <p className="mt-1 text-xs text-muted-foreground/70 leading-relaxed max-w-[200px]">
        These comments apply to the whole page, not a specific block.
       </p>
      </div>
     </div>
    ) : (
     <div className="divide-y divide-border/25">
      {activeVisible.map((thread) => (
       <ThreadSection
        key={thread.id}
        thread={thread}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        workspaceId={workspaceId}
        onMutate={loadComments}
        onResolve={resolveThread}
        onReopen={reopenThread}
        onReply={createReply}
       />
      ))}
     </div>
    )}

    {orphaned.length > 0 && (
     <div className="mx-4 mb-4 mt-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 px-4 py-3">
      <p className="text-xs font-semibold text-warning mb-2">⚠ Original content removed</p>
      {orphaned.map((thread) => (
       <div key={thread.id} className="flex items-start gap-2 py-1.5">
        <UserAvatar name={thread.author?.name} image={thread.author?.image} />
        <p className="text-sm text-foreground/70">{renderContent(thread.content)}</p>
       </div>
      ))}
     </div>
    )}
   </div>
  );
 }

 // ── Floating variant — block-level comment card ───────────────────────────
 return (
  <div
   ref={cardRef}
   className="w-[380px] border border-border bg-card overflow-hidden"
   style={{ borderRadius: "var(--radius-xl)" }}
  >
   {/* ── Context header ── shows user this is a BLOCK comment, not page-level */}
   <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/50 bg-muted/25">
    <div className="flex items-center gap-2.5 min-w-0">
     <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-primary/15 bg-primary/10">
      <CursorTextIcon size={13} className="text-primary" />
     </div>
     <div className="min-w-0">
      <span className="text-sm font-semibold text-foreground leading-tight">
       {blockId ? "Block comment" : "Page comment"}
      </span>
      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
       {unresolvedCount > 0 ? `${unresolvedCount} open` : "No open threads"}
       {resolvedCount > 0 && (
        <>
         {" · "}
         <button
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          className="underline decoration-dotted underline-offset-2 hover:text-foreground transition-colors duration-150"
         >
          {showResolved ? "hide resolved" : `${resolvedCount} resolved`}
         </button>
        </>
       )}
      </p>
     </div>
    </div>
    <button
     type="button"
     onClick={onClose}
     className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
    >
     <XIcon size={13} />
    </button>
   </div>

   {/* Thread list */}
   <div className="max-h-[400px] overflow-y-auto">
    {loading && (
     <div className="flex items-center justify-center py-8">
      <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
     </div>
    )}
    {!loading && activeVisible.length === 0 && (
     <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50 border border-border mb-2.5">
       <ChatTextIcon size={20} className="text-muted-foreground/70" />
      </div>
      <p className="text-sm font-medium text-foreground/70">No comments yet</p>
      <p className="text-xs text-muted-foreground/70 mt-0.5">
       {blockId ? "Comment on this block" : "Start the conversation"}
      </p>
     </div>
    )}
    {activeVisible.map((thread) => (
     <ThreadSection
      key={thread.id}
      thread={thread}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      workspaceId={workspaceId}
      onMutate={loadComments}
      onResolve={resolveThread}
      onReopen={reopenThread}
      onReply={createReply}
     />
    ))}
    {orphaned.length > 0 && (
     <div className="border-t border-border/40 px-4 pt-2 pb-3">
      <p className="text-xs font-medium text-warning mb-2">⚠ Original content removed</p>
      {orphaned.map((thread) => (
       <div key={thread.id} className="flex items-start gap-2 py-1.5">
        <UserAvatar name={thread.author?.name} image={thread.author?.image} />
        <p className="text-sm text-foreground/70">{renderContent(thread.content)}</p>
       </div>
      ))}
     </div>
    )}
   </div>

   {/* Composer */}
   <div className="border-t border-border/50 bg-muted/10 px-3 py-2.5">
    <CommentComposer
     workspaceId={workspaceId}
     mode="new"
     placeholder={blockId ? "Comment on this block…" : "Add a page comment…"}
     onSubmit={createComment}
    />
   </div>
  </div>
 );
}

// ---------- ThreadSection ----------

interface ThreadSectionProps {
 thread:    CommentThread;
 currentUserId: string;
 isAdmin:    boolean;
 workspaceId:  string;
 onMutate:   () => void;
 onResolve:   (id: string) => void;
 onReopen:   (id: string) => void;
 onReply:    (parentId: string, content: Record<string, unknown>) => Promise<void>;
}

function ThreadSection({ thread, currentUserId, isAdmin, workspaceId, onMutate, onResolve, onReopen, onReply }: ThreadSectionProps) {
 const [editingId,  setEditingId]  = useState<string | null>(null);
 const [replyKey,  setReplyKey]  = useState(0);
 const [emojiAnchor, setEmojiAnchor] = useState<DOMRect | null>(null);
 const [reactions,  setReactions]  = useState<Record<string, string[]>>(thread.reactions ?? {});
 const [isUnread,  setIsUnread]  = useState(false);
 const [isMuted,   setIsMuted]   = useState(false);
 const [pendingDeleteThread, setPendingDeleteThread] = useState(false);

 // Sync reactions when the thread data refreshes
 useEffect(() => { setReactions(thread.reactions ?? {}); }, [thread.reactions]);

 async function toggleReaction(emoji: string) {
  // Optimistic update — one reaction per user: strip user from all emojis,
  // then add to the new one unless they already had it (toggle-off).
  setReactions((prev) => {
   const hadThisEmoji = (prev[emoji] ?? []).includes(currentUserId);
   const next: Record<string, string[]> = {};
   for (const [e, users] of Object.entries(prev)) {
    const filtered = users.filter((u) => u !== currentUserId);
    if (filtered.length > 0) next[e] = filtered;
   }
   if (!hadThisEmoji) {
    next[emoji] = [...(next[emoji] ?? []), currentUserId];
   }
   return next;
  });
  // Persist
  const res = await fetch(`/api/comments/${thread.id}/react`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ emoji }),
  });
  if (res.ok) {
   const data = await res.json() as { reactions: Record<string, string[]> };
   setReactions(data.reactions);
  }
 }

 const isAuthor = thread.author?.id === currentUserId;

 async function handleEditRoot(content: Record<string, unknown>) {
  await fetch(`/api/comments/${thread.id}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ content }),
  });
  setEditingId(null);
  onMutate();
 }

 async function handleDeleteRoot() {
  await fetch(`/api/comments/${thread.id}`, { method: "DELETE" });
  onMutate();
 }

 async function submitReply(content: Record<string, unknown>) {
  await onReply(thread.id, content);
  setReplyKey((k) => k + 1); // reset the reply composer
 }

 return (
  <div
   id={`comment-${thread.id}`}
   className={`group/thread relative border-b border-border/20 last:border-0 transition-colors duration-150 hover:bg-accent/30 ${thread.isResolved ? "opacity-55" : ""}`}
  >
   {/* ── Floating action pill — appears top-right on hover ── */}
   {!thread.deletedAt && (
    <div className="absolute top-2.5 right-3 z-10 hidden group-hover/thread:flex items-center gap-px rounded-[var(--radius-sm)] border border-border/60 bg-card px-0.5 py-0.5">
     {thread.isResolved ? (
      <button
       type="button"
       title="Reopen thread"
       onClick={() => onReopen(thread.id)}
       className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-primary hover:bg-accent transition-colors duration-150"
      >
       <ArrowCounterClockwiseIcon size={12} />
      </button>
     ) : (
      <button
       type="button"
       title="Resolve thread"
       onClick={() => onResolve(thread.id)}
       className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
      >
       <CheckIcon size={12} />
      </button>
     )}
     <button
      type="button"
      title="Add reaction"
      onClick={(e) => setEmojiAnchor(e.currentTarget.getBoundingClientRect())}
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
     <SimpleDropdown
      trigger={
       <button
        type="button"
        className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
       >
        <DotsThreeIcon size={13} />
       </button>
      }
     >
      <DropdownItem icon={<EnvelopeIcon size={13} />} onClick={() => setIsUnread((v) => !v)}>
       {isUnread ? "Mark as read" : "Mark as unread"}
      </DropdownItem>
      {isAuthor && (
       <DropdownItem icon={<PencilSimpleIcon size={13} />} onClick={() => setEditingId(thread.id)}>
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
       <DropdownItem icon={<TrashIcon size={13} />} danger onClick={() => setPendingDeleteThread(true)}>
        Delete
       </DropdownItem>
      )}
     </SimpleDropdown>
    </div>
   )}

   {/* ── Root comment body ── */}
   <div className="flex items-start gap-2.5 px-4 pt-4 pb-2.5">
    <UserAvatar name={thread.author?.name} image={thread.author?.image} size={28} />
    <div className="flex-1 min-w-0 pr-6">
     {/* Name + time row */}
     <div className="flex items-baseline gap-1.5 mb-1">
      <span className="text-sm font-semibold text-foreground leading-tight truncate">
       {thread.author?.name ?? "Former Member"}
      </span>
      {isUnread && <span className="size-1.5 rounded-full bg-primary flex-shrink-0 mb-0.5" title="Unread" />}
      <span className="text-xs text-muted-foreground flex-shrink-0">
       {formatTime(thread.createdAt)}
      </span>
      {thread.editedAt && !thread.deletedAt && (
       <span className="text-xs text-muted-foreground/60 flex-shrink-0">edited</span>
      )}
     </div>

     {/* Content */}
     {thread.deletedAt ? (
      <p className="text-sm text-muted-foreground/60 italic">[Comment deleted]</p>
     ) : editingId === thread.id ? (
      <CommentComposer
       workspaceId={workspaceId}
       mode="edit"
       initialContent={thread.content ?? undefined}
       autoFocus
       onSubmit={handleEditRoot}
       onCancel={() => setEditingId(null)}
      />
     ) : (
      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
       {renderContent(thread.content)}
      </p>
     )}

     {/* Reaction badges */}
     {Object.keys(reactions).length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
       {Object.entries(reactions).map(([emoji, userIds]) => {
        const iMine = userIds.includes(currentUserId);
        return (
         <button
          key={emoji}
          type="button"
          title={iMine ? "Remove reaction" : "Add reaction"}
          onClick={() => { void toggleReaction(emoji); }}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-[var(--radius-xs)] border transition-colors duration-150 ${
           iMine
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-muted/50 hover:bg-accent border-border/50 hover:border-border text-foreground/70"
          }`}
         >
          {emoji}
          <span className="text-xs font-semibold ml-0.5">{userIds.length}</span>
         </button>
        );
       })}
      </div>
     )}
    </div>
   </div>

   {/* ── Replies ── */}
   {thread.replies.length > 0 && (
    <div className="ml-[56px] mr-4 mb-2 border-l-2 border-border/30 pl-3">
     {thread.replies.map((reply) => (
      <ReplyRow
       key={reply.id}
       reply={reply}
       currentUserId={currentUserId}
       isAdmin={isAdmin}
       workspaceId={workspaceId}
       editingId={editingId}
       setEditingId={setEditingId}
       onMutate={onMutate}
      />
     ))}
    </div>
   )}

   {/* ── Reply input ── */}
   {!thread.isResolved && (
    <div className="pl-[56px] pr-4 pb-3">
     <CommentComposer
      key={replyKey}
      workspaceId={workspaceId}
      mode="reply"
      placeholder="Reply…"
      onSubmit={submitReply}
     />
    </div>
   )}

   <ConfirmDialog
    open={pendingDeleteThread}
    onOpenChange={setPendingDeleteThread}
    title="Delete this comment?"
    description="The entire thread and all replies will be permanently deleted."
    onConfirm={handleDeleteRoot}
   />
  </div>
 );
}

// ---------- ReplyRow ----------

interface ReplyRowProps {
 reply:    CommentReply;
 currentUserId: string;
 isAdmin:    boolean;
 workspaceId:  string;
 editingId:   string | null;
 setEditingId: (id: string | null) => void;
 onMutate:   () => void;
}

function ReplyRow({ reply, currentUserId, isAdmin, workspaceId, editingId, setEditingId, onMutate }: ReplyRowProps) {
 const isAuthor = reply.author?.id === currentUserId;
 const [pendingDelete, setPendingDelete] = useState(false);

 async function handleEdit(content: Record<string, unknown>) {
  await fetch(`/api/comments/${reply.id}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ content }),
  });
  setEditingId(null);
  onMutate();
 }

 async function handleDelete() {
  await fetch(`/api/comments/${reply.id}`, { method: "DELETE" });
  onMutate();
 }

 return (
  <div className="group/reply relative flex items-start gap-2 py-2 rounded-[var(--radius-sm)] hover:bg-accent/40 transition-colors duration-150">
   <UserAvatar name={reply.author?.name} image={reply.author?.image} size={20} />
   <div className="flex-1 min-w-0 pr-7">
    {/* Name + time */}
    <div className="flex items-baseline gap-1.5 mb-0.5">
     <span className="text-xs font-semibold text-foreground truncate">
      {reply.author?.name ?? "Former Member"}
     </span>
     <span className="text-xs text-muted-foreground flex-shrink-0">
      {formatTime(reply.createdAt)}
     </span>
     {reply.editedAt && <span className="text-xs text-muted-foreground/60">edited</span>}
    </div>

    {reply.deletedAt ? (
     <p className="text-xs text-muted-foreground/60 italic">[Comment deleted]</p>
    ) : editingId === reply.id ? (
     <CommentComposer
      workspaceId={workspaceId}
      mode="edit"
      initialContent={reply.content ?? undefined}
      autoFocus
      onSubmit={handleEdit}
      onCancel={() => setEditingId(null)}
     />
    ) : (
     <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
      {renderContent(reply.content)}
     </p>
    )}
   </div>

   {/* Hover action — floating dot menu */}
   {!reply.deletedAt && (
    <div className="absolute top-1.5 right-0 hidden group-hover/reply:flex items-center rounded-[var(--radius-sm)] border border-border/50 bg-card px-0.5 py-0.5">
     <SimpleDropdown
      trigger={
       <button type="button" className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150">
        <DotsThreeIcon size={12} />
       </button>
      }
     >
      {isAuthor && (
       <DropdownItem icon={<PencilSimpleIcon size={13} />} onClick={() => setEditingId(reply.id)}>Edit</DropdownItem>
      )}
      <DropdownItem
       icon={<LinkIcon size={13} />}
       onClick={() => navigator.clipboard.writeText(`${window.location.href.split("#")[0]}#comment-${reply.id}`)}
      >
       Copy link
      </DropdownItem>
      {(isAuthor || isAdmin) && (
       <>
        <DropdownSeparator />
        <DropdownItem icon={<TrashIcon size={13} />} danger onClick={() => setPendingDelete(true)}>Delete</DropdownItem>
       </>
      )}
     </SimpleDropdown>
    </div>
   )}

   <ConfirmDialog
    open={pendingDelete}
    onOpenChange={setPendingDelete}
    title="Delete this reply?"
    description="This reply will be permanently deleted."
    onConfirm={handleDelete}
   />
  </div>
 );
}
