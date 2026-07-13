"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Paperclip, AtSign, ArrowUpCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MentionNode } from "@/components/editor/extensions/mention-node";
import { MentionCommands, type MentionSuggestionProps } from "@/components/editor/extensions/mention-extension";
import { MentionList, type MentionListHandle } from "@/components/editor/mention-list";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface CommentComposerProps {
  workspaceId:     string;
  placeholder?:    string;
  initialContent?: Record<string, unknown>;
  mode?:           "new" | "reply" | "edit";
  onSubmit:        (content: Record<string, unknown>) => Promise<void>;
  onCancel?:       () => void;
  autoFocus?:      boolean;
}

type Attachment = { preview: string; name: string; mimeType: string };

const ATTACHMENT_NODE_TYPES = new Set(["image", "file", "attachment"]);

// The tiptap schema below only knows about paragraph/text/mention nodes — it
// has no "image"/"file"/"attachment" node type (those are only rendered
// manually by comment-card.tsx's read-only renderContent()). Handing an
// existing attachment node to editor's `content:` would throw on an unknown
// node type and silently drop the ENTIRE doc (not just that node), which is
// why editing a comment that had an attachment used to blank out the whole
// box — text included. "attachment" (url/name/mimeType attrs) is a third,
// separate shape cell-comment-popover.tsx's own composer uses for the same
// concept; every attachment-like node must be stripped here regardless of
// which of the two shapes it's in, or the leftover one still crashes the
// parse. Only the first is re-hydrated into this composer's single-slot
// `attachment` state (its own attach flow only ever carries one at a time) —
// a comment with 2+ attachments created via the OTHER composer will still
// lose the extra ones if re-saved from here, but that beats the previous
// total data loss.
function extractInitialAttachment(
  initialContent: Record<string, unknown> | undefined
): { docContent: Record<string, unknown> | undefined; attachment: Attachment | null } {
  const doc = initialContent as { type?: string; content?: unknown[] } | undefined;
  if (!doc || !Array.isArray(doc.content)) return { docContent: initialContent, attachment: null };

  const attachmentNodes = doc.content.filter((n) => {
    const type = (n as Record<string, unknown> | null)?.type as string | undefined;
    return !!type && ATTACHMENT_NODE_TYPES.has(type);
  });
  if (attachmentNodes.length === 0) return { docContent: initialContent, attachment: null };

  const node = attachmentNodes[0] as { type: string; attrs?: Record<string, unknown> };
  const attrs = node.attrs ?? {};
  const src = (attrs.src as string | undefined) ?? (attrs.url as string | undefined);

  let attachment: Attachment | null = null;
  if (src) {
    if (node.type === "attachment") {
      attachment = { preview: src, name: (attrs.name as string) ?? "attachment", mimeType: (attrs.mimeType as string) ?? "application/octet-stream" };
    } else if (node.type === "file") {
      attachment = { preview: src, name: (attrs.name as string) ?? "attachment", mimeType: (attrs.mimeType as string) ?? "application/octet-stream" };
    } else {
      attachment = { preview: src, name: (attrs.alt as string) ?? "attachment", mimeType: src.match(/^data:([^;]+);/)?.[1] ?? "image/png" };
    }
  }

  const remaining = doc.content.filter((n) => {
    const type = (n as Record<string, unknown> | null)?.type as string | undefined;
    return !type || !ATTACHMENT_NODE_TYPES.has(type);
  });
  return {
    docContent: { ...doc, content: remaining.length > 0 ? remaining : [{ type: "paragraph" }] },
    attachment,
  };
}

