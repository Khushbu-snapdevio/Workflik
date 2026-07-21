# Bug: comment composer doesn't support pasting an image from the clipboard

**Reported:** 2026-07-21

## Symptom

Pressing Ctrl+V (or Cmd+V) with a screenshot on the clipboard while focused in a "Write a comment…" box does nothing — the image is silently dropped. The only way to attach an image is the paperclip button's file picker; copy-pasting a screenshot directly, which users expect to work, doesn't.

## Root cause

`components/editor/comment-composer.tsx`'s comment box is a TipTap/ProseMirror editor (`useEditor` + `EditorContent`). Its `editorProps` defined a `handleKeyDown` (for mention navigation, Enter-to-submit, Escape-to-cancel) but no `handlePaste` — so ProseMirror fell through to its default paste handling, which only knows how to insert text/HTML, not files from `ClipboardEvent.clipboardData.files`. The attach flow that already existed (`handleFileChange`, wired to the hidden `<input type="file">` behind the paperclip button) was never invoked for a paste event because nothing routed clipboard files into it.
