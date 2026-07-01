"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, Paperclip, AtSign, ArrowUp, MoreHorizontal, Check,
  Pencil, Trash2, Link2, Reply, Smile, X, ZoomIn, Download,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  id: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface CommentReply {
  id: string;
  content: Record<string, unknown> | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: CommentAuthor | null;
}

interface CommentThread {
  id: string;
  blockId: string | null;
  content: Record<string, unknown> | null;
  reactions: Record<string, string[]>;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  isResolved: boolean;
  author: CommentAuthor | null;
  replies: CommentReply[];
}

interface MoreMenuState { commentId: string; isReply: boolean; isOwn: boolean; rect: DOMRect }
interface EmojiMenuState { commentId: string; rect: DOMRect }

// ── Emoji data ────────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  { id: "recent",   icon: "🕐", label: "Recent",             emojis: [] as string[] },
  { id: "people",   icon: "😀", label: "Smileys & People",   emojis: ["😀","😃","😄","😁","😆","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","👻","💩","🤡","👹","👺","👽","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾","👋","🤚","🖐️","✋","🖖","👌","✌️","🤞","👍","👎","✊","👊","👏","🙌","🤲","🙏","💪","👀","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💞","💓","💗","💖","💘","💝"] },
  { id: "nature",   icon: "🐶", label: "Animals & Nature",   emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐴","🦄","🐝","🦋","🐛","🐌","🐞","🐜","🐢","🐍","🦎","🐙","🦑","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦊","🐊","🐅","🐆","🦓","🐘","🦏","🐪","🦒","🦘","🐕","🐩","🐈","🐓","🦃","🦚","🦜","🕊️","🐇","🦝","🦦","🦥","🐁","🐿️","🦔","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌙","⭐","🌟","🌠","🌌","☁️","⛅","🌤️","🌧️","⛈️","🌩️","❄️","☃️","⛄","🌊","🌀","🌈","🌐","🌋","🏔️","⛰️"] },
  { id: "food",     icon: "🍎", label: "Food & Drink",       emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥕","🧄","🧅","🥔","🌽","🥐","🥯","🍞","🥖","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🍤","🍙","🍚","🍘","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🍯","🧃","🥤","🧋","🍵","☕","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🍾"] },
  { id: "activity", icon: "⚽", label: "Activity",            emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","🎯","🎳","🏹","🎣","🤿","🎿","🛷","🏆","🥇","🥈","🥉","🎖️","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎮","🕹️","🧩","🪄"] },
  { id: "travel",   icon: "🚗", label: "Travel & Places",    emojis: ["🚗","🚕","🚙","🚌","🏎️","🚓","🚑","🚒","🚚","🚜","🏍️","🛵","🚲","✈️","🚀","🛸","🚁","🚢","⛵","🚤","🚂","🚆","🚇","🚉","🏠","🏡","🏢","🏥","🏦","🏨","🏪","🏫","🏭","🏯","🏰","⛪","🕌","🛕","🕍","⛩️","🗼","🗽","⛲","🌍","🌎","🌏","🗺️","🧭","🌋","⛰️","🏔️","🏕️","🏖️","🏜️","🏝️","🏞️","🏟️"] },
  { id: "objects",  icon: "💡", label: "Objects",             emojis: ["💡","🔦","🕯️","🧯","💰","💳","💎","⚖️","🔧","🔨","🛠️","⛏️","🔩","⚙️","🧲","🪜","🧰","💊","💉","🩹","🩺","🔬","🔭","🚪","🛏️","🛋️","🚽","🚿","🛁","🧴","🧹","🧺","🧼","🧽","🧵","🧶","👓","🕶️","📱","💻","⌨️","🖥️","🖨️","📷","📹","🎥","📞","☎️","📺","📻","⏰","⌚","🔋","🔌","💡","🗑️","🔒","🔓","🔑","🗝️","📌","📍","📎","✂️","📏","📐","✏️","📝","📖","📚","📰","🔖","🏷️","💼","👜","👛","💄","🪞","🪟","🛒","🎁","🎊","🎉","🎈","🎀","🎗️","🎟️"] },
  { id: "symbols",  icon: "❤️", label: "Symbols",             emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","✅","❌","⭕","🛑","⛔","📛","🚫","💯","🔥","💢","♨️","⚠️","🚸","♻️","✴️","🆚","🆘","❗","❕","❓","❔","‼️","⁉️","💠","🔱","⚜️","🔰","Ⓜ️","🔅","🔆","📶","🎦","☮️","✝️","☪️","🕉️","✡️","☯️","🆔","⚛️","☢️","☣️","🔞","📵","🚭","♀️","♂️","⚧️","➕","➖","✖️","➗","♾️","💲","™️","©️","®️","▶️","⏩","◀️","⏪","⏸️","⏹️","⏺️","🔃","🔄","🔙","🔛","🔝","🔜","♠️","♥️","♦️","♣️","♟️","🃏","🀄","🎴"] },
];

// Track recently used emojis (runtime only – no persistence needed)
const _recentEmojis: string[] = [];

function addToRecent(emoji: string) {
  const i = _recentEmojis.indexOf(emoji);
  if (i !== -1) _recentEmojis.splice(i, 1);
  _recentEmojis.unshift(emoji);
  if (_recentEmojis.length > 16) _recentEmojis.pop();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Full Emoji Picker ─────────────────────────────────────────────────────────

const FullEmojiPicker = React.forwardRef<HTMLDivElement, {
  rect: DOMRect;
  winH: number;
  winW: number;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}>(function FullEmojiPicker({ rect, winH, winW, onSelect, onClose }, ref) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("people");
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const pickerW = 340;
  const pickerH = 360;
  const left = Math.max(8, Math.min(rect.right - pickerW, winW - pickerW - 8));
  const top  = rect.bottom + 6 + pickerH > winH
    ? Math.max(8, rect.top - pickerH - 6)
    : rect.bottom + 6;

  const recentCat = { ...EMOJI_CATEGORIES[0], emojis: [..._recentEmojis] };
  const allCats   = [recentCat, ...EMOJI_CATEGORIES.slice(1)];

  const filtered = search.trim()
    ? allCats.flatMap(c => c.emojis).filter((e, i, arr) =>
        arr.indexOf(e) === i &&
        (e.includes(search) || true) // simple substring; emoji names not available, show all on any char
      ).slice(0, 80)
    : null;

  function scrollTo(catId: string) {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-cat="${catId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "start" });
    setActiveCat(catId);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, zIndex: 9999, width: pickerW }}
      className="flex flex-col rounded-[var(--radius-lg)] border border-border bg-popover shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground/50">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground/50 hover:text-foreground transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Emoji grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: 264 }}>
        {filtered ? (
          <div className="px-2 pt-2 pb-1">
            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Search results</p>
            {filtered.length === 0
              ? <p className="py-4 text-center text-xs text-muted-foreground/40">No results</p>
              : (
                <div className="grid grid-cols-8 gap-0.5">
                  {filtered.map(emoji => (
                    <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
                      className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-xl hover:bg-accent transition-colors leading-none"
                    >{emoji}</button>
                  ))}
                </div>
              )
            }
          </div>
        ) : allCats.map(cat => {
          if (cat.id === "recent" && cat.emojis.length === 0) return null;
          return (
            <div key={cat.id} data-cat={cat.id} className="px-2 pt-2 pb-1">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">{cat.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji, i) => (
                  <button key={`${emoji}-${i}`} onClick={() => { onSelect(emoji); onClose(); }}
                    className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-xl hover:bg-accent transition-colors leading-none"
                  >{emoji}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Category tabs */}
      <div className="flex items-center justify-around border-t border-border/60 px-1 py-1.5">
        {allCats.filter(c => c.id !== "recent" || _recentEmojis.length > 0).map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSearch(""); scrollTo(cat.id); }}
            title={cat.label}
            className={`flex size-7 items-center justify-center rounded text-base transition-colors ${activeCat === cat.id ? "bg-accent" : "hover:bg-accent/60"}`}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
});

function extractText(node: Record<string, unknown>): string {
  if (!node) return "";
  if (node.type === "text") return String(node.text ?? "");
  const children = (node.content as Record<string, unknown>[]) ?? [];
  return children.map(extractText).join("");
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d ago`
    : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDisplayName(author: CommentAuthor | null): string {
  if (!author) return "Unknown";
  return author.name?.trim() || author.email?.split("@")[0] || "Unknown";
}

function getInitial(author: CommentAuthor | null): string {
  if (!author) return "?";
  const src = author.name?.trim() || author.email?.trim() || author.id || "";
  const ch = src.charAt(0).toUpperCase();
  return ch || "?";
}

function makeContent(text: string, attachments: { url: string; name: string; mimeType: string }[] = []): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      ...(text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : []),
      ...attachments.map((a) => ({ type: "attachment", attrs: { url: a.url, name: a.name, mimeType: a.mimeType } })),
    ],
  };
}

function extractAttachments(content: Record<string, unknown>): { url: string; name: string; mimeType: string }[] {
  const nodes = (content?.content as Record<string, unknown>[]) ?? [];
  return nodes
    .filter((n) => n.type === "attachment")
    .map((n) => {
      const attrs = (n.attrs ?? {}) as { url?: string; name?: string; mimeType?: string };
      return { url: attrs.url ?? "", name: attrs.name ?? "file", mimeType: attrs.mimeType ?? "" };
    })
    .filter((a) => a.url);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function UserAvatar({ author, px = 24 }: { author: CommentAuthor | null; px?: number }) {
  const initial = getInitial(author);
  if (author?.image) {
    return (
      <img
        src={author.image}
        alt={getDisplayName(author)}
        style={{ width: px, height: px, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: px, height: px, borderRadius: "50%", flexShrink: 0,
        background: "var(--primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(px * 0.44), fontWeight: 700, color: "#fff",
      }}
    >
      {initial}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CellCommentPopoverProps {
  pageId: string;
  workspaceId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export function CellCommentPopover({
  pageId, workspaceId, anchorRect, onClose, onCommentAdded,
}: CellCommentPopoverProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;

  const sessionAuthor: CommentAuthor = {
    id: currentUserId,
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  };

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ file: File; previewUrl: string | null }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Reply
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // More menu portal
  const [moreMenu, setMoreMenu] = useState<MoreMenuState | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Emoji menu portal
  const [emojiMenu, setEmojiMenu] = useState<EmojiMenuState | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = text.trim().length > 0 || attachedFiles.length > 0;

  // ── Data ───────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.comments ?? []);
      }
    } catch {}
    setLoading(false);
  }, [pageId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Outside click ──────────────────────────────────────────────────────────

  // Keep a stable ref to onClose so handlers registered once always call the
  // latest version without needing to re-register (which would create a brief
  // window with no listener, causing missed mousedown events on the buttons).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    function h(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !moreMenuRef.current?.contains(target) &&
        !emojiMenuRef.current?.contains(target)
      ) {
        onCloseRef.current();
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []); // stable — registered once on mount, uses ref for latest onClose

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onCloseRef.current(); }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []); // stable — registered once on mount

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  // ── Close sub-menus on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!moreMenu) return;
    function h(e: MouseEvent) {
      if (!moreMenuRef.current?.contains(e.target as Node)) setMoreMenu(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [moreMenu]);

  useEffect(() => {
    if (!emojiMenu) return;
    function h(e: MouseEvent) {
      if (!emojiMenuRef.current?.contains(e.target as Node)) setEmojiMenu(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [emojiMenu]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function uploadFile(file: File): Promise<{ url: string; name: string; mimeType: string } | null> {
    try {
      const mimeType = file.type || "application/octet-stream";
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "block_media", mimeType, fileSizeBytes: file.size, workspaceId }),
      });
      if (!signRes.ok) return null;

      const signed = await signRes.json() as {
        fileUploadId: string;
        objectKey: string;
        fileUrl: string;
        upload: { url: string; method: "PUT" | "POST"; headers: Record<string, string> };
      };

      if (signed.upload.method === "PUT") {
        const putRes = await fetch(signed.upload.url, {
          method: "PUT",
          headers: { "Content-Type": mimeType, ...signed.upload.headers },
          body: file,
        });
        if (!putRes.ok) return null;
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("objectKey", signed.objectKey);
        const localRes = await fetch(signed.upload.url, {
          method: "POST",
          headers: signed.upload.headers,
          body: fd,
        });
        if (!localRes.ok) return null;
      }

      const confirmRes = await fetch("/api/uploads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUploadId: signed.fileUploadId }),
      });
      if (!confirmRes.ok) return null;
      const { fileUrl: confirmedUrl } = await confirmRes.json() as { fileUrl: string };
      return { url: confirmedUrl ?? signed.fileUrl, name: file.name, mimeType: file.type };
    } catch { return null; }
  }

  async function submitComment() {
    const trimmed = text.trim();
    if ((!trimmed && attachedFiles.length === 0) || submitting) return;
    setSubmitting(true);
    try {
      const uploadResults = await Promise.all(attachedFiles.map((af) => uploadFile(af.file)));
      const uploaded = uploadResults.filter(Boolean) as { url: string; name: string; mimeType: string }[];

      // If any file failed to upload, abort and keep files in the input
      if (uploadResults.some((r) => r === null)) {
        setUploadError("One or more files failed to upload. Please try again.");
        return;
      }

      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: null, parentId: null, content: makeContent(trimmed, uploaded) }),
      });
      if (res.ok) {
        setText("");
        setUploadError(null);
        attachedFiles.forEach((af) => { if (af.previewUrl) URL.revokeObjectURL(af.previewUrl); });
        setAttachedFiles([]);
        setLoading(true);
        await fetchComments();
        onCommentAdded?.();
      }
    } finally { setSubmitting(false); }
  }

  async function submitReply(parentId: string) {
    const trimmed = replyText.trim();
    if (!trimmed || replySubmitting) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: null, parentId, content: makeContent(trimmed) }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyToId(null);
        setLoading(true);
        await fetchComments();
        onCommentAdded?.();
      }
    } finally { setReplySubmitting(false); }
  }

  async function submitEdit(commentId: string) {
    const trimmed = editText.trim();
    if (!trimmed || editSubmitting) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", content: makeContent(trimmed) }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchComments();
      }
    } finally { setEditSubmitting(false); }
  }

  async function deleteComment(commentId: string) {
    setMoreMenu(null);
    try {
      await fetch(`/api/pages/${pageId}/comments/${commentId}`, { method: "DELETE" });
      await fetchComments();
    } catch {}
  }

  async function toggleReaction(commentId: string, emoji: string) {
    setEmojiMenu(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });
      if (res.ok) await fetchComments();
    } catch {}
  }

  function insertMention() {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const prefix = before.length > 0 && !before.endsWith(" ") ? " @" : "@";
    const next = before + prefix + after;
    setText(next);
    setTimeout(() => {
      el.focus();
      const cursor = pos + prefix.length;
      el.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function openMoreMenu(e: React.MouseEvent, commentId: string, isReply: boolean, isOwn: boolean) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEmojiMenu(null);
    setMoreMenu({ commentId, isReply, isOwn, rect });
  }

  function openEmojiMenu(e: React.MouseEvent, commentId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMoreMenu(null);
    setEmojiMenu({ commentId, rect });
  }

  function startEdit(commentId: string, currentText: string) {
    setMoreMenu(null);
    setEditingId(commentId);
    setEditText(currentText);
    setTimeout(() => editInputRef.current?.focus(), 60);
  }

  function startReply(threadId: string) {
    setReplyToId(threadId);
    setReplyText("");
    setTimeout(() => replyInputRef.current?.focus(), 60);
  }

  // ── Positioning ────────────────────────────────────────────────────────────

  const POP_W = 300;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  // Center the popover horizontally over the anchor; clamp to viewport edges
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const left = Math.min(Math.max(8, anchorCenterX - POP_W / 2), winW - POP_W - 8);
  const spaceBelow = winH - anchorRect.bottom - 8;
  const showBelow = spaceBelow >= 360;
  const top = showBelow
    ? anchorRect.bottom + 6
    : Math.max(8, anchorRect.top - Math.min(420, anchorRect.top - 8) - 6);
  const maxHeight = showBelow ? winH - top - 8 : anchorRect.top - top - 6;

  // ── Visible threads ────────────────────────────────────────────────────────

  const visible = threads.filter((t) => !t.blockId && !t.deletedAt);

  // ── Render ─────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* Main popover */}
      <div
        ref={popoverRef}
        style={{ position: "fixed", top, left, width: POP_W, zIndex: 800, maxHeight, display: "flex", flexDirection: "column" }}
        className="rounded-[var(--radius-md)] border border-border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Comment list ── */}
        {loading ? (
          <div className="flex flex-1 min-h-0 items-center justify-center py-6">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        ) : visible.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {visible.map((t) => {
              const bodyText = t.content ? extractText(t.content as Record<string, unknown>) : "";
              const isOwn = t.author?.id === currentUserId;
              const hasReactions = Object.keys(t.reactions ?? {}).length > 0;
              const visibleReplies = t.replies?.filter((r) => !r.deletedAt) ?? [];

              return (
                <div key={t.id} className="border-b border-border/40 last:border-0">
                  {/* Root comment */}
                  <div className="px-3 pt-2.5 pb-1 group/comment">
                    <div className="flex items-start gap-2">
                      <UserAvatar author={t.author} px={22} />
                      <div className="min-w-0 flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground leading-none truncate">
                            {getDisplayName(t.author)}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground/60">
                            {timeAgo(t.createdAt)}
                            {t.editedAt && <span className="ml-0.5">(edited)</span>}
                          </span>
                          {/* Action icons — shown on hover */}
                          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity shrink-0">
                            {/* React */}
                            <button
                              title="Add reaction"
                              onClick={(e) => openEmojiMenu(e, t.id)}
                              className="flex size-[18px] items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors text-sm"
                            >
                              <Smile size={12} />
                            </button>
                            {/* Reply */}
                            <button
                              title="Reply"
                              onClick={() => startReply(t.id)}
                              className="flex size-[18px] items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <Reply size={12} />
                            </button>
                            {/* More */}
                            <button
                              title="More options"
                              onClick={(e) => openMoreMenu(e, t.id, false, isOwn)}
                              className="flex size-[18px] items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Body or edit input */}
                        {editingId === t.id ? (
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); submitEdit(t.id); }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none"
                            />
                            <button
                              onClick={() => submitEdit(t.id)}
                              disabled={editSubmitting}
                              className="shrink-0 flex size-5 items-center justify-center rounded bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {editSubmitting ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="shrink-0 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <>
                            {bodyText ? (
                              <p className="text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap">{bodyText}</p>
                            ) : null}
                            {t.content && extractAttachments(t.content as Record<string, unknown>).map((att, ai) => (
                              att.mimeType.startsWith("image/") ? (
                                <div
                                  key={ai}
                                  className="group/img relative mt-1.5 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-border bg-muted"
                                  style={{ maxWidth: 200 }}
                                  onClick={() => setLightbox(att.url)}
                                >
                                  <img src={att.url} alt={att.name} className="max-h-[140px] w-full object-cover block" />
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 transition-colors group-hover/img:bg-black/40">
                                    <span className="flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 transition-opacity group-hover/img:opacity-100 pointer-events-auto">
                                      <ZoomIn size={14} />
                                    </span>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 transition-opacity group-hover/img:opacity-100"
                                    >
                                      <Download size={13} />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <a
                                  key={ai}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1.5 flex items-center gap-1.5 rounded border border-border bg-muted/60 px-2 py-1 text-xs text-foreground hover:bg-accent transition-colors"
                                  style={{ maxWidth: 200 }}
                                >
                                  <Paperclip size={10} className="shrink-0 text-muted-foreground" />
                                  <span className="min-w-0 truncate">{att.name}</span>
                                </a>
                              )
                            ))}
                          </>
                        )}

                        {/* Reactions */}
                        {hasReactions && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(t.reactions).map(([emoji, userIds]) => {
                              if (!userIds.length) return null;
                              const reacted = currentUserId ? userIds.includes(currentUserId) : false;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(t.id, emoji)}
                                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] border transition-colors ${reacted ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}
                                >
                                  {emoji}
                                  <span className="font-medium">{userIds.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {visibleReplies.length > 0 && (
                    <div className="ml-9 border-l border-border/40 pl-2 pb-1">
                      {visibleReplies.map((rep) => {
                        const repText = rep.content ? extractText(rep.content as Record<string, unknown>) : "";
                        const repIsOwn = rep.author?.id === currentUserId;
                        return (
                          <div key={rep.id} className="py-1.5 group/reply">
                            <div className="flex items-start gap-1.5">
                              <UserAvatar author={rep.author} px={18} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[11px] font-semibold text-foreground leading-none truncate">
                                    {getDisplayName(rep.author)}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                                    {timeAgo(rep.createdAt)}
                                  </span>
                                  <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/reply:opacity-100 transition-opacity shrink-0">
                                    <button
                                      title="More options"
                                      onClick={(e) => openMoreMenu(e, rep.id, true, repIsOwn)}
                                      className="flex size-4 items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                                    >
                                      <MoreHorizontal size={11} />
                                    </button>
                                  </div>
                                </div>
                                {editingId === rep.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      ref={editInputRef}
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); submitEdit(rep.id); }
                                        if (e.key === "Escape") setEditingId(null);
                                      }}
                                      className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none"
                                    />
                                    <button onClick={() => submitEdit(rep.id)} disabled={editSubmitting} className="flex size-4 items-center justify-center rounded bg-primary text-white disabled:opacity-50">
                                      {editSubmitting ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-accent">
                                      <X size={9} />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] leading-relaxed text-foreground/85">{repText}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyToId === t.id && (
                    <div className="flex items-center gap-1.5 px-3 pb-2 pt-0.5">
                      <UserAvatar author={sessionAuthor} px={18} />
                      <input
                        ref={replyInputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); submitReply(t.id); }
                          if (e.key === "Escape") { setReplyToId(null); }
                        }}
                        placeholder="Reply…"
                        className="min-w-0 flex-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none"
                      />
                      <button
                        onClick={() => submitReply(t.id)}
                        disabled={!replyText.trim() || replySubmitting}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                      >
                        {replySubmitting ? <Loader2 size={10} className="animate-spin" /> : <ArrowUp size={11} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ── Divider ── */}
        {!loading && visible.length > 0 && <div className="shrink-0 h-px bg-border/40" />}

        {/* ── Upload error ── */}
        {uploadError && (
          <div className="shrink-0 mx-2.5 mt-2 flex items-center gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
            <X size={10} className="shrink-0" />
            {uploadError}
          </div>
        )}

        {/* ── Attached files preview ── */}
        {attachedFiles.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-2 px-2.5 pt-2 pb-0.5">
            {attachedFiles.map((af, i) => (
              <div key={i} className="group/thumb relative">
                {af.previewUrl ? (
                  <>
                    <div className="relative h-[64px] w-[84px] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-muted">
                      <img src={af.previewUrl} alt={af.file.name} className="h-full w-full object-cover block" />
                    </div>
                    <p className="mt-0.5 max-w-[84px] truncate text-[10px] text-muted-foreground">{af.file.name}</p>
                  </>
                ) : (
                  <div className="flex h-[36px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-muted/60 px-2 max-w-[140px]">
                    <Paperclip size={10} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-[11px] text-foreground/80">{af.file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (af.previewUrl) URL.revokeObjectURL(af.previewUrl);
                    setAttachedFiles((fs) => fs.filter((_, j) => j !== i));
                  }}
                  className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover/thumb:opacity-100"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Input area ── */}
        <div className="shrink-0 flex items-center gap-2 px-2.5 py-2">
          <UserAvatar author={sessionAuthor} px={26} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setUploadError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
            }}
            placeholder="Add a comment…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const next = files.map((f) => ({ file: f, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null }));
                setAttachedFiles((prev) => [...prev, ...next]);
                setUploadError(null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-6 items-center justify-center rounded text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-colors"
            >
              <Paperclip size={12} />
            </button>
            <button
              type="button"
              title="Mention someone"
              onClick={insertMention}
              className="flex size-6 items-center justify-center rounded text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-colors"
            >
              <AtSign size={12} />
            </button>
            <button
              type="button"
              title="Send comment"
              disabled={submitting}
              onClick={submitComment}
              className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-all ${
                hasText
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <ArrowUp size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── More menu portal ── */}
      {moreMenu && (
        <div
          ref={moreMenuRef}
          style={{
            position: "fixed",
            top: moreMenu.rect.bottom + 160 > winH
              ? Math.max(8, moreMenu.rect.top - 160)
              : moreMenu.rect.bottom + 4,
            left: Math.min(Math.max(8, moreMenu.rect.right - 148), winW - 156),
            zIndex: 900,
            width: 148,
          }}
          className="overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover py-0.5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {moreMenu.isOwn && (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              onClick={() => {
                const thread = threads.find((t) => t.id === moreMenu.commentId);
                const reply = threads.flatMap((t) => t.replies ?? []).find((r) => r.id === moreMenu.commentId);
                const content = thread?.content ?? reply?.content;
                if (content) startEdit(moreMenu.commentId, extractText(content as Record<string, unknown>));
              }}
            >
              <Pencil size={12} className="shrink-0 text-muted-foreground" />
              Edit comment
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
              }
              setMoreMenu(null);
            }}
          >
            <Link2 size={12} className="shrink-0 text-muted-foreground" />
            Copy link
          </button>
          {moreMenu.isOwn && (
            <>
              <div className="my-0.5 h-px bg-border/40 mx-1" />
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => deleteComment(moreMenu.commentId)}
              >
                <Trash2 size={12} className="shrink-0" />
                Delete comment
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Full emoji picker portal ── */}
      {emojiMenu && (
        <FullEmojiPicker
          ref={emojiMenuRef}
          rect={emojiMenu.rect}
          winH={winH}
          winW={winW}
          onSelect={(emoji) => {
            addToRecent(emoji);
            toggleReaction(emojiMenu.commentId, emoji);
          }}
          onClose={() => setEmojiMenu(null)}
        />
      )}

      {/* ── Image lightbox ── */}
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox(null)}
        >
          <button
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            onClick={() => setLightbox(null)}
          >
            <X size={16} /> Close
          </button>
          <a
            href={lightbox}
            download
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: 16, right: 100, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}
          >
            <Download size={16} /> Download
          </a>
          <img
            src={lightbox}
            alt="Full preview"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>,
    document.body,
  );
}