export function CommentComposer({
  workspaceId,
  placeholder = "Add a comment…",
  initialContent,
  mode = "new",
  onSubmit,
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  // Computed once per mount (this component remounts fresh each time edit
  // mode opens on a comment) — see extractInitialAttachment above.
  const [initial]                         = useState(() => extractInitialAttachment(initialContent));
  const [attachment, setAttachment]       = useState<Attachment | null>(initial.attachment);
  const [attachLoading, setAttachLoading] = useState(false);
  const [editorEmpty, setEditorEmpty]     = useState(true);

  const mentionListRef = useRef<MentionListHandle>(null);
  const [mentionProps, setMentionProps] = useState<MentionSuggestionProps | null>(null);
  // Ref so handleKeyDown (inside useEditor) always reads the current value without stale closure
  const mentionActiveRef = useRef(false);
  mentionActiveRef.current = !!mentionProps;

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
      setAttachment({ preview: base64, name: file.name, mimeType: file.type });
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
      // MentionNode must come before MentionCommands so the node type is
      // registered before the suggestion plugin tries to insert mention nodes.
      MentionNode,
      MentionCommands.configure({
        workspaceId,
        onUpdate:  (props) => setMentionProps(props),
        onKeyDown: (event) => mentionListRef.current?.onKeyDown(event) ?? false,
      }),
    ],
    content: initial.docContent ?? "",
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
          "[&_p.is-empty:first-child]:before:text-muted-foreground/70",
          "[&_p.is-empty:first-child]:before:pointer-events-none",
          "[&_p.is-empty:first-child]:before:float-left",
          "[&_p.is-empty:first-child]:before:h-0",
        ].join(" "),
      },
      handleKeyDown(_view, event) {
        // When the @mention dropdown is open, let it handle navigation keys first.
        // Return false for Escape so the suggestion plugin can close the dropdown
        // instead of onCancel() firing.
        if (mentionActiveRef.current && mentionListRef.current) {
          if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") {
            const handled = mentionListRef.current.onKeyDown(event);
            if (handled) { event.preventDefault(); return true; }
          }
          if (event.key === "Escape") return false;
        }
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
        const isImage = attachment.mimeType.startsWith("image/");
        const attachNode = isImage
          ? { type: "image", attrs: { src: attachment.preview, alt: attachment.name } }
          : { type: "file", attrs: { src: attachment.preview, name: attachment.name, mimeType: attachment.mimeType } };
        doc.content = [...(doc.content ?? []), attachNode];
      }
      content = doc as Record<string, unknown>;
    } else {
      const isImage = attachment?.mimeType.startsWith("image/") ?? false;
      content = {
        type: "doc",
        content: attachment
          ? [isImage
              ? { type: "image", attrs: { src: attachment.preview, alt: attachment.name } }
              : { type: "file", attrs: { src: attachment.preview, name: attachment.name, mimeType: attachment.mimeType } }]
          : [],
      };
    }

    await onSubmit(content);
    editor?.commands.clearContent();
    setAttachment(null);
  }

  const isEmpty = editorEmpty && !attachment;

  const containerCls = mode === "edit"
    ? "border-primary/40 bg-primary/5 focus-within:border-primary/60"
    : "border-transparent bg-muted/50 focus-within:border-border focus-within:bg-card";

  return (
    <div className={`relative rounded-[var(--radius-md)] border transition-colors duration-150 ${containerCls}`}>
      {onCancel && (
        <button
          type="button"
          onMouseEnter={(e) => showTooltip("Cancel (Esc)", e)}
          onMouseLeave={hideTooltip}
          onClick={onCancel}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center shadow-sm transition-colors duration-150 z-10"
        >
          <X size={11} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <EditorContent editor={editor} />

      {/* @mention suggestion dropdown */}
      {mentionProps && <MentionList ref={mentionListRef} suggestionProps={mentionProps} />}

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
                  <Paperclip size={14} className="text-muted-foreground" />
                  <span className="text-xs text-foreground/70 truncate max-w-[200px]">{attachment.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-[var(--radius-sm)] bg-foreground/70 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              >
                <X size={9} />
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
            onMouseEnter={(e) => showTooltip("Attach image or file", e)}
            onMouseLeave={hideTooltip}
            className="p-1 rounded-[var(--radius-sm)] text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={13} />
          </button>

          <button
            type="button"
            onMouseEnter={(e) => showTooltip("Mention (@)", e)}
            onMouseLeave={hideTooltip}
            className="p-1 rounded-[var(--radius-sm)] text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => {
              editor?.commands.focus("end");
              editor?.commands.insertContent("@");
            }}
          >
            <AtSign size={13} />
          </button>
        </div>

        <button
          type="button"
          onMouseEnter={(e) => showTooltip("Submit (Enter)", e)}
          onMouseLeave={hideTooltip}
          disabled={isEmpty}
          onClick={handleSubmit}
          className={`p-1 rounded-[var(--radius-sm)] transition-colors duration-150 ${
            isEmpty
              ? "text-muted-foreground/60 cursor-not-allowed"
              : "text-primary hover:text-primary hover:bg-accent"
          }`}
        >
          <ArrowUpCircle size={16} />
        </button>
      </div>
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </div>
  );
}
