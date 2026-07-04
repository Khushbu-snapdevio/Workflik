"use client";

import type { NodeViewProps } from "@tiptap/react";
import {
  mergeAttributes,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpload } from "@/lib/storage/use-upload";

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
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    onConfirm(URL.createObjectURL(file));
  };

  return (
    <div className="my-2 space-y-3 rounded-[var(--radius-md)] border border-border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
        <span className="text-xl leading-none">{icon}</span>
        {label}
      </p>

      <div className="flex gap-2">
        <input
          // biome-ignore lint/a11y/noAutofocus: intentional — picker just opened
          autoFocus
          className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) {
              e.preventDefault();
              onConfirm(url.trim());
            }
            if (e.key === "Escape") {
              onCancel?.();
            }
          }}
          placeholder={placeholder}
          type="url"
          value={url}
        />
        <button
          className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          disabled={!url.trim()}
          onClick={() => url.trim() && onConfirm(url.trim())}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          Embed ↵
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-[var(--radius-sm)] border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          onClick={() => fileRef.current?.click()}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          Choose file from device
        </button>
        {onCancel && (
          <button
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={onCancel}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            Cancel
          </button>
        )}
      </div>

      <input
        accept={accept}
        className="hidden"
        onChange={handleFile}
        ref={fileRef}
        type="file"
      />
    </div>
  );
}

// ── Shared hover action bar ───────────────────────────────────────────────────
function MediaActions({
  onChangeDirect,
  onDelete,
}: {
  onChangeDirect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        className="rounded-[var(--radius-sm)] bg-foreground/80 px-2 py-1 text-xs text-white hover:bg-destructive/80"
        onClick={onDelete}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        Delete
      </button>
      <button
        className="rounded-[var(--radius-sm)] bg-foreground/80 px-2 py-1 text-xs text-white hover:bg-foreground/90"
        onClick={onChangeDirect}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        Change
      </button>
    </div>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────
function ImageBlockView({ node, updateAttributes }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking] = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);
  const changeRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (newSrc: string) => {
      updateAttributes({ src: newSrc });
      setPicking(false);
    },
    [updateAttributes]
  );

  // Change — directly open file picker, no panel
  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    confirm(URL.createObjectURL(file));
  }

  // Delete — clear image and show picker panel so user can choose a new one
  function handleDelete() {
    updateAttributes({ src: "" });
    setPicking(true);
  }

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          accept="image/*"
          icon="🖼"
          label="Image"
          onCancel={src ? () => setPicking(false) : undefined}
          onConfirm={confirm}
          placeholder="Paste image URL…"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-3">
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-muted/20">
          <img
            alt={captionDraft || "Image"}
            className="block w-full"
            onError={() => setPicking(true)}
            src={src}
            style={{ maxHeight: 520, objectFit: "contain" }}
          />
          <MediaActions
            onChangeDirect={() => changeRef.current?.click()}
            onDelete={handleDelete}
          />
          <input
            accept="image/*"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
        <input
          className="mt-1.5 w-full bg-transparent text-center text-xs text-muted-foreground/60 outline-none placeholder:text-muted-foreground/30"
          onChange={(e) => {
            setCaptionDraft(e.target.value);
            updateAttributes({ caption: e.target.value });
          }}
          placeholder="Add a caption…"
          type="text"
          value={captionDraft}
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── Video ─────────────────────────────────────────────────────────────────────
function VideoBlockView({ node, updateAttributes }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking] = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);
  const changeRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (newSrc: string) => {
      updateAttributes({ src: newSrc });
      setPicking(false);
    },
    [updateAttributes]
  );

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    confirm(URL.createObjectURL(file));
  }

  function handleDelete() {
    updateAttributes({ src: "" });
    setPicking(true);
  }

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          accept="video/*"
          icon="🎬"
          label="Video"
          onCancel={src ? () => setPicking(false) : undefined}
          onConfirm={confirm}
          placeholder="Paste video URL…"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-3">
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: caption is below */}
          <video
            className="block w-full"
            controls
            onError={() => setPicking(true)}
            src={src}
            style={{ maxHeight: 480 }}
          />
          <MediaActions
            onChangeDirect={() => changeRef.current?.click()}
            onDelete={handleDelete}
          />
          <input
            accept="video/*"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
        <input
          className="mt-1.5 w-full bg-transparent text-center text-xs text-muted-foreground/60 outline-none placeholder:text-muted-foreground/30"
          onChange={(e) => {
            setCaptionDraft(e.target.value);
            updateAttributes({ caption: e.target.value });
          }}
          placeholder="Add a caption…"
          type="text"
          value={captionDraft}
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function AudioBlockView({ node, updateAttributes }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking] = useState(!src);
  const [captionDraft, setCaptionDraft] = useState(caption);
  const changeRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (newSrc: string) => {
      updateAttributes({ src: newSrc });
      setPicking(false);
    },
    [updateAttributes]
  );

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    confirm(URL.createObjectURL(file));
  }

  function handleDelete() {
    updateAttributes({ src: "" });
    setPicking(true);
  }

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          accept="audio/*"
          icon="🎵"
          label="Audio"
          onCancel={src ? () => setPicking(false) : undefined}
          onConfirm={confirm}
          placeholder="Paste audio URL…"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-2">
        <div className="relative flex items-center gap-3 rounded-[var(--radius-sm)] border border-border/40 bg-muted/30 px-4 py-3">
          <span className="text-2xl">🎵</span>
          {/* biome-ignore lint/a11y/useMediaCaption: caption is below */}
          <audio
            className="h-9 flex-1"
            controls
            src={src}
            style={{ minWidth: 0 }}
          />
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/5"
              onClick={handleDelete}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              Delete
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => changeRef.current?.click()}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              Change
            </button>
          </div>
          <input
            accept="audio/*"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
        <input
          className="mt-1.5 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
          onChange={(e) => {
            setCaptionDraft(e.target.value);
            updateAttributes({ caption: e.target.value });
          }}
          placeholder="Add a caption…"
          type="text"
          value={captionDraft}
        />
      </figure>
    </NodeViewWrapper>
  );
}

