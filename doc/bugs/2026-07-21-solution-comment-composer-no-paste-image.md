# Solution: route pasted clipboard files through the existing attach flow

**Fixed:** 2026-07-21

## What changed

**`components/editor/comment-composer.tsx`**:
- Factored `handleFileChange`'s body (the `FileReader.readAsDataURL` logic that turns a `File` into a base64 preview and calls `setAttachment`) out into a shared `handleFile(file: File)` helper. `handleFileChange` now just extracts the file from the `<input>` event and delegates to it.
- Added `handlePaste(_view, event)` to the editor's `editorProps`, alongside the existing `handleKeyDown`: if `event.clipboardData.files[0]` is present, it calls `event.preventDefault()` and `handleFile(file)`, returning `true` so ProseMirror skips its default paste handling; otherwise it returns `false` so normal text paste is unaffected.

## Why this fixes the root cause

The gap was that no code path connected `ClipboardEvent.clipboardData.files` to the attach flow at all — not that the attach flow itself was broken. Reusing `handleFile` (the same function the paperclip button already calls) means a pasted screenshot becomes a pending attachment through the exact same state (`attachment`/`attachLoading`) and preview UI as a manually attached file, with no parallel implementation to keep in sync.

## Verification

`npx tsc --noEmit` passed with no errors in `comment-composer.tsx`.
