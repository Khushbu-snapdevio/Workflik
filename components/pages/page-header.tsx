"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";

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
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMount = useRef(false);

  const editable = isEditor && !isLocked && !isDeleted;

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
    setShowPicker(false);
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

      {/* ── Add icon button (only when no icon set) ── */}
      {editable && !icon && (
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground/60 opacity-0 transition-all group-hover/page:opacity-100 hover:bg-accent hover:text-muted-foreground"
          >
            <Smile size={13} />
            Add icon
          </button>
          {showPicker && (
            <IconPicker
              onSelect={(v) => saveIcon(v)}
              onRemove={() => saveIcon(null)}
              onClose={() => setShowPicker(false)}
              pageId={pageId}
            />
          )}
        </div>
      )}

      {/* ── Icon + Title inline (Notion style) ── */}
      <div className="flex items-start gap-3">
        {icon && (
          <div className="relative mt-1 shrink-0">
            <button
              type="button"
              disabled={!editable}
              onClick={() => editable && setShowPicker((p) => !p)}
              aria-label="Change icon"
              className="flex size-14 items-center justify-center rounded-[var(--radius-md)] transition-all hover:bg-muted/50 disabled:cursor-default"
            >
              <PageIcon icon={icon} size={52} />
            </button>
            {showPicker && (
              <IconPicker
                onSelect={(v) => saveIcon(v)}
                onRemove={() => saveIcon(null)}
                onClose={() => setShowPicker(false)}
                pageId={pageId}
              />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
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
        </div>
      </div>

      {saving && (
        <span className="absolute -top-6 right-0 text-xs text-muted-foreground/70 animate-pulse">
          Saving…
        </span>
      )}
    </div>
  );
}