// ── File ──────────────────────────────────────────────────────────────────────
function FileBlockView({ node, updateAttributes }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const [picking, setPicking] = useState(!src);
  const defaultName = src.split("/").pop() || "File";
  const [captionDraft, setCaptionDraft] = useState(caption || defaultName);
  const changeRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (newSrc: string) => {
      const name = newSrc.split("/").pop() || "File";
      const newCaption = caption || name;
      updateAttributes({ src: newSrc, caption: newCaption });
      setCaptionDraft(newCaption);
      setPicking(false);
    },
    [updateAttributes, caption]
  );

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    confirm(URL.createObjectURL(file));
  }

  function handleDelete() {
    updateAttributes({ src: "", caption: "" });
    setPicking(true);
  }

  if (picking) {
    return (
      <NodeViewWrapper contentEditable={false}>
        <MediaPicker
          accept="*"
          icon="📎"
          label="File"
          onCancel={src ? () => setPicking(false) : undefined}
          onConfirm={confirm}
          placeholder="Paste file URL…"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="group my-2 flex items-center justify-between rounded-[var(--radius-sm)] border border-border/40 bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl">📎</span>
          <div className="min-w-0">
            <a
              className="block truncate text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
              download
              href={src}
              onClick={(e) => e.stopPropagation()}
            >
              {captionDraft}
            </a>
            <p className="max-w-xs truncate text-xs text-muted-foreground">
              {src}
            </p>
          </div>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/5"
            onClick={handleDelete}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            Delete
          </button>
          <button
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            onClick={() => changeRef.current?.click()}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            Change
          </button>
          <input
            accept="*"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
      </div>
      <input
        className="mt-1 w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        onChange={(e) => {
          setCaptionDraft(e.target.value);
          updateAttributes({ caption: e.target.value });
        }}
        placeholder="File name…"
        type="text"
        value={captionDraft}
      />
    </NodeViewWrapper>
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────
// Unlike Image/Video/Audio/File above (which still call URL.createObjectURL —
// a session-local blob URL that never persists), this wires the real 3-step
// upload flow (lib/storage/use-upload.ts: sign → PUT/POST → confirm) so a
// picked PDF survives a reload and is visible to other users.
interface PdfBlockOptions {
  pageId: string;
  workspaceId: string;
}

