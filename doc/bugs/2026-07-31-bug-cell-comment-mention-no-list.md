# Bug: "@" mention button in database cell comments never shows a user list

**Reported:** 2026-07-31

## Symptom

In a database entry's comment box (across every template view — table, board, gallery, calendar, all sharing the same comment popover), clicking the "@" (mention) button or typing "@" inserted an "@" character but never showed a dropdown of workspace members to pick from. There was no way to actually complete a mention.

## Root cause

`components/database/cell-comment-popover.tsx`'s three text inputs (new comment, edit, reply) are plain `<input>` elements storing comments as plain strings. Their `insertMention`/`insertEditMention`/`insertReplyMention` functions only ever spliced a literal "@" character into that string — there was no code anywhere in this component that fetched workspace members, matched them against what was typed, or rendered a suggestion dropdown.

This is unlike the page editor's own comment composer (`components/editor/comment-composer.tsx`), which is TipTap-based and already has a real `MentionNode` + `MentionCommands` suggestion plugin + `MentionList` dropdown (see `components/editor/extensions/mention-extension.ts`). The database cell comment popover was never given the equivalent feature — the "@" button implied one existed, but nothing behind it did.
