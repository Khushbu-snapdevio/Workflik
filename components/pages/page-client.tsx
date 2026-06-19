"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "@/components/pages/emoji-picker";
import { PageEditor } from "@/components/editor/editor";
import { CommentCard } from "@/components/editor/comment-card";
import { useUpload } from "@/lib/storage/use-upload";
import { EntryPropertiesPanel } from "@/components/database/entry-properties-panel";

interface PageClientProps {
  pageId:               string;
  shortId:              string;
  initialTitle:         string;
  initialIcon:          string | null;
  initialCoverUrl:      string | null;
  initialCoverPosition: number;
  isLocked:             boolean;
  isDeleted:            boolean;
  isEditor:             boolean;
  workspaceSlug:        string;
  workspaceId:          string;
  fontFamily:           "default" | "serif" | "mono";
  isSmallText:          boolean;
  isFullWidth:          boolean;
  statusBanner:         React.ReactNode;
  databaseId?:          string | null;
  currentUserId?:       string;
  isAdmin?:             boolean;
}

export function PageClient({
  pageId,
  initialTitle,
  initialIcon,
  initialCoverUrl,
  initialCoverPosition,
  isLocked,
  isDeleted,
  isEditor,
  workspaceId,
  workspaceSlug,
  fontFamily,
  isSmallText,
  isFullWidth,
  statusBanner,
  databaseId,
  currentUserId = "",
  isAdmin = false,
}: PageClientProps) {
  const [coverUrl, setCoverUrl]   = useState<string | null>(initialCoverUrl);
  const [coverPos]                = useState<number>(initialCoverPosition);
  const [icon, setIcon]           = useState<string | null>(initialIcon);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]       = useState(false);

  const titleRef    = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMount    = useRef(false);
  const coverInput  = useRef<HTMLInputElement>(null);

  const editable = isEditor && !isLocked && !isDeleted;

  const { upload, uploading: coverUploading } = useUpload({
    kind: "page_cover",
    workspaceId,
    pageId,
  });

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

  const saveIcon = useCallback(async (emoji: string | null) => {
    setIcon(emoji);
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon: emoji }),
    });
  }, [pageId]);

  const saveCover = useCallback(async (url: string | null) => {
    setCoverUrl(url);
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverUrl: url }),
    });
  }, [pageId]);

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await upload(file);
    if (result) saveCover(result.fileUrl);
  }

  const contentCls = isFullWidth ? "max-w-full px-10" : "max-w-[760px] px-16";

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Cover — full viewport width ── */}
      {coverUrl && (
        <div className="group/cover relative h-[220px] w-full shrink-0 bg-muted">
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundPosition: `center ${coverPos * 100}%`,
            }}
          />
          {/* bottom gradient so icon is readable against any photo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

          {editable && (
            <div className="absolute bottom-3 right-4 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover/cover:opacity-100">
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={coverUploading}
                className="rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm hover:bg-background disabled:opacity-50"
              >
                {coverUploading ? "Uploading…" : "Change cover"}
              </button>
              <button
                type="button"
                onClick={() => saveCover(null)}
                className="rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm hover:bg-background"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onCoverFile}
      />

      {/* ── Page content ── */}
      {/*
        paddingTop rules:
          cover + icon  → 0  (icon handles its own top via negative margin)
          cover, no icon → 1rem  (content starts just below cover — hover zone is correct)
          no cover       → 3.5rem
      */}
      <div
        className={`group/page mx-auto pb-32 ${contentCls}`}
        style={{ paddingTop: coverUrl ? (icon ? 0 : "1rem") : "3.5rem" }}
      >

        {/* Icon — overlap cover only when icon exists */}
        {icon && (
          <div
            style={{ marginTop: coverUrl ? "-2.75rem" : 0 }}
            className="relative z-10 mb-1"
          >
            <button
              type="button"
              disabled={!editable}
              onClick={() => editable && setShowPicker(true)}
              aria-label="Change icon"
              style={{ fontSize: "3rem", width: "4rem", height: "4rem" }}
              className="flex items-center justify-center rounded-2xl leading-none transition-colors hover:bg-accent/70 disabled:cursor-default"
            >
              {icon}
            </button>
            {showPicker && (
              <EmojiPicker
                onSelect={(e) => { setShowPicker(false); saveIcon(e); }}
                onRemove={() => { setShowPicker(false); saveIcon(null); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        )}

        {/* Page toolbar — Add cover / Add icon */}
        {editable && (!coverUrl || !icon) && (
          <div className="mb-4 flex items-center gap-1">
            {!coverUrl && (
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={coverUploading}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                {coverUploading ? "Uploading…" : "Add cover"}
              </button>
            )}
            {!icon && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                  Add icon
                </button>
                {showPicker && (
                  <EmojiPicker
                    onSelect={(e) => { setShowPicker(false); saveIcon(e); }}
                    onClose={() => setShowPicker(false)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {statusBanner}

        {/* Title */}
        <div className="relative mt-1">
          <div
            ref={titleRef}
            contentEditable={editable}
            suppressContentEditableWarning
            onInput={(e) => {
              const text = e.currentTarget.textContent ?? "";
              if (saveTimeout.current) clearTimeout(saveTimeout.current);
              saveTimeout.current = setTimeout(() => saveTitle(text), 800);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); titleRef.current?.blur(); }
            }}
            onBlur={(e) => {
              if (saveTimeout.current) clearTimeout(saveTimeout.current);
              saveTitle(e.currentTarget.textContent ?? "");
            }}
            data-placeholder="Untitled"
            className={[
              "w-full break-words text-[2.5rem] font-black leading-[1.15] tracking-tight text-foreground outline-none",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/20",
              editable ? "cursor-text" : "cursor-default select-text",
            ].join(" ")}
          />
          {saving && (
            <span className="absolute -top-5 right-0 animate-pulse text-[11px] text-muted-foreground/40">
              Saving…
            </span>
          )}
        </div>

        {/* Database entry properties */}
        {databaseId && (
          <EntryPropertiesPanel
            entryId={pageId}
            databaseId={databaseId}
            workspaceId={workspaceId}
            isEditor={isEditor && !isLocked && !isDeleted}
          />
        )}

        {/* Editor */}
        <div className="mt-3">
          <PageEditor
            pageId={pageId}
            isLocked={isLocked}
            isDeleted={isDeleted}
            isEditor={isEditor}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            fontFamily={fontFamily}
            isSmallText={isSmallText}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>

        {/* Page-level comments — scroll target for the Comments button in the top bar */}
        {workspaceId && (
          <div id="page-comments" className="mt-12 border-t border-border/40 pt-6 pb-4">
            <CommentCard
              variant="inline"
              pageId={pageId}
              workspaceId={workspaceId}
              blockId={null}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onClose={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
