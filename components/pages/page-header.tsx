"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "@/components/pages/emoji-picker";

interface PageHeaderProps {
  pageId:        string;
  shortId:       string;
  initialTitle:  string;
  initialIcon:   string | null;
  isLocked:      boolean;
  isDeleted:     boolean;
  isEditor:      boolean;
  workspaceSlug: string;
  workspaceId:   string;
  fontFamily:    "default" | "serif" | "mono";
  isSmallText:   boolean;
  isFullWidth:   boolean;
}

export function PageHeader({
  pageId,
  initialTitle,
  initialIcon,
  isLocked,
  isDeleted,
  isEditor,
}: PageHeaderProps) {
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMount = useRef(false);

  const editable = isEditor && !isLocked && !isDeleted;

  // Set initial title once — React must never touch contentEditable after mount
  useEffect(() => {
    if (!didMount.current && titleRef.current) {
      titleRef.current.textContent = initialTitle || "";
      didMount.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTitle = useCallback(async (raw: string) => {
    const title = raw.trim() || "Untitled";
    setSaving(true);
    try {
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      document.title = `${title} | WORKFLIK`;
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  const saveIcon = useCallback(async (newIcon: string | null) => {
    setIcon(newIcon);
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon: newIcon }),
    });
  }, [pageId]);

  function onInput(e: React.FormEvent<HTMLDivElement>) {
    const text = e.currentTarget.textContent ?? "";
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveTitle(text), 800);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") { e.preventDefault(); titleRef.current?.blur(); }
  }

  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTitle(e.currentTarget.textContent ?? "");
  }

  return (
    <div className="relative">

      {/* ── Icon ── */}
      {icon ? (
        <button
          type="button"
          disabled={!editable}
          onClick={() => editable && setShowEmojiPicker(true)}
          className="mb-2 inline-flex size-[42px] items-center justify-center bg-transparent text-[1.875rem] leading-none disabled:cursor-default"
          style={{ transition: "transform 150ms ease" }}
          onMouseEnter={e => { if (editable) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; }}
          onMouseUp={e => { if (editable) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)"; }}
          aria-label="Change icon"
        >
          {icon}
        </button>
      ) : (
        editable && (
          <button
            type="button"
            onClick={() => setShowEmojiPicker(true)}
            className="mb-2 flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground/60 opacity-0 transition-all group-hover/page:opacity-100 hover:text-muted-foreground/60"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Add icon
          </button>
        )
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(e) => { setShowEmojiPicker(false); saveIcon(e); }}
          onRemove={icon ? () => { setShowEmojiPicker(false); saveIcon(null); } : undefined}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* ── Title ── */}
      <div
        ref={titleRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        data-placeholder="Untitled"
        className={[
          "w-full break-words text-[2.4rem] font-black leading-[1.15] tracking-tight text-foreground outline-none",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          editable ? "cursor-text" : "cursor-default select-text",
        ].join(" ")}
      />

      {/* Saving indicator */}
      {saving && (
        <span className="absolute -top-6 right-0 text-xs text-muted-foreground/70 animate-pulse">
          Saving…
        </span>
      )}
    </div>
  );
}
