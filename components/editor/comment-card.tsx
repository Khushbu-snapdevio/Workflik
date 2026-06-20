"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SmileyIcon, CheckIcon, ArrowCounterClockwiseIcon,
  DotsThreeIcon, ChatTextIcon, XIcon,
  EnvelopeIcon, PencilSimpleIcon, LinkIcon,
  BellSlashIcon, TrashIcon,
} from "@phosphor-icons/react";
import { CommentComposer } from "@/components/editor/comment-composer";

// ---------- Types ----------

interface CommentAuthor {
  id:    string | null;
  name:  string | null;
  image: string | null;
}

interface CommentReply {
  id:         string;
  blockId:    string | null;
  parentId:   string | null;
  isResolved: boolean;
  isOrphaned: boolean;
  content:    Record<string, unknown> | null;
  createdAt:  string;
  editedAt:   string | null;
  deletedAt:  string | null;
  author:     CommentAuthor | null;
}

interface CommentThread {
  id:           string;
  blockId:      string | null;
  parentId:     string | null;
  threadNumber: number | null;
  anchorStart:  number | null;
  anchorEnd:    number | null;
  isResolved:   boolean;
  isOrphaned:   boolean;
  content:      Record<string, unknown> | null;
  reactions:    Record<string, string[]>;
  createdAt:    string;
  editedAt:     string | null;
  deletedAt:    string | null;
  author:       CommentAuthor | null;
  replies:      CommentReply[];
}

interface CommentsData {
  comments:        CommentThread[];
  totalCount:      number;
  unresolvedCount: number;
}

// ---------- Helpers ----------

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return date.toLocaleDateString("en-US", { weekday: "short" });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

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

    if (n.type === "image") {
      const attrs = n.attrs as { src?: string; alt?: string } | undefined;
      if (attrs?.src) {
        parts.push(
          <img
            key={key++}
            src={attrs.src}
            alt={attrs.alt ?? "attachment"}
            className="mt-1.5 max-w-full max-h-[200px] rounded-lg border border-gray-200 object-cover block"
          />
        );
      }
    }

    if (n.type === "mention") {
      const attrs = n.attrs as { mentionType?: string; label?: string } | undefined;
      if (attrs?.label) {
        if (attrs.mentionType === "user") {
          parts.push(
            <span key={key++} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5 mx-px">
              @{attrs.label}
            </span>
          );
        } else if (attrs.mentionType === "page") {
          parts.push(
            <span key={key++} className="text-gray-700 underline decoration-dotted cursor-pointer">
              📄 {attrs.label}
            </span>
          );
        } else {
          parts.push(
            <span key={key++} className="text-violet-600 font-medium">
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
      className="rounded-full bg-blue-500 flex items-center justify-center font-semibold text-white flex-shrink-0 select-none"
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

  if (typeof document === "undefined") return null;

  // Position below the button, aligned to its right edge, clamped to viewport
  const pickerW = 186;
  const left = Math.max(8, Math.min(anchor.right - pickerW, window.innerWidth - pickerW - 8));
  const top  = anchor.bottom + 6;

  return createPortal(
    <div
      ref={ref}
      data-comment-exempt          // tells the card's outside-click handler to ignore this portal
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-xl p-2"
    >
      <div className="grid grid-cols-6 gap-0.5">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-[18px] rounded-lg hover:bg-gray-100 p-1.5 transition-colors leading-none"
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
  const ref = useRef<HTMLDivElement>(null);

  function close() { setOpen(false); onClose?.(); }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div data-comment-exempt className="absolute right-0 top-full mt-1 z-[500] w-[188px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
          {/* Pass close fn via context-like prop-drilling trick: clone children with close */}
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ _close?: () => void }>, { _close: close })
              : child
          )}
        </div>
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
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
        danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="my-1 border-t border-gray-100" />;
}

// ---------- CommentCard ----------

interface CommentCardProps {
  pageId:        string;
  workspaceId:   string;
  blockId:       string | null;
  anchorStart?:  number | null;
  anchorEnd?:    number | null;
  currentUserId: string;
  isAdmin:       boolean;
  onClose:       () => void;
  variant?:      "floating" | "inline";
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
  const [data, setData]             = useState<CommentsData | null>(null);
  const [loading, setLoading]       = useState(true);
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

  const threads = (data?.comments ?? []).filter((t) =>
    blockId ? t.blockId === blockId : !t.blockId
  );
  const nonOrphaned = threads.filter((t) => !t.isOrphaned);
  const orphaned    = threads.filter((t) => t.isOrphaned);
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
        blockId:     blockId ?? null,
        anchorStart: anchorStart ?? null,
        anchorEnd:   anchorEnd ?? null,
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

