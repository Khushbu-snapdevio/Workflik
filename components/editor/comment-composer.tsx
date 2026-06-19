"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { PaperclipIcon, At, XCircleIcon, ArrowCircleUpIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useCallback } from "react";

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
  // Track empty state as React state — editor.isEmpty alone doesn't trigger re-renders
  const [editorEmpty, setEditorEmpty]     = useState(true);

  // Revoke object URLs on unmount
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
    extensions: [
      StarterKit.configure({
        heading:        false,
        codeBlock:      false,
        blockquote:     false,
        bulletList:     false,
        orderedList:    false,
        horizontalRule: false,
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
          "text-[13px] text-gray-800 leading-5 focus:outline-none",
          "min-h-[24px] max-h-[120px] overflow-y-auto px-3 pt-2 pb-1",
          "[&_p.is-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_p.is-empty:first-child]:before:text-gray-400",
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

    // Embed the attachment as an image node at the end of the TipTap doc
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

  return (
    <div
      className={`rounded-lg border transition-colors ${
        mode === "edit"
          ? "border-blue-400 bg-blue-50/30 focus-within:border-blue-500"
          : "border-gray-200 bg-white focus-within:border-gray-300 focus-within:shadow-sm"
      }`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <EditorContent editor={editor} />

      {/* Image / file preview */}
      {(attachment || attachLoading) && (
        <div className="px-3 pb-2">
          {attachLoading ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
              <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
              <span className="text-[12px] text-gray-400">Loading…</span>
            </div>
          ) : attachment ? (
            <div className="relative inline-block group">
              {attachment.preview.startsWith("data:image") ? (
                <img
                  src={attachment.preview}
                  alt={attachment.name}
                  className="max-w-full max-h-[180px] rounded-lg border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <PaperclipIcon size={14} className="text-gray-400" />
                  <span className="text-[12px] text-gray-600 truncate max-w-[200px]">{attachment.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gray-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon size={13} />
          </button>

          <button
            type="button"
            title="Mention (@)"
            className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
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
              className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
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
              ? "text-gray-200 cursor-not-allowed"
              : "text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <ArrowCircleUpIcon size={16} weight="fill" />
        </button>
      </div>
    </div>
  );
}
