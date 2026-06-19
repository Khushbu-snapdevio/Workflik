"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useRef, useState } from "react";

import { Callout } from "@/components/editor/extensions/callout";
import { Toggle, ToggleSummary } from "@/components/editor/extensions/toggle";
import { SlashCommands } from "@/components/editor/extensions/slash-commands";
import type { SlashSuggestionProps } from "@/components/editor/extensions/slash-commands";
import { SlashMenu, type SlashMenuHandle } from "@/components/editor/slash-menu";
import { InlineToolbar } from "@/components/editor/inline-toolbar";
import { blocksToTiptapDoc, tiptapDocToBlocks } from "@/components/editor/serializer";
import type { DbBlock } from "@/components/editor/serializer";

const lowlight = createLowlight(common);

interface Props {
  initialBlocks: DbBlock[];
  onChange: (blocks: DbBlock[]) => void;
}

export function TemplateEditor({ initialBlocks, onChange }: Props) {
  const [slashProps, setSlashProps] = useState<SlashSuggestionProps | null>(null);
  const slashMenuRef = useRef<SlashMenuHandle>(null);
  const changeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Heading"
            : "Start writing template content, or press / to insert a block…",
        includeChildren: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Callout,
      Toggle,
      ToggleSummary,
      SlashCommands.configure({
        onUpdate:  (props) => setSlashProps(props),
        onKeyDown: (event) => slashMenuRef.current?.onKeyDown(event) ?? false,
      }),
    ],
    editable: true,
    content: blocksToTiptapDoc(initialBlocks),
    onUpdate({ editor: e }) {
      if (changeTimer.current) clearTimeout(changeTimer.current);
      changeTimer.current = setTimeout(() => {
        const raw = tiptapDocToBlocks(
          e.getJSON() as unknown as { content?: never[] },
          "template",
          initialBlocks,
        );
        const blocks: DbBlock[] = raw.map((b, i) => ({
          id:            b.id ?? `tmp-${i}`,
          type:          b.type,
          content:       b.content,
          orderIndex:    i,
          parentBlockId: b.parentBlockId,
        }));
        onChange(blocks);
      }, 300);
    },
  });

  return (
    <div className="relative min-h-[320px] rounded-xl border border-border bg-background">
      {editor && <InlineToolbar editor={editor} />}

      <EditorContent
        editor={editor}
        className="prose prose-neutral dark:prose-invert max-w-none px-8 py-6 text-[15px] focus-within:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground/40 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
      />

      {slashProps && (
        <SlashMenu ref={slashMenuRef} suggestionProps={slashProps} />
      )}
    </div>
  );
}
