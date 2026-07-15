"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ImageIcon } from "lucide-react";
import { useUpload } from "@/lib/storage/use-upload";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { ICON_REGISTRY, PageIcon } from "./page-icon";
import { EmojiGridPicker } from "./emoji-grid-picker";

// ── Icon colors ───────────────────────────────────────────────────────────────

const ICON_COLORS = [
  { name: "Gray",   value: "#6b7280" },
  { name: "Red",    value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber",  value: "#f59e0b" },
  { name: "Green",  value: "#22c55e" },
  { name: "Teal",   value: "#14b8a6" },
  { name: "Blue",   value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink",   value: "#ec4899" },
  { name: "Navy",   value: "#0C2340" },
  { name: "Black",  value: "#1a1a1a" },
];

const ICON_NAMES = Object.keys(ICON_REGISTRY);

// ── Props ─────────────────────────────────────────────────────────────────────

export interface IconPickerProps {
  onSelect: (value: string) => void;
  onIconPreview?: (value: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  workspaceId?: string;
  pageId?: string;
  /** Which upload-quota bucket an uploaded image counts against — defaults to
   *  "page_icon" (this picker's original, only use case); pass "workspace_icon"
   *  when reusing this same picker for a workspace's own icon instead of a page's. */
  uploadKind?: "page_icon" | "workspace_icon";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IconPicker({
  onSelect, onIconPreview, onRemove, onClose, workspaceId, pageId, uploadKind = "page_icon",
}: IconPickerProps) {
  const [tab, setTab] = useState<"emoji" | "icons" | "upload">("emoji");
  const [iconColor, setIconColor] = useState("#6b7280");
  const [iconSearch, setIconSearch] = useState("");
  const [uploadSubTab, setUploadSubTab] = useState<"file" | "link">("file");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreviewOk, setLinkPreviewOk] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const { upload, uploading, error: uploadError } = useUpload({ kind: uploadKind, workspaceId, pageId });

  useEffect(() => {
    function down(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        // Skin-tone dropdown (rendered by EmojiGridPicker) is a portal outside
        // pickerRef — don't close when clicking inside it.
        if ((e.target as HTMLElement).closest?.("[data-emoji-picker-exempt]")) return;
        onCloseRef.current();
      }
    }
    // Use capture so we catch the event before other handlers
    document.addEventListener("mousedown", down, true);
    return () => document.removeEventListener("mousedown", down, true);
  }, []); // stable — never re-runs

  const filteredIcons = iconSearch.trim()
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(iconSearch.trim().toLowerCase()))
    : ICON_NAMES;

  async function handleUpload(file: File) {
    const res = await upload(file);
    if (res) {
      setUploadedUrl(res.fileUrl);
      const iconJson = JSON.stringify({ type: "image", url: res.fileUrl });
      if (onIconPreview) onIconPreview(iconJson);
    }
  }

  function applyImage(url: string) {
    onSelect(JSON.stringify({ type: "image", url }));
    onClose();
  }

  function applyLinkUrl() {
    const trimmed = linkUrl.trim();
    if (!trimmed || !linkPreviewOk) return;
    applyImage(trimmed);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleUpload(file);
  }

  return (
    <div
      ref={pickerRef}
      className="absolute left-0 top-full z-[500] mt-2 w-[352px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Tab bar — Notion underline style ── */}
      <div className="flex items-center border-b border-border/60 px-2">
        {(["emoji", "icons", "upload"] as const).map((id) => {
          const label = id === "emoji" ? "Emoji" : id === "icons" ? "Icons" : "Upload";
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                "relative px-3 py-2.5 text-xs font-medium transition-colors",
                tab === id
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:content-['']"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
        <div className="flex-1" />
        {onRemove && (
          <button
            onClick={() => { onRemove(); onClose(); }}
            className="px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>

      {/* ── Emoji tab ── */}
      {tab === "emoji" && (
        <EmojiGridPicker
          onSelect={onSelect}
          onClose={onClose}
          // Shuffle updates the icon but keeps the picker open, so the user
          // can click it repeatedly to browse random options before settling
          // on one. Routed through onIconPreview (same "update without closing"
          // callback already used by the upload tab) when the caller supports
          // it; falls back to the old select-and-close behavior otherwise.
          onShuffle={(emoji) => {
            if (onIconPreview) {
              onIconPreview(emoji);
            } else {
              onSelect(emoji);
              onClose();
            }
          }}
        />
      )}

      {/* ── Icons tab ── */}
      {tab === "icons" && (
        <div className="flex flex-col">
          <div className="px-3 pb-2 pt-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons…"
                autoFocus
                className="w-full rounded-[var(--radius-sm)] border border-border bg-background py-1.5 pl-7 pr-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-border/40 px-3 pb-2.5">
            {ICON_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setIconColor(c.value)}
                onMouseEnter={(e) => showTooltip(c.name, e)}
                onMouseLeave={hideTooltip}
                className="relative flex shrink-0 items-center justify-center transition-transform hover:scale-110"
                style={{ width: 20, height: 20 }}
              >
                <span
                  className={["block rounded-full transition-all", iconColor === c.value ? "size-5 ring-2 ring-offset-1 ring-foreground/40" : "size-4"].join(" ")}
                  style={{ backgroundColor: c.value }}
                />
              </button>
            ))}
          </div>
          <div className="h-[200px] overflow-y-auto px-2.5 py-2">
            {filteredIcons.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No icons found</p>
            ) : (
              <div className="grid grid-cols-9 gap-0.5">
                {filteredIcons.map((name) => (
                  <button
                    key={name}
                    onMouseEnter={(e) => showTooltip(name, e)}
                    onMouseLeave={hideTooltip}
                    onClick={() => { onSelect(JSON.stringify({ type: "icon", name, color: iconColor })); onClose(); }}
                    className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-accent"
                  >
                    <PageIcon icon={JSON.stringify({ type: "icon", name, color: iconColor })} size={18} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload tab ── */}
      {tab === "upload" && (
        <div className="flex flex-col">
          <div className="flex gap-0 border-b border-border/40 px-3">
            {(["file", "link"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setUploadSubTab(st)}
                className={[
                  "relative py-2.5 px-3 text-xs font-medium transition-colors",
                  uploadSubTab === st
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:content-['']"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {st === "file" ? "Upload file" : "Link"}
              </button>
            ))}
          </div>

          {uploadSubTab === "file" && (
            <div className="p-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; }}
              />
              {uploadedUrl ? (
                <div className="flex flex-col items-center gap-4 py-3">
                  <img src={uploadedUrl} alt="Icon preview" className="size-[72px] rounded-[6px] border border-border object-cover" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => applyImage(uploadedUrl)} className="rounded-[var(--radius-sm)] bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Apply</button>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50">{uploading ? "Uploading…" : "Change"}</button>
                  </div>
                  {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={["flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed py-8 transition-colors",
                    isDragging ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/20 hover:text-foreground",
                    uploading ? "pointer-events-none opacity-60" : ""].join(" ")}
                >
                  <ImageIcon size={22} className="opacity-50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{uploading ? "Uploading…" : "Choose an image"}</p>
                    <p className="mt-0.5 text-xs opacity-60">or drag & drop · PNG, JPG, GIF, WebP</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadSubTab === "link" && (
            <div className="flex flex-col gap-3 p-3">
              <input
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkPreviewOk(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && linkPreviewOk) applyLinkUrl(); }}
                placeholder="Paste image URL…"
                autoFocus
                className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
              />
              {linkUrl.trim() && (
                <div className="flex items-center gap-3">
                  <img
                    src={linkUrl.trim()} alt="Preview"
                    className={`size-12 rounded-[4px] border object-cover transition-opacity ${linkPreviewOk ? "border-border opacity-100" : "opacity-0"}`}
                    onLoad={() => setLinkPreviewOk(true)}
                    onError={() => setLinkPreviewOk(false)}
                  />
                  {linkPreviewOk
                    ? <span className="text-xs text-muted-foreground">Preview</span>
                    : <span className="text-xs text-destructive">Not a valid image URL</span>
                  }
                </div>
              )}
              <button
                onClick={applyLinkUrl}
                disabled={!linkPreviewOk}
                className="rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </div>
  );
}
