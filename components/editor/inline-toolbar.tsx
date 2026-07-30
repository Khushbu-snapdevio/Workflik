"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { TextSelection } from "@tiptap/pm/state";
import {
  Bold, Italic, Underline, Strikethrough,
  Code, Link, Paintbrush, Highlighter, MessageSquare,
} from "lucide-react";
import { useState } from "react";

interface Props {
  editor:               Editor;
  onCommentSelection?:  (anchorStart: number, anchorEnd: number) => void;
}

const btnBase = "flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground";
const btnActive = "bg-accent text-foreground";

export function InlineToolbar({ editor, onCommentSelection }: Props) {
  const [linkInput, setLinkInput] = useState(false);
  const [linkUrl,   setLinkUrl]   = useState("");

  function applyLink() {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkInput(false);
    setLinkUrl("");
  }

  return (
    <BubbleMenu
      editor={editor}
      // Default shouldShow only checks that the selection is non-empty, so a
      // NodeSelection on a block (e.g. a clicked-into inline database/embed)
      // satisfies it too — restrict to genuine text selections, keeping the
      // library's other default checks (focus, editability).
      shouldShow={({ view, state }) => {
        const { selection } = state;
        if (selection.empty || !(selection instanceof TextSelection)) return false;
        if (!view.hasFocus() || !editor.isEditable) return false;
        return true;
      }}
      className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-popover p-1"
    >
      {linkInput ? (
        <div className="flex items-center gap-1 px-1">
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") { setLinkInput(false); setLinkUrl(""); }
            }}
            placeholder="Paste link…"
            className="h-6 w-48 rounded-[var(--radius-sm)] border border-border bg-background px-2 text-xs outline-none"
          />
          <button type="button" onClick={applyLink} className="text-xs font-medium text-foreground transition-colors duration-150 hover:text-muted-foreground">
            Apply
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btnBase} ${editor.isActive("bold") ? btnActive : ""}`}
            aria-label="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btnBase} ${editor.isActive("italic") ? btnActive : ""}`}
            aria-label="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`${btnBase} ${editor.isActive("underline") ? btnActive : ""}`}
            aria-label="Underline (Ctrl+U)"
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${btnBase} ${editor.isActive("strike") ? btnActive : ""}`}
            aria-label="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`${btnBase} ${editor.isActive("code") ? btnActive : ""}`}
            aria-label="Inline Code (Ctrl+E)"
          >
            <Code size={14} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-border" />

          <button
            type="button"
            onClick={() => {
              const prev = editor.getAttributes("link").href ?? "";
              setLinkUrl(prev);
              setLinkInput(true);
            }}
            className={`${btnBase} ${editor.isActive("link") ? btnActive : ""}`}
            aria-label="Link (Ctrl+K)"
          >
            <Link size={14} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Text colour — quick swatches */}
          <ColorPicker
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            active={editor.isActive("textStyle")}
          />
          {/* Highlight */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fde047" }).run()}
            className={`${btnBase} ${editor.isActive("highlight") ? btnActive : ""}`}
            aria-label="Highlight"
          >
            <Highlighter size={14} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Comment on selection */}
          <button
            type="button"
            aria-label="Comment (Ctrl+Shift+Alt+X)"
            className={btnBase}
            onClick={() => {
              const { from, to } = editor.state.selection;
              if (onCommentSelection && from !== to) onCommentSelection(from, to);
            }}
          >
            <MessageSquare size={14} />
          </button>
        </>
      )}
    </BubbleMenu>
  );
}

/* Color values are content data stored in the document — editor exception per CLAUDE.md Rule 5 */
const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#000000"];

function ColorPicker({ onSelect, active }: { onSelect: (c: string) => void; active: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnBase} ${active ? btnActive : ""}`}
        aria-label="Text color"
      >
        <Paintbrush size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-10 flex gap-1 rounded-[var(--radius-sm)] border border-border bg-popover p-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); }}
              aria-label={`Set text color ${c}`}
              className="size-4 rounded-full border border-border/40 transition-colors duration-150"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
