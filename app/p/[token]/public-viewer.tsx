"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import { Callout } from "@/components/editor/extensions/callout";
import { Toggle, ToggleSummary } from "@/components/editor/extensions/toggle";
import { ImageBlock, VideoBlock, AudioBlock, FileBlock } from "@/components/editor/extensions/media-blocks";
import { LinkedPage, InlineDatabase, TemplateButton, TableOfContents, MathBlock, Columns } from "@/components/editor/extensions/reference-blocks";
import { blocksToTiptapDoc, type DbBlock } from "@/components/editor/serializer";

const lowlight = createLowlight(common);

interface Props {
  blocks: DbBlock[];
}

export function PublicPageViewer({ blocks }: Props) {
  const editor = useEditor({
    immediatelyRender: true,
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
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
      InlineDatabase.configure({ workspaceId: "", workspaceSlug: "", isEditor: false }),
      TemplateButton,
      TableOfContents,
      MathBlock,
      Columns,
    ],
    content: blocksToTiptapDoc(blocks),
  });

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm sm:prose-base max-w-none focus:outline-none"
    />
  );
}
