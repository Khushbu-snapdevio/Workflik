// Single source of truth for all block types.
// Never add a switch(blockType) anywhere else in the codebase (Rule 12).

export type BlockType =
  | "paragraph" | "h1" | "h2" | "h3"
  | "bullet" | "numbered" | "toggle" | "quote" | "callout" | "divider"
  | "todo" | "image" | "video" | "audio" | "file"
  | "toc" | "table" | "columns" | "code" | "equation"
  | "linked_page" | "database" | "template_button" | "template_gallery";

export interface BlockDefinition {
  type:        BlockType;
  label:       string;
  description: string;
  icon:        string;       // emoji used in slash menu
  category:    "text" | "task" | "media" | "structure" | "code" | "reference";
  slashCmd:    string;       // what user types after /
  mdShortcut?: string;       // markdown shortcut hint
  // Phase 7+: media blocks require file upload; stub until then
  requiresPhase?: number;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {
  paragraph: {
    type: "paragraph", label: "Text", description: "Just start writing with plain text.",
    icon: "¶", category: "text", slashCmd: "paragraph",
  },
  h1: {
    type: "h1", label: "Heading 1", description: "Big section heading.",
    icon: "H₁", category: "text", slashCmd: "h1", mdShortcut: "# ",
  },
  h2: {
    type: "h2", label: "Heading 2", description: "Medium section heading.",
    icon: "H₂", category: "text", slashCmd: "h2", mdShortcut: "## ",
  },
  h3: {
    type: "h3", label: "Heading 3", description: "Small section heading.",
    icon: "H₃", category: "text", slashCmd: "h3", mdShortcut: "### ",
  },
  bullet: {
    type: "bullet", label: "Bulleted List", description: "Create a simple bulleted list.",
    icon: "•", category: "text", slashCmd: "bullet", mdShortcut: "- ",
  },
  numbered: {
    type: "numbered", label: "Numbered List", description: "Create a list with numbering.",
    icon: "1.", category: "text", slashCmd: "numbered", mdShortcut: "1. ",
  },
  toggle: {
    type: "toggle", label: "Toggle List", description: "Toggles can hide and show content inside.",
    icon: "▶", category: "text", slashCmd: "toggle", mdShortcut: "> ",
  },
  quote: {
    type: "quote", label: "Quote", description: "Capture a quote.",
    icon: "❝", category: "text", slashCmd: "quote", mdShortcut: '" ',
  },
  callout: {
    type: "callout", label: "Callout", description: "Make writing stand out.",
    icon: "💡", category: "text", slashCmd: "callout",
  },
  divider: {
    type: "divider", label: "Divider", description: "Visually divide blocks.",
    icon: "—", category: "text", slashCmd: "divider", mdShortcut: "---",
  },
  todo: {
    type: "todo", label: "To-Do", description: "Track tasks with a to-do list.",
    icon: "☑", category: "task", slashCmd: "todo", mdShortcut: "[] ",
  },
  image: {
    type: "image", label: "Image", description: "Upload or embed with a link.",
    icon: "🖼", category: "media", slashCmd: "image",
  },
  video: {
    type: "video", label: "Video", description: "Embed from YouTube, Vimeo, or upload.",
    icon: "🎬", category: "media", slashCmd: "video",
  },
  audio: {
    type: "audio", label: "Audio", description: "Embed an audio file.",
    icon: "🎵", category: "media", slashCmd: "audio",
  },
  file: {
    type: "file", label: "File", description: "Upload any file.",
    icon: "📎", category: "media", slashCmd: "file",
  },
  toc: {
    type: "toc", label: "Table of Contents", description: "Show an outline of the page.",
    icon: "≡", category: "structure", slashCmd: "toc",
  },
  table: {
    type: "table", label: "Simple Table", description: "Add a simple table.",
    icon: "⊞", category: "structure", slashCmd: "table",
  },
  columns: {
    type: "columns", label: "Columns", description: "Create a multi-column layout.",
    icon: "⫿", category: "structure", slashCmd: "columns",
  },
  code: {
    type: "code", label: "Code", description: "Capture a code snippet.",
    icon: "</>", category: "code", slashCmd: "code", mdShortcut: "```",
  },
  equation: {
    type: "equation", label: "Equation", description: "Write a LaTeX math equation.",
    icon: "∑", category: "code", slashCmd: "equation",
  },
  linked_page: {
    type: "linked_page", label: "Link to Page", description: "Link to an existing page.",
    icon: "↗", category: "reference", slashCmd: "page",
  },
  database: {
    type: "database", label: "Inline Database", description: "Embed a database inside the page.",
    icon: "⊞", category: "reference", slashCmd: "database", requiresPhase: 8,
  },
  template_button: {
    type: "template_button", label: "Template Button", description: "A button that inserts a block template.",
    icon: "⚡", category: "reference", slashCmd: "template-button", requiresPhase: 9,
  },
  template_gallery: {
    type: "template_gallery", label: "Template Gallery", description: "Browse and apply a page template.",
    icon: "🗂", category: "reference", slashCmd: "template",
  },
};

export const BLOCK_CATEGORIES: { label: string; key: BlockDefinition["category"] }[] = [
  { label: "Text",      key: "text" },
  { label: "Task",      key: "task" },
  { label: "Media",     key: "media" },
  { label: "Structure", key: "structure" },
  { label: "Code",      key: "code" },
  { label: "Reference", key: "reference" },
];

export function getBlocksByCategory(category: BlockDefinition["category"]): BlockDefinition[] {
  return Object.values(BLOCK_REGISTRY).filter((b) => b.category === category);
}

export function searchBlocks(query: string): BlockDefinition[] {
  const q = query.toLowerCase();
  return Object.values(BLOCK_REGISTRY).filter(
    (b) => b.label.toLowerCase().includes(q) || b.slashCmd.toLowerCase().includes(q)
  );
}
