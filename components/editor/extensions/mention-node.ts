import { Node, mergeAttributes } from "@tiptap/react";

// Inline atom node that stores @mention data (user / page / date).
// Required so TipTap serializes the node to JSON correctly; without this
// the schema drops unknown nodes silently and notifications never fire.
export const MentionNode = Node.create({
  name:       "mention",
  group:      "inline",
  inline:     true,
  selectable: false,
  atom:       true,

  addAttributes() {
    return {
      mentionType: { default: "user" },
      id:          { default: null },
      label:       { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention-type]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const cls =
      node.attrs.mentionType === "user"
        ? "text-primary font-medium bg-primary/[0.06] rounded px-0.5 not-prose cursor-pointer"
        : node.attrs.mentionType === "page"
        ? "text-foreground underline decoration-dotted not-prose cursor-pointer"
        : "text-accent-foreground font-medium not-prose cursor-pointer";

    return [
      "span",
      mergeAttributes(
        { "data-mention-type": node.attrs.mentionType, contenteditable: "false", class: cls },
        HTMLAttributes,
      ),
      `@${node.attrs.label ?? ""}`,
    ];
  },
});