function PdfBlockView({ node, updateAttributes, extension }: NodeViewProps) {
  const src = (node.attrs.src as string) || "";
  const caption = (node.attrs.caption as string) || "";
  const blockId = (node.attrs.blockId as string | null) || undefined;
  const { workspaceId, pageId } = extension.options as PdfBlockOptions;
  const { upload, uploading, error } = useUpload({
    kind: "block_media",
    workspaceId,
    pageId,
    blockId,
  });

  const [picking, setPicking] = useState(!src);
  const [expanded, setExpanded] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const defaultName = src.split("/").pop() || "PDF";
  const [captionDraft, setCaptionDraft] = useState(caption || defaultName);
  const changeRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    function handleOutside(e: MouseEvent) {
      if (!popupRef.current?.contains(e.target as globalThis.Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [expanded]);

  const uploadFile = useCallback(
    async (file: File) => {
      const result = await upload(file);
      if (!result) {
        return;
      }
      const newCaption = caption || file.name;
      updateAttributes({
        src: result.fileUrl,
        objectKey: result.objectKey,
        caption: newCaption,
      });
      setCaptionDraft(newCaption);
      setPicking(false);
      setExpanded(false);
    },
    [upload, updateAttributes, caption]
  );

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    uploadFile(file);
  }

  function confirmLink() {
    const url = linkUrl.trim();
    if (!url) {
      return;
    }
    const newCaption = caption || url.split("/").pop() || "PDF";
    updateAttributes({ src: url, caption: newCaption });
    setCaptionDraft(newCaption);
    setPicking(false);
    setExpanded(false);
  }

  function handleDelete() {
    updateAttributes({ src: "", caption: "", objectKey: "" });
    setPicking(true);
    setExpanded(false);
  }

  if (picking) {
    if (!expanded) {
      return (
        <NodeViewWrapper contentEditable={false}>
          <button
            className="my-1 flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/20 px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
            onClick={() => setExpanded(true)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <span className="text-lg leading-none">📕</span>
            Embed a PDF
          </button>
        </NodeViewWrapper>
      );
    }
    return (
      <NodeViewWrapper contentEditable={false}>
        <div className="relative my-1 flex flex-col items-center gap-2" ref={popupRef}>
          <button
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/20 px-3.5 py-2.5 text-sm text-muted-foreground"
            onClick={() => setExpanded(false)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <span className="text-lg leading-none">📕</span>
            Embed a PDF
          </button>
          <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-border bg-popover p-4 shadow-lg">
            <Tabs defaultValue="upload">
              <TabsList className="w-full" variant="line">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
              </TabsList>
              <TabsContent className="mt-3" value="upload">
                <Button
                  className="w-full"
                  disabled={uploading}
                  onClick={() => changeRef.current?.click()}
                  onMouseDown={(e) => e.preventDefault()}
                  type="button"
                >
                  {uploading ? "Uploading…" : "Choose a file"}
                </Button>
              </TabsContent>
              <TabsContent className="mt-3 space-y-2" value="link">
                <Input
                  // biome-ignore lint/a11y/noAutofocus: intentional — tab just opened
                  autoFocus
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmLink();
                    }
                  }}
                  placeholder="https://…"
                  type="url"
                  value={linkUrl}
                />
                <Button
                  className="w-full"
                  disabled={!linkUrl.trim()}
                  onClick={confirmLink}
                  type="button"
                >
                  Embed PDF
                </Button>
                <p className="text-center text-xs text-muted-foreground/70">
                  Embed a PDF file
                </p>
              </TabsContent>
            </Tabs>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
          <input
            accept="application/pdf"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false}>
      <figure className="group my-3">
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-muted/20">
          <iframe
            className="block w-full"
            src={src}
            style={{ height: 480 }}
            title={captionDraft}
          />
          <MediaActions
            onChangeDirect={() => changeRef.current?.click()}
            onDelete={handleDelete}
          />
          <input
            accept="application/pdf"
            className="hidden"
            onChange={onChangeFile}
            ref={changeRef}
            type="file"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <input
            className="max-w-xs bg-transparent text-center text-xs text-muted-foreground/60 outline-none placeholder:text-muted-foreground/30"
            onChange={(e) => {
              setCaptionDraft(e.target.value);
              updateAttributes({ caption: e.target.value });
            }}
            placeholder="PDF name…"
            type="text"
            value={captionDraft}
          />
          <a
            className="shrink-0 text-xs text-primary hover:underline"
            href={src}
            onClick={(e) => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open in new tab
          </a>
        </div>
      </figure>
    </NodeViewWrapper>
  );
}

export const PdfBlock = Node.create<PdfBlockOptions>({
  name: "pdfBlock",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { workspaceId: "", pageId: "" };
  },

  addAttributes() {
    return {
      blockId: { default: null },
      src: { default: "" },
      caption: { default: "" },
      objectKey: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='pdfBlock']" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "pdfBlock" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfBlockView);
  },
});

// ── Node definitions ───────────────────────────────────────────────────────────
function mediaNode(
  name: string,
  View: Parameters<typeof ReactNodeViewRenderer>[0]
) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
      return {
        blockId: { default: null },
        src: { default: "" },
        caption: { default: "" },
        objectKey: { default: "" },
        width: { default: 720 },
      };
    },

    parseHTML() {
      return [{ tag: `div[data-type='${name}']` }];
    },

    renderHTML({
      HTMLAttributes,
    }: {
      HTMLAttributes: Record<string, unknown>;
    }) {
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
export const FileBlock = mediaNode("fileBlock", FileBlockView);
