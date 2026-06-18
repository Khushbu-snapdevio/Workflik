// Converts between our DB block format and TipTap JSON.
// DB content shape is defined in doc/Features/editor.md § Data Model.

export type InlineNode =
  | { text: string; marks?: string[]; attrs?: Record<string, unknown> }
  | { type: "mention" | "pageMention" | "dateMention"; attrs: Record<string, unknown> };

export interface BlockContent {
  text?:        InlineNode[];
  level?:       number;
  checked?:     boolean;
  language?:    string;
  code?:        string;
  lineNumbers?: boolean;
  expression?:  string;
  url?:         string;
  caption?:     string;
  width?:       number;
  objectKey?:   string;
  pageId?:      string;
  databaseId?:  string;
  defaultViewId?: string;
  columnCount?: number;
  label?:       string;
  icon?:        string;   // for callout
  color?:       string;   // for callout bg
}

// TipTap mark → our mark string
function tiptapMarkToString(mark: { type: string; attrs?: Record<string, unknown> }): string | { type: string; attrs: Record<string, unknown> } {
  if (mark.type === "link") return { type: "link", attrs: { href: mark.attrs?.href ?? "" } };
  return mark.type; // bold, italic, underline, strike, code, highlight, textStyle
}

// Our mark string → TipTap mark
function stringToTiptapMark(mark: string | { type: string; attrs: Record<string, unknown> }): Record<string, unknown> {
  if (typeof mark === "object") return { type: mark.type, attrs: mark.attrs };
  if (mark === "strikethrough") return { type: "strike" };
  if (mark === "textColor") return { type: "textStyle" };
  return { type: mark };
}

// TipTap inline content array → our InlineNode array
function tiptapContentToInline(nodes: TipTapNode[]): InlineNode[] {
  const result: InlineNode[] = [];
  for (const n of nodes ?? []) {
    if (n.type === "text") {
      result.push({
        text: n.text ?? "",
        marks: (n.marks ?? []).map((m) => {
          const s = tiptapMarkToString(m as { type: string; attrs?: Record<string, unknown> });
          return typeof s === "string" ? s : JSON.stringify(s);
        }),
      });
    } else if (n.type === "mention" || n.type === "pageMention" || n.type === "dateMention") {
      result.push({ type: n.type, attrs: n.attrs ?? {} });
    }
  }
  return result;
}

// Our InlineNode array → TipTap inline content array
function inlineToTiptapContent(nodes: InlineNode[]): TipTapNode[] {
  return (nodes ?? []).map((n): TipTapNode => {
    if ("type" in n) {
      return { type: n.type, attrs: n.attrs };
    }
    const marks = (n.marks ?? []).map((m) => {
      try { const p = JSON.parse(m) as string | { type: string; attrs: Record<string, unknown> }; return stringToTiptapMark(p) as { type: string; attrs?: Record<string, unknown> }; } catch { return stringToTiptapMark(m) as { type: string; attrs?: Record<string, unknown> }; }
    });
    const node: TipTapNode = { type: "text", text: n.text };
    if (marks.length) node.marks = marks;
    return node;
  });
}

export interface TipTapNode {
  type:     string;
  attrs?:   Record<string, unknown>;
  content?: TipTapNode[];
  marks?:   { type: string; attrs?: Record<string, unknown> }[];
  text?:    string;
}

export interface DbBlock {
  id:            string;
  type:          string;
  content:       BlockContent;
  orderIndex:    number;
  parentBlockId: string | null;
  children?:     DbBlock[];
}

