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
import { createPortal } from "react-dom";

import { CommentHighlight, setCommentHighlights, type HighlightComment } from "./extensions/comment-highlight";
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
import { CommentCard } from "./comment-card";
import { CommentGutter } from "./comment-gutter";
import { TemplateGalleryModal } from "@/components/templates/template-gallery-modal";
import { MentionCommands, type MentionSuggestionProps } from "./extensions/mention-extension";
import { MentionList, type MentionListHandle } from "./mention-list";

const lowlight = createLowlight(common);

const VERSION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface EditorProps {
  pageId:         string;
  isLocked:       boolean;
  isDeleted:      boolean;
  isEditor:       boolean;
  isAdmin?:       boolean;
  currentUserId?: string;
  workspaceId?:   string;
  workspaceSlug?: string;
  fontFamily?:    "default" | "serif" | "mono";
  isSmallText?:   boolean;
}

export function PageEditor({ pageId, isLocked, isDeleted, isEditor, isAdmin = false, currentUserId = "", workspaceId = "", workspaceSlug = "", fontFamily = "default", isSmallText = false }: EditorProps) {
  const [saveState, setSaveState]               = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [initialBlocks, setInitialBlocks]       = useState<DbBlock[] | null>(null);
  const [slashProps, setSlashProps]             = useState<SlashSuggestionProps | null>(null);
  const [mentionProps, setMentionProps]         = useState<MentionSuggestionProps | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const mentionListRef = useRef<MentionListHandle>(null);
  const [gutterRefresh, setGutterRefresh] = useState(0);
  const highlightCommentsRef = useRef<HighlightComment[]>([]);

  // Comment card state — which block's card is open, optional text-range anchor, and Y offset
  const [commentCard, setCommentCard] = useState<{
    blockId:     string | null;
    anchorStart: number | null;
    anchorEnd:   number | null;
    blockY:      number;           // px from top of editor container
  } | null>(null);

  function openCommentCard(blockId: string | null, anchorStart: number | null, anchorEnd: number | null, blockY = 0) {
    setCommentCard({ blockId, anchorStart, anchorEnd, blockY });
  }
  function closeCommentCard() {
    setCommentCard(null);
    setGutterRefresh((n) => n + 1);
  }

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
      CommentHighlight,
      // Slash command menu — uses @tiptap/suggestion so the range is always
      // maintained by the ProseMirror plugin (no manual position tracking).
      SlashCommands.configure({
        onUpdate:              (props) => setSlashProps(props),
        onKeyDown:             (event) => slashMenuRef.current?.onKeyDown(event) ?? false,
        onOpenTemplateGallery: ()      => setShowTemplateGallery(true),
      }),
      // @mention extension — @name / @page / @date
      ...(workspaceId
        ? [MentionCommands.configure({
            workspaceId,
            onUpdate:  (props) => setMentionProps(props),
            onKeyDown: (event) => mentionListRef.current?.onKeyDown(event) ?? false,
          })]
        : []),
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

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const textRange: HighlightComment[] = (data.comments ?? []).flatMap(
          (t: { id: string; blockId: string | null; anchorStart: number | null; anchorEnd: number | null; isResolved: boolean; deletedAt: string | null }) => {
            if (!t.anchorStart || !t.anchorEnd || t.isResolved || t.deletedAt) return [];
            return [{ id: t.id, blockId: t.blockId, anchorStart: t.anchorStart, anchorEnd: t.anchorEnd }];
          }
        );
        highlightCommentsRef.current = textRange;
        try { setCommentHighlights(editor.view, textRange); } catch { /* editor not yet mounted */ }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pageId, editor, gutterRefresh]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    let editorEl: HTMLElement;
    try {
      if (!editor.view?.dom) return;
      editorEl = editor.view.dom as HTMLElement;
    } catch {
      return;
    }
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const highlighted = target.closest(".comment-highlight") as HTMLElement | null;
      if (!highlighted) return;
      const commentId = highlighted.dataset.commentId;
      if (!commentId) return;
      const comment = highlightCommentsRef.current.find((c) => c.id === commentId);
      if (!comment) return;
      const hit = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      const blockY = hit
        ? editor.view.coordsAtPos(hit.pos).top - 20
        : e.clientY - 20;
      openCommentCard(comment.blockId, comment.anchorStart, comment.anchorEnd, blockY);
    }
    editorEl.addEventListener("click", handleClick);
    return () => editorEl.removeEventListener("click", handleClick);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+Shift+Alt+X → open comment card on active block
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key === "X") {
        e.preventDefault();
        openCommentCard(null, null, null);  // page-level comment (no specific block)
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
  const sizeClass = isSmallText ? "text-sm" : "text-base";

  return (
    <div className="relative">
      {saveState !== "idle" && (
        <div className="absolute -top-7 right-0 text-xs text-muted-foreground/50 select-none">
          {saveState === "saving"  && <span className="animate-pulse">Saving…</span>}
          {saveState === "saved"   && <span>Saved</span>}
          {saveState === "offline" && <span className="text-amber-500">Offline — changes will sync when reconnected</span>}
        </div>
      )}

      {/* Inline formatting toolbar (BubbleMenu) — includes Comment button */}
      {editor && editable && (
        <InlineToolbar
          editor={editor}
          onCommentSelection={(anchorStart, anchorEnd) => {
            // Position the card near the current selection
            const { from } = editor.state.selection;
            const coords = editor.view.coordsAtPos(from);
            const blockY = coords.top - 20;
            openCommentCard(null, anchorStart, anchorEnd, blockY);
          }}
        />
      )}

      {/* Per-block handle — ⠿ grip button that appears on hover */}
      {editor && editable && (
        <BlockHandle
          editor={editor}
          onComment={(nodePos, absoluteY) => {
            const blockY = absoluteY - 20;

            // Custom nodes store blockId in attrs; standard nodes need index-based lookup
            const doc = editor.state.doc;
            const node = doc.nodeAt(nodePos);
            const attrId = node?.attrs?.blockId as string | undefined;
            if (attrId) { openCommentCard(attrId, null, null, blockY); return; }

            let foundIdx = -1;
            doc.forEach((_child, offset, idx) => {
              if (offset === nodePos) foundIdx = idx;
            });
            if (foundIdx >= 0) {
              const sorted = [...currentBlocksRef.current].sort((a, b) => a.orderIndex - b.orderIndex);
              const blockId = sorted[foundIdx]?.id;
              if (blockId) openCommentCard(blockId, null, null, blockY);
            }
          }}
        />
      )}

      {/* Slash command popup — rendered when suggestion is active */}
      {slashProps && editable && (
        <SlashMenu ref={slashMenuRef} suggestionProps={slashProps} />
      )}

      {/* @mention popup */}
      {mentionProps && editable && (
        <MentionList ref={mentionListRef} suggestionProps={mentionProps} />
      )}

      <EditorContent
        editor={editor}
        className={["outline-none [&_.ProseMirror]:min-h-[120px]", fontClass, sizeClass].join(" ")}
      />

      {/* Comment gutter — speech-bubble badges in right margin, hidden for the open card's block */}
      {editor && workspaceId && (
        <CommentGutter
          pageId={pageId}
          editor={editor}
          blocksRef={currentBlocksRef}
          refresh={gutterRefresh}
          activeBlockId={commentCard?.blockId ?? null}
          onOpen={(blockId) => {
            // Resolve Y for this block from its gutter badge position
            const sorted = [...currentBlocksRef.current].sort((a, b) => a.orderIndex - b.orderIndex);
            const idx = sorted.findIndex((b) => b.id === blockId);
            let blockY = 0;
            if (idx >= 0) {
              let nodeOffset: number | null = null;
              editor.state.doc.forEach((_n, offset, di) => { if (di === idx) nodeOffset = offset; });
              if (nodeOffset !== null) {
                try {
                  const editorEl = editor.view.dom as HTMLElement;
                  const editorRect = editorEl.getBoundingClientRect();
                  const domInfo = editor.view.domAtPos(nodeOffset + 1);
                  let el = domInfo.node as HTMLElement;
                  if (el.nodeType === Node.TEXT_NODE) el = el.parentElement!;
                  while (el.parentElement && el.parentElement !== editorEl) el = el.parentElement;
                  blockY = el.getBoundingClientRect().top - editorRect.top - 20;
                } catch { /* ignore */ }
              }
            }
            openCommentCard(blockId, null, null, blockY);
          }}
        />
      )}

      {/* Template gallery modal — opened via /template slash command */}
      {showTemplateGallery && workspaceId && workspaceSlug && (
        <TemplateGalleryModal
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          parentId={pageId}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Floating comment card — fixed to viewport right edge, no layout overflow */}
      {commentCard && workspaceId && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", right: 16, top: Math.max(8, commentCard.blockY), zIndex: 400, width: 400 }}>
          <CommentCard
            pageId={pageId}
            workspaceId={workspaceId}
            blockId={commentCard.blockId}
            anchorStart={commentCard.anchorStart}
            anchorEnd={commentCard.anchorEnd}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onClose={closeCommentCard}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