  // ── Inline variant — full-width page section ──────────────────────────────
  if (variant === "inline") {
    return (
      <div ref={cardRef}>
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <ChatTextIcon size={17} className="text-gray-500" />
            <span className="text-[15px] font-semibold text-gray-800">Comments</span>
            {unresolvedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-blue-500 px-1.5 text-[11px] font-semibold text-white leading-none">
                {unresolvedCount}
              </span>
            )}
            {resolvedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowResolved((v) => !v)}
                className="text-[12px] text-gray-400 hover:text-gray-600 underline decoration-dotted underline-offset-2 transition-colors"
              >
                {showResolved ? "Hide resolved" : `${resolvedCount} resolved`}
              </button>
            )}
          </div>
        </div>

        {/* New comment composer — at the top (Notion-style) */}
        <div className="mb-6">
          <CommentComposer
            workspaceId={workspaceId}
            mode="new"
            placeholder="Add a comment…"
            onSubmit={createComment}
          />
        </div>

        {/* Thread list */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : activeVisible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ChatTextIcon size={26} className="text-gray-200" />
            <p className="text-[13px] text-gray-400">No page-level comments yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
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
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-600 mb-2">⚠ Original content removed</p>
            {orphaned.map((thread) => (
              <div key={thread.id} className="flex items-start gap-2 py-1.5">
                <UserAvatar name={thread.author?.name} image={thread.author?.image} />
                <p className="text-[13px] text-gray-600">{renderContent(thread.content)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Floating variant — compact card ───────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className="w-[360px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ChatTextIcon size={15} className="text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-800">Comments</span>
          {unresolvedCount > 0 && (
            <span className="text-[11px] font-medium text-white bg-blue-500 rounded-full px-1.5 py-0.5 leading-none">
              {unresolvedCount}
            </span>
          )}
          {resolvedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-600 underline decoration-dotted transition-colors"
            >
              {showResolved ? "Hide resolved" : `${resolvedCount} resolved`}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <XIcon size={14} weight="bold" />
        </button>
      </div>

      {/* Thread list */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        )}
        {!loading && activeVisible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ChatTextIcon size={28} className="text-gray-200 mb-2" />
            <p className="text-[13px] text-gray-400">
              {blockId ? "No comments on this block yet." : "No comments yet."}
            </p>
            <p className="text-[12px] text-gray-300 mt-0.5">Be the first to comment</p>
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
          <div className="border-t border-gray-100 px-4 pt-2 pb-3">
            <p className="text-[11px] font-medium text-amber-600 mb-2">⚠ Original content removed</p>
            {orphaned.map((thread) => (
              <div key={thread.id} className="flex items-start gap-2 py-1.5">
                <UserAvatar name={thread.author?.name} image={thread.author?.image} />
                <p className="text-[13px] text-gray-600">{renderContent(thread.content)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New comment composer */}
      <div className="border-t border-gray-100 px-3 py-2.5">
        <CommentComposer
          workspaceId={workspaceId}
          mode="new"
          placeholder="Add a comment…"
          onSubmit={createComment}
        />
      </div>
    </div>
  );
}

// ---------- ThreadSection ----------

interface ThreadSectionProps {
  thread:        CommentThread;
  currentUserId: string;
  isAdmin:       boolean;
  workspaceId:   string;
  onMutate:      () => void;
  onResolve:     (id: string) => void;
  onReopen:      (id: string) => void;
  onReply:       (parentId: string, content: Record<string, unknown>) => Promise<void>;
}

function ThreadSection({ thread, currentUserId, isAdmin, workspaceId, onMutate, onResolve, onReopen, onReply }: ThreadSectionProps) {
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [replyKey,    setReplyKey]    = useState(0);
  const [emojiAnchor, setEmojiAnchor] = useState<DOMRect | null>(null);
  const [reactions,   setReactions]   = useState<Record<string, string[]>>(thread.reactions ?? {});
  const [isUnread,    setIsUnread]    = useState(false);
  const [isMuted,     setIsMuted]     = useState(false);

  // Sync reactions when the thread data refreshes
  useEffect(() => { setReactions(thread.reactions ?? {}); }, [thread.reactions]);

  async function toggleReaction(emoji: string) {
    // Optimistic update
    setReactions((prev) => {
      const users = prev[emoji] ?? [];
      const next = users.includes(currentUserId)
        ? users.filter((u) => u !== currentUserId)
        : [...users, currentUserId];
      if (next.length === 0) {
        const { [emoji]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [emoji]: next };
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
      className={`border-b border-gray-100 last:border-0 ${thread.isResolved ? "opacity-50" : ""}`}
    >
      {/* Thread label */}
      {thread.threadNumber && (
        <div className="px-4 pt-2.5 flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-300">#{thread.threadNumber}</span>
          {isUnread  && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" title="Unread" />}
          {isMuted   && <span className="text-[10px] text-gray-300">muted</span>}
        </div>
      )}

      {/* Root comment */}
      <div className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50/70 transition-colors">
        <UserAvatar name={thread.author?.name} image={thread.author?.image} />
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-800 truncate">
              {thread.author?.name ?? "Former Member"}
            </span>
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {formatTime(thread.createdAt)}
            </span>
            {thread.editedAt && !thread.deletedAt && (
              <span className="text-[11px] text-gray-300 flex-shrink-0">(edited)</span>
            )}

            {/* Hover actions — shown on group-hover */}
            {!thread.deletedAt && (
              <div className="ml-auto hidden group-hover:flex items-center gap-0.5">
                {thread.isResolved ? (
                  <button
                    type="button"
                    title="Reopen thread"
                    onClick={() => onReopen(thread.id)}
                    className="p-1 rounded-md text-green-500 hover:bg-green-50 transition-colors"
                  >
                    <ArrowCounterClockwiseIcon size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Resolve thread"
                    onClick={() => onResolve(thread.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <CheckIcon size={13} weight="bold" />
                  </button>
                )}

                <button
                  type="button"
                  title="Add reaction"
                  onClick={(e) => setEmojiAnchor(e.currentTarget.getBoundingClientRect())}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <SmileyIcon size={13} />
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
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <DotsThreeIcon size={13} weight="bold" />
                    </button>
                  }
                >
                  <DropdownItem
                    icon={<EnvelopeIcon size={13} />}
                    onClick={() => setIsUnread((v) => !v)}
                  >
                    {isUnread ? "Mark as read" : "Mark as unread"}
                  </DropdownItem>

                  {isAuthor && (
                    <DropdownItem
                      icon={<PencilSimpleIcon size={13} />}
                      onClick={() => setEditingId(thread.id)}
                    >
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

                  <DropdownItem
                    icon={<BellSlashIcon size={13} />}
                    onClick={() => setIsMuted((v) => !v)}
                  >
                    {isMuted ? "Unmute replies" : "Mute replies"}
                  </DropdownItem>

                  {(isAuthor || isAdmin) && (
                    <DropdownItem
                      icon={<TrashIcon size={13} />}
                      danger
                      onClick={handleDeleteRoot}
                    >
                      Delete
                    </DropdownItem>
                  )}
                </SimpleDropdown>
              </div>
            )}
          </div>

          {/* Content */}
          {thread.deletedAt ? (
            <p className="text-[13px] text-gray-300 italic">[Comment deleted]</p>
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
            <p className="text-[13px] text-gray-700 leading-5 whitespace-pre-wrap break-words">
              {renderContent(thread.content)}
            </p>
          )}

          {/* Reaction badges */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(reactions).map(([emoji, userIds]) => {
                const iMine = userIds.includes(currentUserId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    title={iMine ? "Remove reaction" : "Add reaction"}
                    onClick={() => { void toggleReaction(emoji); }}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[12px] rounded-full border transition-colors ${
                      iMine
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-gray-100 hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-700"
                    }`}
                  >
                    {emoji}
                    <span className="text-[10px] font-medium ml-0.5">{userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="ml-9 border-l-2 border-gray-100 pl-3 pb-1">
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

      {/* Reply input — always visible so user can click directly into it */}
      {!thread.isResolved && (
        <div className="px-4 pb-3 pl-[52px]">
          <CommentComposer
            key={replyKey}
            workspaceId={workspaceId}
            mode="reply"
            placeholder="Reply…"
            onSubmit={submitReply}
          />
        </div>
      )}
    </div>
  );
}

// ---------- ReplyRow ----------

interface ReplyRowProps {
  reply:        CommentReply;
  currentUserId: string;
  isAdmin:       boolean;
  workspaceId:   string;
  editingId:     string | null;
  setEditingId:  (id: string | null) => void;
  onMutate:      () => void;
}

function ReplyRow({ reply, currentUserId, isAdmin, workspaceId, editingId, setEditingId, onMutate }: ReplyRowProps) {
  const isAuthor = reply.author?.id === currentUserId;

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
    <div className="group flex items-start gap-2 py-2 rounded-md hover:bg-gray-50/70 transition-colors pr-1">
      <UserAvatar name={reply.author?.name} image={reply.author?.image} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-semibold text-gray-800 truncate">
            {reply.author?.name ?? "Former Member"}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {formatTime(reply.createdAt)}
          </span>
          {reply.editedAt && <span className="text-[11px] text-gray-300">(edited)</span>}

          {!reply.deletedAt && (
            <div className="ml-auto hidden group-hover:flex items-center gap-0.5">
              <SimpleDropdown
                trigger={
                  <button type="button" className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <DotsThreeIcon size={12} weight="bold" />
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
                    <DropdownItem icon={<TrashIcon size={13} />} danger onClick={handleDelete}>Delete</DropdownItem>
                  </>
                )}
              </SimpleDropdown>
            </div>
          )}
        </div>

        {reply.deletedAt ? (
          <p className="text-[12px] text-gray-300 italic">[Comment deleted]</p>
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
          <p className="text-[12px] text-gray-700 leading-5 whitespace-pre-wrap break-words">
            {renderContent(reply.content)}
          </p>
        )}
      </div>
    </div>
  );
}