// Convert one DB block → TipTap node
export function blockToTipTapNode(block: DbBlock): TipTapNode {
  const c = block.content;
  const id = block.id;

  switch (block.type) {
    case "paragraph":
      return { type: "paragraph", attrs: { blockId: id }, content: inlineToTiptapContent(c.text ?? []) };

    case "h1":
      return { type: "heading", attrs: { level: 1, blockId: id }, content: inlineToTiptapContent(c.text ?? []) };
    case "h2":
      return { type: "heading", attrs: { level: 2, blockId: id }, content: inlineToTiptapContent(c.text ?? []) };
    case "h3":
      return { type: "heading", attrs: { level: 3, blockId: id }, content: inlineToTiptapContent(c.text ?? []) };

    case "bullet":
      return {
        type: "bulletList", attrs: { blockId: id },
        content: [{ type: "listItem", content: [{ type: "paragraph", content: inlineToTiptapContent(c.text ?? []) }] }],
      };

    case "numbered":
      return {
        type: "orderedList", attrs: { blockId: id },
        content: [{ type: "listItem", content: [{ type: "paragraph", content: inlineToTiptapContent(c.text ?? []) }] }],
      };

    case "todo":
      return {
        type: "taskList", attrs: { blockId: id },
        content: [{
          type: "taskItem", attrs: { checked: c.checked ?? false },
          content: [{ type: "paragraph", content: inlineToTiptapContent(c.text ?? []) }],
        }],
      };

    case "quote":
      return {
        type: "blockquote", attrs: { blockId: id },
        content: [{ type: "paragraph", content: inlineToTiptapContent(c.text ?? []) }],
      };

    case "callout":
      return {
        type: "callout", attrs: { blockId: id, icon: c.icon ?? "💡", color: c.color ?? "" },
        content: [{ type: "paragraph", content: inlineToTiptapContent(c.text ?? []) }],
      };

    case "toggle":
      return {
        type: "toggle", attrs: { blockId: id },
        content: [
          { type: "toggleSummary", content: inlineToTiptapContent(c.text ?? []) },
          ...(block.children ?? []).map(blockToTipTapNode),
        ],
      };

    case "divider":
      return { type: "horizontalRule", attrs: { blockId: id } };

    case "code": {
      const codeText = c.code ?? "";
      return { type: "codeBlock", attrs: { language: c.language ?? "", blockId: id }, content: codeText ? [{ type: "text", text: codeText }] : [] };
    }

    case "equation":
      return { type: "mathBlock", attrs: { expression: c.expression ?? "", blockId: id } };

    case "image":
      return { type: "imageBlock", attrs: { src: c.url ?? "", caption: c.caption ?? "", width: c.width ?? 720, objectKey: c.objectKey ?? "", blockId: id } };

    case "video":
      return { type: "videoBlock", attrs: { src: c.url ?? "", caption: c.caption ?? "", blockId: id } };

    case "audio":
      return { type: "audioBlock", attrs: { src: c.url ?? "", caption: c.caption ?? "", blockId: id } };

    case "file":
      return { type: "fileBlock", attrs: { src: c.url ?? "", caption: c.caption ?? "", objectKey: c.objectKey ?? "", blockId: id } };

    case "toc":
      return { type: "tableOfContents", attrs: { blockId: id } };

    case "columns":
      return {
        type: "columns", attrs: { columnCount: c.columnCount ?? 2, blockId: id },
        content: block.children?.map(blockToTipTapNode) ?? [],
      };

    case "linked_page":
      return { type: "linkedPage", attrs: { pageId: c.pageId ?? "", blockId: id } };

    case "database":
      return { type: "inlineDatabase", attrs: { databaseId: c.databaseId ?? "", defaultViewId: c.defaultViewId ?? "", blockId: id } };

    case "template_button":
      return { type: "templateButton", attrs: { label: c.label ?? "Template", blockId: id } };

    case "table":
      return { type: "table", attrs: { blockId: id }, content: block.children?.map(blockToTipTapNode) ?? [] };

    default:
      return { type: "paragraph", attrs: { blockId: id }, content: [] };
  }
}

