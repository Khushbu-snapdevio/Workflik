"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef, useState } from "react";

import { Callout } from "./extensions/callout";
import { Toggle, ToggleSummary } from "./extensions/toggle";
import { ImageBlock, VideoBlock, AudioBlock, FileBlock } from "./extensions/media-blocks";
import {
  LinkedPage, InlineDatabase, TemplateButton, TableOfContents, MathBlock, Columns,
} from "./extensions/reference-blocks";
import { SlashCommands } from "./extensions/slash-commands";
import type { SlashSuggestionProps } from "./extensions/slash-commands";
import { blocksToTiptapDoc, tiptapDocToBlocks } from "./serializer";
import type { DbBlock } from "./serializer";
import { SlashMenu, type SlashMenuHandle } from "./slash-menu";
import { InlineToolbar } from "./inline-toolbar";
import { BlockHandle } from "./block-handle";

const lowlight = createLowlight(common);

const VERSION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface EditorProps {
  pageId:        string;
  isLocked:      boolean;
  isDeleted:     boolean;
  isEditor:      boolean;
  workspaceId?:  string;
  workspaceSlug?: string;
  fontFamily?:   "default" | "serif" | "mono";
  isSmallText?:  boolean;
}

export function PageEditor({ pageId, isLocked, isDeleted, isEditor, workspaceId = "", workspaceSlug = "", fontFamily = "default", isSmallText = false }: EditorProps) {
  const [saveState, setSaveState]         = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [initialBlocks, setInitialBlocks] = useState<DbBlock[] | null>(null);
  const [slashProps, setSlashProps]       = useState<SlashSuggestionProps | null>(null);

  // Ref to the slash menu component so the TipTap extension can forward keyboard events
  const slashMenuRef = useRef<SlashMenuHandle>(null);

  // Tracks persisted block IDs — updated after every save so we never re-insert existing rows
  const currentBlocksRef = useRef<DbBlock[]>([]);
  const saveTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved        = useRef<string>("");
  const lastVersionAt    = useRef<number>(0);
  const deletedIds       = useRef<string[]>([]);

  const editable = isEditor && !isLocked && !isDeleted;

  // Load blocks on mount
  useEffect(() => {
    fetch(`/api/pages/${pageId}/blocks`)
      .then((r) => r.json())
      .then((rows: DbBlock[]) => {
        currentBlocksRef.current = rows;
        setInitialBlocks(rows);
      })
      .catch(() => {
        currentBlocksRef.current = [];
        setInitialBlocks([]);
      });
  }, [pageId]);

  const save = useCallback(async (docJson: object) => {
    const docStr = JSON.stringify(docJson);
    if (docStr === lastSaved.current && deletedIds.current.length === 0) return;

    setSaveState("saving");
    try {
      const now = Date.now();
      const snapshot = now - lastVersionAt.current > VERSION_INTERVAL_MS;
      if (snapshot) lastVersionAt.current = now;

      const outgoing = tiptapDocToBlocks(
        docJson as { content?: never[] },
        pageId,
        currentBlocksRef.current,
      );

      const res = await fetch("/api/blocks/batch", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          pageId,
          blocks:        outgoing,
          deletedIds:    deletedIds.current,
          snapshotEvery: snapshot,
        }),
      });

      if (!res.ok) throw new Error("save failed");

      const data = await res.json() as { ok: boolean; blocks?: DbBlock[] };
      if (data.blocks) currentBlocksRef.current = data.blocks;

      deletedIds.current = [];
      lastSaved.current  = docStr;
      setSaveState("saved");
    } catch {
      setSaveState(navigator.onLine ? "idle" : "offline");
    }
  }, [pageId]);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "Heading" : "Start writing, or press / to insert a block…",
        includeChildren: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Toggle,
      ToggleSummary,
      ImageBlock,
      VideoBlock,
      AudioBlock,
      FileBlock,
      LinkedPage,
      InlineDatabase.configure({ workspaceId, workspaceSlug, isEditor }),
      TemplateButton,
      TableOfContents,
      MathBlock,
      Columns,
      // Slash command menu — uses @tiptap/suggestion so the range is always
      // maintained by the ProseMirror plugin (no manual position tracking).
      SlashCommands.configure({
        onUpdate:  (props) => setSlashProps(props),
        onKeyDown: (event) => slashMenuRef.current?.onKeyDown(event) ?? false,
      }),
    ],
    editable,
    content: initialBlocks ? blocksToTiptapDoc(initialBlocks) : undefined,
    onUpdate({ editor: e }) {
      if (!editable) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(e.getJSON()), 1000);
    },
  }, [initialBlocks]);

  // Sync editable flag when props change (e.g. page is locked after load)
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  // Flush pending save timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  if (initialBlocks === null) {
    return (
      <div className="space-y-3 animate-pulse">
        {[90, 60, 75, 45].map((w) => (
          <div key={w} className="h-4 rounded bg-foreground/8" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  const fontClass = fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "";
  const sizeClass = isSmallText ? "text-sm" : "text-[15px]";

  return (
    <div className="relative">
      {saveState !== "idle" && (
        <div className="absolute -top-7 right-0 text-[11px] text-muted-foreground/50 select-none">
          {saveState === "saving"  && <span className="animate-pulse">Saving…</span>}
          {saveState === "saved"   && <span>Saved</span>}
          {saveState === "offline" && <span className="text-amber-500">Offline — changes will sync when reconnected</span>}
        </div>
      )}

      {/* Inline formatting toolbar (BubbleMenu) */}
      {editor && editable && <InlineToolbar editor={editor} />}

      {/* Per-block handle — ⠿ grip button that appears on hover */}
      {editor && editable && <BlockHandle editor={editor} />}

      {/* Slash command popup — rendered when suggestion is active */}
      {slashProps && editable && (
        <SlashMenu ref={slashMenuRef} suggestionProps={slashProps} />
      )}

      <EditorContent
        editor={editor}
        className={["outline-none [&_.ProseMirror]:min-h-[120px]", fontClass, sizeClass].join(" ")}
      />
    </div>
  );
}
