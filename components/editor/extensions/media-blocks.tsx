"use client";

import { useCallback, useRef, useState } from "react";
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

// ── Shared URL / file picker ──────────────────────────────────────────────────
function MediaPicker({
  icon,
  label,
  accept,
  placeholder,
  onConfirm,
  onCancel,
}: {
  icon: string;
  label: string;
  accept: string;
  placeholder: string;
  onConfirm: (src: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onConfirm(URL.createObjectURL(file));
  };

  return (
    <div className="my-2 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </p>

      {/* URL input row */}
      <div className="flex gap-2">
        <input
          type="url"
          // biome-ignore lint/a11y/noAutofocus: intentional — picker just opened
          autoFocus
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) { e.preventDefault(); onConfirm(url.trim()); }
            if (e.key === "Escape") onCancel();
          }}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={!url.trim()}
          onClick={() => url.trim() && onConfirm(url.trim())}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Embed ↵
        </button>
      </div>

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* File chooser + cancel */}
      <div className="flex gap-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          Choose file from device
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────
function ImageBlockView({ node, updateAttributes }: NodeViewProps) {
  const src     = (node.attrs.src     as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking]         = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);

  const confirm = useCallback((newSrc: string) => {
    updateAttributes({ src: newSrc });
    setPicking(false);
  }, [updateAttributes]);

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          icon="🖼"
          label="Image"
          accept="image/*"
          placeholder="Paste image URL…"
          onConfirm={confirm}
          onCancel={() => { if (src) setPicking(false); }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-2">
        <div className="relative overflow-hidden rounded-lg border border-border/40">
          <img
            src={src}
            alt={captionDraft || "Image"}
            className="block max-w-full"
            style={{ maxHeight: 520, objectFit: "contain", width: "100%" }}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPicking(true)}
            className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Change
          </button>
        </div>
        <input
          type="text"
          value={captionDraft}
          onChange={(e) => { setCaptionDraft(e.target.value); updateAttributes({ caption: e.target.value }); }}
          placeholder="Add a caption…"
          className="mt-1.5 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── Video ─────────────────────────────────────────────────────────────────────
function VideoBlockView({ node, updateAttributes }: NodeViewProps) {
  const src     = (node.attrs.src     as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking]           = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);

  const confirm = useCallback((newSrc: string) => {
    updateAttributes({ src: newSrc });
    setPicking(false);
  }, [updateAttributes]);

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          icon="🎬"
          label="Video"
          accept="video/*"
          placeholder="Paste video URL…"
          onConfirm={confirm}
          onCancel={() => { if (src) setPicking(false); }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-2">
        <div className="relative overflow-hidden rounded-lg border border-border/40 bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: caption is below */}
          <video
            src={src}
            controls
            className="block max-w-full"
            style={{ maxHeight: 480, width: "100%" }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPicking(true)}
            className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Change
          </button>
        </div>
        <input
          type="text"
          value={captionDraft}
          onChange={(e) => { setCaptionDraft(e.target.value); updateAttributes({ caption: e.target.value }); }}
          placeholder="Add a caption…"
          className="mt-1.5 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function AudioBlockView({ node, updateAttributes }: NodeViewProps) {
  const src     = (node.attrs.src     as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking]           = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);

  const confirm = useCallback((newSrc: string) => {
    updateAttributes({ src: newSrc });
    setPicking(false);
  }, [updateAttributes]);

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          icon="🎵"
          label="Audio"
          accept="audio/*"
          placeholder="Paste audio URL…"
          onConfirm={confirm}
          onCancel={() => { if (src) setPicking(false); }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-2">
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
          <span className="text-2xl">🎵</span>
          {/* biome-ignore lint/a11y/useMediaCaption: caption is below */}
          <audio src={src} controls className="h-9 flex-1" style={{ minWidth: 0 }} />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPicking(true)}
            className="shrink-0 rounded px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
          >
            Change
          </button>
        </div>
        <input
          type="text"
          value={captionDraft}
          onChange={(e) => { setCaptionDraft(e.target.value); updateAttributes({ caption: e.target.value }); }}
          placeholder="Add a caption…"
          className="mt-1.5 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── File ──────────────────────────────────────────────────────────────────────
function FileBlockView({ node, updateAttributes }: NodeViewProps) {
  const src     = (node.attrs.src     as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking]           = useState(!src);
  const defaultName                     = src.split("/").pop() || "File";
  const [captionDraft, setCaptionDraft] = useState(caption || defaultName);

  const confirm = useCallback((newSrc: string) => {
    const name = newSrc.split("/").pop() || "File";
    const newCaption = caption || name;
    updateAttributes({ src: newSrc, caption: newCaption });
    setCaptionDraft(newCaption);
    setPicking(false);
  }, [updateAttributes, caption]);

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          icon="📎"
          label="File"
          accept="*"
          placeholder="Paste file URL…"
          onConfirm={confirm}
          onCancel={() => { if (src) setPicking(false); }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="group my-2 flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl">📎</span>
          <div className="min-w-0">
            <a
              href={src}
              download
              className="block truncate text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {captionDraft}
            </a>
            <p className="max-w-xs truncate text-[11px] text-muted-foreground/50">{src}</p>
          </div>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPicking(true)}
          className="ml-4 shrink-0 rounded px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        >
          Change
        </button>
      </div>
      <input
        type="text"
        value={captionDraft}
        onChange={(e) => { setCaptionDraft(e.target.value); updateAttributes({ caption: e.target.value }); }}
        placeholder="File name…"
        className="mt-1 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
      />
    </NodeViewWrapper>
  );
}

// ── Node definitions ───────────────────────────────────────────────────────────
function mediaNode(name: string, View: Parameters<typeof ReactNodeViewRenderer>[0]) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
      return {
        blockId:   { default: null },
        src:       { default: "" },
        caption:   { default: "" },
        objectKey: { default: "" },
        width:     { default: 720 },
      };
    },

    parseHTML() {
      return [{ tag: `div[data-type='${name}']` }];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-type": name })];
    },

    addNodeView() {
      return ReactNodeViewRenderer(View);
    },
  });
}

export const ImageBlock = mediaNode("imageBlock", ImageBlockView);
export const VideoBlock = mediaNode("videoBlock", VideoBlockView);
export const AudioBlock = mediaNode("audioBlock", AudioBlockView);
export const FileBlock  = mediaNode("fileBlock",  FileBlockView);
