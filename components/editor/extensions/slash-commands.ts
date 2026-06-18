import { Extension } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionProps } from "@tiptap/suggestion";
import { BLOCK_REGISTRY, searchBlocks, type BlockDefinition } from "../block-registry";

export type SlashSuggestionProps = SuggestionProps<BlockDefinition>;

export interface SlashCommandsOptions {
  onUpdate:  (props: SlashSuggestionProps | null) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return {
      onUpdate:  () => {},
      onKeyDown: () => false,
    };
  },

  addProseMirrorPlugins() {
    // Capture options in a local ref so the render callbacks always call the
    // latest React setters without recreating the plugin on every render.
    const opts = this.options;

    return [
      Suggestion<BlockDefinition>({
        editor: this.editor,
        char:          "/",
        startOfLine:   false,
        allowSpaces:   false,

        // Returns block items filtered by the user's query
        items: ({ query }) =>
          query.trim() ? searchBlocks(query) : Object.values(BLOCK_REGISTRY),

        // Called by the menu when the user picks a block.
        // `range` is plugin-maintained and always points at "/" … cursor.
        command: ({ editor, range, props: def }) => {
          const native: Partial<Record<string, () => boolean>> = {
            paragraph: () => editor.chain().deleteRange(range).setParagraph().run(),
            h1:        () => editor.chain().deleteRange(range).setHeading({ level: 1 }).run(),
            h2:        () => editor.chain().deleteRange(range).setHeading({ level: 2 }).run(),
            h3:        () => editor.chain().deleteRange(range).setHeading({ level: 3 }).run(),
            bullet:    () => editor.chain().deleteRange(range).toggleBulletList().run(),
            numbered:  () => editor.chain().deleteRange(range).toggleOrderedList().run(),
            todo:      () => editor.chain().deleteRange(range).toggleTaskList().run(),
            quote:     () => editor.chain().deleteRange(range).setBlockquote().run(),
            code:      () => editor.chain().deleteRange(range).setCodeBlock().run(),
            table:     () => editor.chain().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          };

          if (native[def.type]) { native[def.type]!(); return; }

          const custom: Partial<Record<string, object>> = {
            divider:         { type: "horizontalRule" },
            callout:         { type: "callout",       attrs: { icon: "💡", color: "" }, content: [{ type: "paragraph" }] },
            toggle:          { type: "toggle", attrs: { open: true }, content: [{ type: "toggleSummary", content: [] }, { type: "paragraph" }] },
            image:           { type: "imageBlock",     attrs: { src: "", caption: "", width: 720 } },
            video:           { type: "videoBlock",     attrs: { src: "", caption: "" } },
            audio:           { type: "audioBlock",     attrs: { src: "", caption: "" } },
            file:            { type: "fileBlock",      attrs: { src: "", caption: "" } },
            toc:             { type: "tableOfContents" },
            equation:        { type: "mathBlock",      attrs: { expression: "" } },
            columns:         { type: "columns",        attrs: { columnCount: 2 }, content: [{ type: "paragraph" }, { type: "paragraph" }] },
            linked_page:     { type: "linkedPage",     attrs: { pageId: "" } },
            database:        { type: "inlineDatabase", attrs: { databaseId: "", defaultViewId: "" } },
            template_button: { type: "templateButton", attrs: { label: "Template" } },
          };

          const content = custom[def.type];
          if (content) editor.chain().deleteRange(range).insertContentAt(range.from, content).run();
        },

        render: () => ({
          onStart:  (props) => opts.onUpdate(props),
          onUpdate: (props) => opts.onUpdate(props),
          onExit:   ()     => opts.onUpdate(null),
          onKeyDown: ({ event }) => opts.onKeyDown(event),
        }),
      }),
    ];
  },
});
