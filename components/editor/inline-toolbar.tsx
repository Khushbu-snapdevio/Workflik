"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  TextBIcon, TextItalicIcon, TextUnderlineIcon, TextStrikethroughIcon,
  CodeIcon, LinkIcon, PaintBucketIcon, HighlighterIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  editor: Editor;
}

const btnBase = "flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const btnActive = "bg-accent text-foreground";

export function InlineToolbar({ editor }: Props) {
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
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
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
            className="h-6 w-48 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <button type="button" onClick={applyLink} className="text-xs font-medium text-primary hover:underline">
            Apply
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btnBase} ${editor.isActive("bold") ? btnActive : ""}`}
            title="Bold (Ctrl+B)"
          >
            <TextBIcon size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btnBase} ${editor.isActive("italic") ? btnActive : ""}`}
            title="Italic (Ctrl+I)"
          >
            <TextItalicIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`${btnBase} ${editor.isActive("underline") ? btnActive : ""}`}
            title="Underline (Ctrl+U)"
          >
            <TextUnderlineIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${btnBase} ${editor.isActive("strike") ? btnActive : ""}`}
            title="Strikethrough"
          >
            <TextStrikethroughIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`${btnBase} ${editor.isActive("code") ? btnActive : ""}`}
            title="Inline Code (Ctrl+E)"
          >
            <CodeIcon size={14} />
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
            title="Link (Ctrl+K)"
          >
            <LinkIcon size={14} />
          </button>

          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Text colour — 6 quick swatches */}
          <ColorPicker
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            active={editor.isActive("textStyle")}
          />
          {/* Highlight */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fde047" }).run()}
            className={`${btnBase} ${editor.isActive("highlight") ? btnActive : ""}`}
            title="Highlight"
          >
            <HighlighterIcon size={14} />
          </button>
        </>
      )}
    </BubbleMenu>
  );
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#000000"];

function ColorPicker({ onSelect, active }: { onSelect: (c: string) => void; active: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnBase} ${active ? btnActive : ""}`}
        title="Text color"
      >
        <PaintBucketIcon size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-10 flex gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); }}
              className="size-4 rounded-full border border-border/40 transition-transform hover:scale-110"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
