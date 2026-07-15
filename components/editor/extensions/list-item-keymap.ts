import { ListItem } from "@tiptap/extension-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

// This app's data model treats every bullet/numbered/checklist block as its
// own independent top-level DB row: a single list container (bulletList /
// orderedList / taskList) wrapping exactly one item (see serializer.ts —
// blockToTipTapNode always builds a one-item container per DB block, and
// tiptapNodeToBlockContent only ever reads that single item back out).
//
// Stock TipTap's listItem/taskItem bind Enter to `splitListItem`, which
// inserts a new item INSIDE the same container instead of creating a new
// container — silently violating that one-container-one-item invariant.
// Since the serializer never walks a second item, its text is saved once and
// then permanently dropped on the next reload (a real, deterministic data-loss
// bug, not a race condition). Tab similarly nests one item's list inside
// another via `sinkListItem`, which the serializer also can't represent.
//
// Fix: on Enter, always create a new sibling top-level container (matching
// how every other block type gets a new block below it) instead of splitting
// within the same one; on Tab, no-op instead of nesting, since nested lists
// aren't a feature this schema supports.
function splitIntoNewBlock(editor: Editor, itemTypeName: string, validContainerTypes: string[]): boolean {
  return editor.commands.command(({ tr, dispatch, state }) => {
    if (!tr.selection.empty) {
      tr.deleteSelection();
    }
    const $from = tr.selection.$from;

    let itemDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === itemTypeName) {
        itemDepth = d;
        break;
      }
    }
    if (itemDepth === -1 || itemDepth < 1) {
      return false;
    }
    const containerDepth = itemDepth - 1;
    const containerNode = $from.node(containerDepth);
    if (!validContainerTypes.includes(containerNode.type.name) || containerNode.childCount !== 1) {
      // Not a plain one-item container (e.g. legacy/corrupted content with a
      // pre-existing multi-item list) — fall back to stock behavior rather
      // than risk mangling content we don't understand.
      return false;
    }

    const containerStart = $from.before(containerDepth);
    const containerEnd = $from.after(containerDepth);
    const itemNode = $from.node(itemDepth);
    const paragraphNode = itemNode.firstChild;
    const isEmpty = !paragraphNode || paragraphNode.content.size === 0;

    if (isEmpty) {
      // Exit the list on Enter at an empty item, same as Notion.
      const paragraph = state.schema.nodes.paragraph.create();
      tr.replaceWith(containerStart, containerEnd, paragraph);
      tr.setSelection(TextSelection.create(tr.doc, containerStart + 1));
    } else {
      const newItem = itemNode.type.create(null, state.schema.nodes.paragraph.create());
      // Reset blockId — this is a brand-new block, not a continuation of the
      // one it split from. Copying the old container's (already-assigned)
      // blockId here would give two top-level nodes the same id, and the
      // next save would collapse them into a single DB row, silently
      // dropping whichever item's content didn't win the write race.
      const newContainer = containerNode.type.create({ ...containerNode.attrs, blockId: null }, newItem);
      tr.insert(containerEnd, newContainer);
      tr.setSelection(TextSelection.create(tr.doc, containerEnd + 3));
    }

    if (dispatch) {
      dispatch(tr.scrollIntoView());
    }
    return true;
  });
}

export const ListItemBlock = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => splitIntoNewBlock(this.editor, "listItem", ["bulletList", "orderedList"]),
      Tab: () => true,
    };
  },
});

export const TaskItemBlock = TaskItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => splitIntoNewBlock(this.editor, "taskItem", ["taskList"]),
    };
  },
});