// Convert TipTap node → DB block content shape
export function tiptapNodeToBlockContent(node: TipTapNode): { type: string; content: BlockContent } {
  switch (node.type) {
    case "paragraph":
      return { type: "paragraph", content: { text: tiptapContentToInline(node.content ?? []) } };

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const t = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      return { type: t, content: { text: tiptapContentToInline(node.content ?? []) } };
    }

    case "bulletList":
    case "listItem": {
      const inner = node.content?.[0];
      return { type: "bullet", content: { text: tiptapContentToInline(inner?.content ?? []) } };
    }

    case "orderedList": {
      const inner = node.content?.[0]?.content?.[0];
      return { type: "numbered", content: { text: tiptapContentToInline(inner?.content ?? []) } };
    }

    case "taskList":
    case "taskItem": {
      const inner = node.content?.[0]?.content?.[0];
      return { type: "todo", content: { checked: (node.attrs?.checked as boolean) ?? false, text: tiptapContentToInline(inner?.content ?? []) } };
    }

    case "blockquote": {
      const inner = node.content?.[0];
      return { type: "quote", content: { text: tiptapContentToInline(inner?.content ?? []) } };
    }

    case "callout": {
      const inner = node.content?.[0];
      return { type: "callout", content: { icon: (node.attrs?.icon as string) ?? "💡", color: (node.attrs?.color as string) ?? "", text: tiptapContentToInline(inner?.content ?? []) } };
    }

    case "toggle": {
      const summary = node.content?.[0];
      return { type: "toggle", content: { text: tiptapContentToInline(summary?.content ?? []) } };
    }

    case "horizontalRule":
      return { type: "divider", content: {} };

    case "codeBlock":
      return { type: "code", content: { language: (node.attrs?.language as string) ?? "", code: node.content?.[0]?.text ?? "", lineNumbers: true } };

    case "mathBlock":
      return { type: "equation", content: { expression: (node.attrs?.expression as string) ?? "" } };

    case "imageBlock":
      return { type: "image", content: { url: (node.attrs?.src as string) ?? "", caption: (node.attrs?.caption as string) ?? "", width: (node.attrs?.width as number) ?? 720, objectKey: (node.attrs?.objectKey as string) ?? "" } };

    case "videoBlock":
      return { type: "video", content: { url: (node.attrs?.src as string) ?? "", caption: (node.attrs?.caption as string) ?? "" } };

    case "audioBlock":
      return { type: "audio", content: { url: (node.attrs?.src as string) ?? "", caption: (node.attrs?.caption as string) ?? "" } };

    case "fileBlock":
      return { type: "file", content: { url: (node.attrs?.src as string) ?? "", caption: (node.attrs?.caption as string) ?? "", objectKey: (node.attrs?.objectKey as string) ?? "" } };

    case "tableOfContents":
      return { type: "toc", content: {} };

    case "columns":
      return { type: "columns", content: { columnCount: (node.attrs?.columnCount as number) ?? 2 } };

    case "linkedPage":
      return { type: "linked_page", content: { pageId: (node.attrs?.pageId as string) ?? "" } };

    case "inlineDatabase":
      return { type: "database", content: { databaseId: (node.attrs?.databaseId as string) ?? "", defaultViewId: (node.attrs?.defaultViewId as string) ?? "" } };

    case "templateButton":
      return { type: "template_button", content: { label: (node.attrs?.label as string) ?? "Template" } };

    default:
      return { type: "paragraph", content: { text: [] } };
  }
}

// Build a flat list of DB blocks from TipTap document JSON (top-level only; nested handled recursively)
export function tiptapDocToBlocks(
  doc: { content?: TipTapNode[] },
  pageId: string,
  existingBlocks: DbBlock[],   // to match blockId attrs → existing UUIDs
): Array<{ id: string | null; pageId: string; parentBlockId: string | null; type: string; content: BlockContent; orderIndex: number; schemaVersion: number }> {
  const idMap = new Map(existingBlocks.map((b) => [b.id, b]));
  const result: Array<{ id: string | null; pageId: string; parentBlockId: string | null; type: string; content: BlockContent; orderIndex: number; schemaVersion: number }> = [];

  function walk(nodes: TipTapNode[], parentBlockId: string | null, startIndex: number) {
    nodes.forEach((node, i) => {
      const blockId = (node.attrs?.blockId as string) ?? null;
      const { type, content } = tiptapNodeToBlockContent(node);

      result.push({
        id:            blockId && idMap.has(blockId) ? blockId : null,
        pageId,
        parentBlockId,
        type,
        content,
        orderIndex:    startIndex + i,
        schemaVersion: 1,
      });

      // Walk children for toggle and columns
      if (node.type === "toggle" && node.content && node.content.length > 1) {
        walk(node.content.slice(1), blockId, 0);
      }
      if (node.type === "columns" && node.content) {
        walk(node.content, blockId, 0);
      }
    });
  }

  walk(doc.content ?? [], null, 0);
  return result;
}

// Convert flat DB blocks to TipTap document JSON
export function blocksToTiptapDoc(blocks: DbBlock[]): { type: "doc"; content: TipTapNode[] } {
  const roots = blocks.filter((b) => !b.parentBlockId).sort((a, b) => a.orderIndex - b.orderIndex);
  const childMap = new Map<string, DbBlock[]>();
  for (const b of blocks) {
    if (b.parentBlockId) {
      const arr = childMap.get(b.parentBlockId) ?? [];
      arr.push(b);
      childMap.set(b.parentBlockId, arr);
    }
  }

  function buildNode(block: DbBlock): TipTapNode {
    const children = (childMap.get(block.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
    return blockToTipTapNode({ ...block, children });
  }

  return { type: "doc", content: roots.map(buildNode) };
}
