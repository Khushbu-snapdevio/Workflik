"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { PaperclipIcon, At, XCircleIcon, ArrowCircleUpIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

interface CommentComposerProps {
  workspaceId:     string;
  placeholder?:    string;
  initialContent?: Record<string, unknown>;
  mode?:           "new" | "reply" | "edit";
  onSubmit:        (content: Record<string, unknown>) => Promise<void>;
  onCancel?:       () => void;
  autoFocus?:      boolean;
}

export function CommentComposer({
  placeholder = "Add a comment…",
  initialContent,
  mode = "new",
  onSubmit,
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment]       = useState<{ preview: string; name: string } | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [editorEmpty, setEditorEmpty]     = useState(true);

  useEffect(() => {
    return () => {
      if (attachment?.preview.startsWith("blob:")) URL.revokeObjectURL(attachment.preview);
    };
  }, [attachment]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setAttachment({ preview: base64, name: file.name });
      setAttachLoading(false);
    };
    reader.onerror = () => setAttachLoading(false);
    reader.readAsDataURL(file);
  }

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading:        false,
        codeBlock:      false,
        blockquote:     false,
        bulletList:     false,
        orderedList:    false,
        horizontalRule: false,
        link:           false,
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent ?? "",
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor: e }) {
      setEditorEmpty(e.isEmpty);
    },
    onCreate({ editor: e }) {
      setEditorEmpty(e.isEmpty);
    },
    editorProps: {
      attributes: {
        class: [
          "text-sm text-foreground leading-5 focus:outline-none",
          "min-h-[24px] max-h-[120px] overflow-y-auto px-3 pt-2.5 pb-1",
          "[&_p.is-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_p.is-empty:first-child]:before:text-muted-foreground/40",
          "[&_p.is-empty:first-child]:before:pointer-events-none",
          "[&_p.is-empty:first-child]:before:float-left",
          "[&_p.is-empty:first-child]:before:h-0",
        ].join(" "),
      },
      handleKeyDown(_view, event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSubmit();
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
          return true;
        }
        return false;
      },
    },
  });

  async function handleSubmit() {
    if (editorEmpty && !attachment) return;

    const rawContent = editor?.getJSON() as Record<string, unknown> | undefined;
    let content: Record<string, unknown>;

    if (rawContent) {
      const doc = rawContent as { type: string; content?: unknown[] };
      if (attachment) {
        doc.content = [
          ...(doc.content ?? []),
          { type: "image", attrs: { src: attachment.preview, alt: attachment.name } },
        ];
      }
      content = doc as Record<string, unknown>;
    } else {
      content = {
        type: "doc",
        content: attachment
          ? [{ type: "image", attrs: { src: attachment.preview, alt: attachment.name } }]
          : [],
      };
    }

    await onSubmit(content);
    editor?.commands.clearContent();
    setAttachment(null);
  }

  const isEmpty = editorEmpty && !attachment;

  const containerCls = mode === "edit"
    ? "border-primary/40 bg-primary/[0.02] focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)]"
    : "border-border/60 bg-card focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.05)]";

  return (
    <div className={`rounded-[var(--radius-sm)] border transition-all ${containerCls}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <EditorContent editor={editor} />

      {/* Attachment preview */}
      {(attachment || attachLoading) && (
        <div className="px-3 pb-2">
          {attachLoading ? (
            <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-muted border border-border">
              <div className="h-3 w-3 rounded-full border-2 border-border border-t-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Loading…</span>
            </div>
          ) : attachment ? (
            <div className="relative inline-block group">
              {attachment.preview.startsWith("data:image") ? (
                <img
                  src={attachment.preview}
                  alt={attachment.name}
                  className="max-w-full max-h-[180px] rounded-[var(--radius-sm)] border border-border object-cover"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-muted border border-border">
                  <PaperclipIcon size={14} className="text-muted-foreground" />
                  <span className="text-xs text-foreground/70 truncate max-w-[200px]">{attachment.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground/70 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XIcon size={9} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Attach image or file"
            className="p-1 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon size={13} />
          </button>

          <button
            type="button"
            title="Mention (@)"
            className="p-1 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => {
              editor?.commands.focus("end");
              editor?.commands.insertContent("@");
            }}
          >
            <At size={13} />
          </button>

          {onCancel && (
            <button
              type="button"
              title="Cancel (Esc)"
              className="p-1 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={onCancel}
            >
              <XCircleIcon size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          title="Submit (Enter)"
          disabled={isEmpty}
          onClick={handleSubmit}
          className={`p-1 rounded transition-colors ${
            isEmpty
              ? "text-muted-foreground/20 cursor-not-allowed"
              : "text-primary hover:text-primary/80 hover:bg-primary/10"
          }`}
        >
          <ArrowCircleUpIcon size={16} weight="fill" />
        </button>
      </div>
    </div>
  );
}
