# Phase 11 — Comments & Mentions: Complete Implementation Guide

> **For the implementing AI:** Read this entire document before writing a single line of code.
> This is the authoritative spec for Phase 11. Follow it exactly.
>
> **UI Reference:** The comment system matches Notion exactly — a **floating dark card** that
> appears near the block. NOT a right-side panel. See Section 10 for the full UI spec.

---

## 0. Prerequisites — Verify Before Starting

```bash
pnpm typecheck   # zero errors
pnpm dev         # Phase 10 search working (Ctrl+K opens palette)
```

Confirm in DB (Phase 1 schema already exists):
- `comments` table — `lib/db/schema/collaboration.ts`
- `notifications` table — `lib/db/schema/collaboration.ts`

Confirm these helpers exist:
- `getSession()`, `requireWorkspaceMember()`, `ApiError`, `apiError()` — `lib/workspaces/auth.ts`

---

## 1. Overview

Phase 11 adds Notion-identical threaded comments and `@` mentions to pages.

**What gets built:**
1. **6 API routes** — list, create, edit, delete, resolve, reopen
2. **Floating comment card** — `components/editor/comment-card.tsx` (the primary UI component)
3. **Comment composer** — inline input inside the card
4. **TipTap mention extension** — `@name`, `@page`, `@date` pickers
5. **Block left-gutter wiring** — comment icon on block hover, "Comment" in block context menu
6. **Notification trigger stubs** — `lib/notifications/triggers.ts`
7. **Mention helper** — `lib/comments/mentions.ts`

---

## 2. Install Missing Package

```bash
pnpm add @tiptap/extension-mention@^3.26.1
```

`@tiptap/suggestion` is already installed — the mention extension uses it internally.

---

## 3. Database Schema (Already Exists — Do NOT Modify)

```
comments
├── id            uuid PK
├── page_id       FK → pages.id CASCADE
├── block_id      FK → blocks.id SET NULL   (null = page-level comment)
├── parent_id     FK → comments.id CASCADE  (null = thread root)
├── anchor_start  integer nullable          (char offset for text-range comments)
├── anchor_end    integer nullable
├── thread_number integer nullable          (sequential per page, set on roots only)
├── is_resolved   boolean default false
├── is_orphaned   boolean default false
├── author_id     FK → users.id SET NULL    (null renders as "Former Member")
├── content       jsonb NOT NULL            (TipTap JSON doc — see Section 6)
├── created_at    timestamp
├── edited_at     timestamp nullable
└── deleted_at    timestamp nullable        (soft delete → "[Comment deleted]" placeholder)
```

Content JSONB is a TipTap document:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "mention", "attrs": { "mentionType": "user", "id": "<userId>", "label": "Alice" } }
      ]
    }
  ]
}
```

---

## 4. Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `app/api/pages/[id]/comments/route.ts` | GET list + POST create |
| 2 | `app/api/comments/[id]/route.ts` | PATCH edit + DELETE |
| 3 | `app/api/comments/[id]/resolve/route.ts` | POST resolve |
| 4 | `app/api/comments/[id]/reopen/route.ts` | POST reopen |
| 5 | `lib/comments/mentions.ts` | Extract mention userIds from TipTap JSON |
| 6 | `lib/notifications/triggers.ts` | Notification trigger stubs |
| 7 | `components/editor/comment-card.tsx` | Floating dark comment card (main UI) |
| 8 | `components/editor/comment-composer.tsx` | Inline comment input |
| 9 | `components/editor/extensions/mention-extension.ts` | @name / @page / @date TipTap extension |

## 5. Files to Modify

| File | What changes |
|------|-------------|
| `components/editor/inline-toolbar.tsx` | Add "Comment" button |
| `components/editor/editor.tsx` | Block hover comment icon, block context menu entry, card open/close state |
| `DEVELOPMENT-PLAN.md` | Update active phase line |

---

## 6. API Routes — Full Specification

### 6.1 `GET + POST /api/pages/[id]/comments`

**File:** `app/api/pages/[id]/comments/route.ts`

#### GET — list all comments for a page

Returns all comment roots + replies. Include soft-deleted roots (`deleted_at IS NOT NULL`) — they render as `[Comment deleted]`.

Response shape:
```ts
{
  comments: Array<{
    id:           string;
    blockId:      string | null;
    parentId:     string | null;
    threadNumber: number | null;
    anchorStart:  number | null;
    anchorEnd:    number | null;
    isResolved:   boolean;
    isOrphaned:   boolean;
    content:      Record<string, unknown> | null;  // null when deletedAt is set
    createdAt:    string;
    editedAt:     string | null;
    deletedAt:    string | null;
    author: { id: string | null; name: string | null; image: string | null } | null;
    replies: Array</* same shape without nested replies */>;
  }>;
  totalCount:      number;
  unresolvedCount: number;
}
```

Order: roots by `thread_number ASC`, replies within each root by `created_at ASC`.
When `deletedAt != null` on a root, set `content = null` in the response.

#### POST — create a comment or reply

Zod schema:
```ts
const createCommentSchema = z.object({
  blockId:     z.string().uuid().nullable().default(null),
  parentId:    z.string().uuid().nullable().default(null),
  anchorStart: z.number().int().min(0).nullable().default(null),
  anchorEnd:   z.number().int().min(0).nullable().default(null),
  content:     z.record(z.string(), z.unknown()),
});
```

Business rules:
- If `parentId` is set, load parent and verify its `parentId === null`. If parent is itself a reply → `400 "Cannot reply to a reply"`.
- `thread_number` — only for roots (`parentId === null`). In the transaction:
  ```sql
  SELECT COALESCE(MAX(thread_number), 0) + 1 AS next
  FROM comments WHERE page_id = :pageId AND parent_id IS NULL AND deleted_at IS NULL
  ```
- Enqueue notification triggers **within the same transaction** (Rule 11).
- Permission: `requireWorkspaceMember(page.workspaceId, session.user.id)` (Phase 12 upgrades to page-level).

---

### 6.2 `PATCH + DELETE /api/comments/[id]`

**File:** `app/api/comments/[id]/route.ts`

#### PATCH — edit comment content

- Only author (`comment.authorId === session.user.id`) — else `403`.
- Set `editedAt = now()`.
- Mention diff: extract new mentions → query `notifications WHERE type='mention' AND source_id=:commentId` for already-notified user IDs → call `triggerMentionNotifications()` with `newMentions - alreadyNotified` in same transaction.

```ts
const patchSchema = z.object({
  content: z.record(z.string(), z.unknown()),
}).strict();
```

#### DELETE — delete a comment

- Author OR workspace Admin can delete — else `403`.
- Root with replies → **soft delete**: `SET deleted_at = now()`, replies remain.
- Root with NO replies → hard delete.
- Reply → always hard delete.

---

### 6.3 `POST /api/comments/[id]/resolve`

**File:** `app/api/comments/[id]/resolve/route.ts`

- Only roots can be resolved — `parentId === null` check, else `400 "Only thread roots can be resolved"`.
- Workspace member check.
- `SET is_resolved = true`.
- Call `triggerResolvedNotification()` in same transaction.
- Returns `{ id, isResolved: true }`.

---

### 6.4 `POST /api/comments/[id]/reopen`

**File:** `app/api/comments/[id]/reopen/route.ts`

- Only roots. Same checks as resolve.
- `SET is_resolved = false`.
- Call `triggerReopenedNotification()` in same transaction.
- Returns `{ id, isResolved: false }`.

---

## 7. Notification Triggers — `lib/notifications/triggers.ts`

Phase 13 fills the bodies. Phase 11 establishes the call sites and signatures. All functions are **no-ops** until Phase 13 — they must NOT throw.

```ts
import type { PgTransaction } from "drizzle-orm/pg-core";

export async function triggerCommentNotifications(
  tx: PgTransaction<any, any, any>,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    authorId:    string;
    parentId:    string | null;
    content:     Record<string, unknown>;
  }
): Promise<void> { /* Phase 13 */ }

export async function triggerMentionNotifications(
  tx: PgTransaction<any, any, any>,
  params: {
    commentId:    string;
    pageId:       string;
    workspaceId:  string;
    authorId:     string;
    content:      Record<string, unknown>;
    skipUserIds?: string[];
  }
): Promise<void> { /* Phase 13 */ }

export async function triggerResolvedNotification(
  tx: PgTransaction<any, any, any>,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    resolverId:  string;
  }
): Promise<void> { /* Phase 13 */ }

export async function triggerReopenedNotification(
  tx: PgTransaction<any, any, any>,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    reopenerId:  string;
  }
): Promise<void> { /* Phase 13 */ }
```

---

## 8. Mention Helper — `lib/comments/mentions.ts`

```ts
export function extractMentionedUserIds(content: Record<string, unknown>): string[] {
  const ids: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "mention") {
      const attrs = n.attrs as { mentionType?: string; id?: string } | undefined;
      if (attrs?.mentionType === "user" && attrs.id) ids.push(attrs.id);
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }
  walk(content);
  return [...new Set(ids)];
}
```

---

## 9. TipTap Mention Extension — `components/editor/extensions/mention-extension.ts`

Uses `@tiptap/extension-mention` (install in Step 2) + `@tiptap/suggestion` (already installed).

### Node attrs
```ts
{
  mentionType: "user" | "page" | "date",
  id:          string,   // userId | pageId | ISO date string
  label:       string,   // display name | page title | formatted date
}
```

### Trigger character: `@`

### Picker items by query prefix:
- **user** — `GET /api/workspaces/:workspaceId/members?q=:query` → filter by name
- **page** — `GET /api/search?q=:query&workspace=:workspaceId&type=page` (Phase 10 route)
- **date** — generated client-side: "Today", "Tomorrow", "Next Monday", plus next 6 days

### Rendering in editor content
```
@Alice Chen   → text-blue-600 font-medium bg-blue-50 rounded px-0.5
📄 Roadmap    → text-slate-700 underline decoration-dotted
Jun 12, 2026  → text-violet-600 font-medium
```

### Implementation pattern

```ts
import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";

export function buildMentionExtension(workspaceId: string) {
  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    renderHTML({ node }) {
      return ["span", {
        "data-mention-type": node.attrs.mentionType,
        "data-id": node.attrs.id,
        class: getMentionClass(node.attrs.mentionType),
      }, node.attrs.mentionType === "page" ? `📄 ${node.attrs.label}` : `@${node.attrs.label}`];
    },
    suggestion: {
      char: "@",
      items: async ({ query }) => fetchMentionItems(query, workspaceId),
      render: () => {
        let component: ReactRenderer;
        let popup: ReturnType<typeof tippy>;
        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, { props, editor: props.editor });
            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          onUpdate: (props) => { component.updateProps(props); popup[0].setProps({ getReferenceClientRect: props.clientRect }); },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") { popup[0].hide(); return true; }
            return (component.ref as MentionListHandle)?.onKeyDown(props.event) ?? false;
          },
          onExit: () => { popup[0].destroy(); component.destroy(); },
        };
      },
    },
  });
}

function getMentionClass(type: string) {
  if (type === "user") return "text-blue-600 font-medium bg-blue-50 rounded px-0.5 not-prose";
  if (type === "page") return "text-slate-700 underline decoration-dotted not-prose";
  return "text-violet-600 font-medium not-prose";
}
```

`MentionList` is a React component (same file) that renders the picker with three sections: **People**, **Pages**, **Dates**. Arrow keys navigate, Enter selects.

---

## 10. Comment Card UI — `components/editor/comment-card.tsx`

> This is the PRIMARY comment UI. It is a **floating dark card** that appears to the right
> of the block — exactly matching Notion. It is NOT a right-side panel.

### Visual Reference (from screenshots)

```
┌─────────────────────────────────────────────────────┐  ← dark card, rounded-xl, shadow-2xl
│  ┌─────────────────────────────────────────────┐    │
│  │  K  Khushbu Pambhar  2h    [😊] [✓] [···]  │    │  ← comment row
│  │     Hello                                    │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  K  Khushbu Pambhar  2h    [😊] [✓] [···]  │    │
│  │     @Khushbu Pambhar                         │    │
│  └─────────────────────────────────────────────┘    │
│  ─────────────────────────────────────────────────  │
│  [ Reply input area…          📎  @  ✗  ✓ ]        │  ← composer at bottom
└─────────────────────────────────────────────────────┘
```

**Edit mode** (clicking edit on a comment):
```
│  K  Khushbu Pambhar  2h    [😊] [✓] [···]   │
│  ┌─────────────────────────────────────────┐  │   ← blue border
│  │  Hello|                      📎  @  ✗  ✓ │  │
│  └─────────────────────────────────────────┘  │
```


### Card Styling

```
bg-[#191919]                 ← dark background (Notion's exact dark card color)
text-white
rounded-xl
shadow-2xl
border border-white/8   ← subtle border
w-95                    ← fixed width
max-h-[520px]
overflow-y-auto
```

### Card Positioning

The card is positioned **to the right** of the block that was commented on:
- `position: absolute`
- `left: calc(100% + 16px)` — 16px gap from the block right edge
- `top: 0` — aligned with the block's top
- `z-index: 50`

If there is not enough space to the right (viewport edge), flip to left: `right: calc(100% + 16px)`.

### Props

```ts
interface CommentCardProps {
  pageId:       string;
  workspaceId:  string;
  blockId:      string | null;        // which block this card is anchored to
  anchorStart?: number | null;        // for text-range comment
  anchorEnd?:   number | null;
  currentUserId: string;
  isAdmin:      boolean;
  onClose:      () => void;
}
```

### Comment Row Layout

Each comment (root or reply) renders as:

```tsx
<div className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/5 group">
  {/* Avatar — 24px circle, single initial letter */}
  <div className="shrink-0 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-semibold text-white">
    {initial}
  </div>

  <div className="flex-1 min-w-0">
    {/* Header row */}
    <div className="flex items-center gap-1.5 mb-0.5">
      <span className="text-[13px] font-medium text-white">{authorName}</span>
      <span className="text-[11px] text-white/40">{relativeTime}</span>
      {editedAt && (
        <span className="text-[11px] text-white/30">(edited)</span>
      )}

      {/* Action icons — visible on hover */}
      <div className="ml-auto hidden group-hover:flex items-center gap-0.5">
        <button className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white">
          <SmileyIcon size={14} />           {/* emoji reaction — Phase 13 */}
        </button>
        <button className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white">
          <CheckIcon size={14} />            {/* resolve thread */}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white">
            <DotsThreeIcon size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-45 bg-[#2f2f2f] border-white/10 text-white text-sm">
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingId(comment.id)}>Edit</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem>Mute replies</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {/* Comment text OR edit input */}
    {editingId === comment.id ? (
      <CommentComposer
        mode="edit"
        initialContent={comment.content}
        onSubmit={handleEdit}
        onCancel={() => setEditingId(null)}
        workspaceId={workspaceId}
      />
    ) : (
      <div className="text-[13px] text-white/85 leading-5">
        {renderCommentContent(comment.content)}  {/* renders text + styled mentions */}
      </div>
    )}
  </div>
</div>
```

**Deleted comment** (`deletedAt != null`):
```tsx
<span className="text-[13px] text-white/30 italic">[Comment deleted]</span>
```

**Resolve/Reopen** — shown on thread root's action bar:
- Unresolved: `CheckIcon` in `text-white/50`, on click → resolve
- Resolved: whole card header row shows `✓` in `text-green-400`, click to reopen

### Reply Area (bottom of card)

Always visible at the bottom of the card, below the last comment:

```tsx
<div className="border-t border-white/10 px-3 py-2">
  <CommentComposer
    mode="reply"
    placeholder="Reply..."
    onSubmit={handleReply}
    workspaceId={workspaceId}
  />
</div>
```

### Data Fetching

```ts
const { data, mutate } = useSWR(
  `/api/pages/${pageId}/comments?blockId=${blockId ?? ""}`,
  fetcher,
  { refreshInterval: 0 }   // real-time via SSE in Phase 13; polling disabled for now
);
```

Filter response by `blockId` client-side to show only threads for this block.

---

## 11. Comment Composer — `components/editor/comment-composer.tsx`

Used both for new comments AND for editing existing ones.

### Props
```ts
interface CommentComposerProps {
  mode:             "new" | "reply" | "edit";
  workspaceId:      string;
  placeholder?:     string;
  initialContent?:  Record<string, unknown>;  // edit mode only
  onSubmit:         (content: Record<string, unknown>) => Promise<void>;
  onCancel?:        () => void;
  autoFocus?:       boolean;
}
```

### Visual Layout

```
┌──────────────────────────────────────────────────┐  ← rounded-lg border border-white/15 bg-white/5
│  Reply...                                        │
│                                         📎  @    │
└──────────────────────────────────────────────────┘
                                              ✗  ✓
```

Edit mode (blue border):
```
┌──────────────────────────────────────────────────┐  ← border-blue-500/60
│  Hello|                             📎  @  ✗  ✓  │
└──────────────────────────────────────────────────┘
```

### Editor config

```ts
useEditor({
  extensions: [
    StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, bulletList: false, orderedList: false }),
    Bold, Italic, Code, Link,
    buildMentionExtension(workspaceId),
  ],
  content: initialContent ?? "",
  editorProps: {
    attributes: {
      class: "text-[13px] text-white/85 focus:outline-none min-h-[20px] max-h-[120px] overflow-y-auto leading-5",
    },
  },
})
```

### Submit / Cancel icons

- `PaperclipIcon` size 14 — file attachment (Phase 7 flow, Phase 11 wires the UI element only; actual upload is a post-MVP enhancement — show it but it can be disabled for MVP)
- `AtSignIcon` size 14 — triggers mention picker programmatically (`editor.commands.insertContent("@")`)
- `XCircleIcon` size 14 — cancel (calls `onCancel()` or clears content)
- `CheckCircleIcon` size 14 — submit (disabled when empty)

### Keyboard behavior
- `Enter` → submit
- `Shift+Enter` → newline
- `Escape` → cancel
- Submit icon disabled when `editor.isEmpty`

---

## 12. Block Gutter Wiring — Modifications to Existing Files

### 12.1 Block hover comment icon

In `components/editor/editor.tsx`, the block wrapper (the outer `<div>` around each block's rendered content) needs a comment button in the left gutter.

This button appears on block hover, to the left of the drag handle:

```tsx
{/* Only show if block has no existing comment AND is not locked */}
<button
  type="button"
  title="Comment (Ctrl+Shift+Alt+X)"
  className={`
    absolute -left-9 top-0.5 hidden group-hover:flex
    h-6 w-6 items-center justify-center
    rounded text-white/30 hover:bg-white/10 hover:text-white/70
    transition-colors
  `}
  onClick={() => openCommentCard(blockId, null, null)}
>
  <ChatTextIcon size={14} />  {/* Phosphor ChatText icon */}
</button>
```

If the block already has unresolved comments, show the icon in **purple** permanently (not just on hover):
```tsx
className={`... ${hasComments ? "flex text-violet-400" : "hidden group-hover:flex text-white/30"}`}
```

### 12.2 Block context menu — add "Comment" item

The block context menu (the `···` three-dot menu that appears on block hover) already exists from Phase 5/6. Add a **Comment** item:

```tsx
<DropdownMenuItem
  onClick={() => openCommentCard(blockId, null, null)}
>
  <ChatTextIcon size={14} className="mr-2" />
  Comment
  <DropdownMenuShortcut>Ctrl+Shift+Alt+X</DropdownMenuShortcut>
</DropdownMenuItem>
```

Place it after "Duplicate" and before "Delete", as in Notion's block menu.

### 12.3 State management in `editor.tsx`

```ts
// Which block's comment card is open (null = card closed)
const [commentCardBlock, setCommentCardBlock] = useState<{
  blockId:     string | null;
  anchorStart: number | null;
  anchorEnd:   number | null;
} | null>(null);

function openCommentCard(blockId: string | null, anchorStart: number | null, anchorEnd: number | null) {
  setCommentCardBlock({ blockId, anchorStart, anchorEnd });
}

function closeCommentCard() {
  setCommentCardBlock(null);
}
```

The card is rendered **inside** the block wrapper's relative container (not a portal), so it naturally positions to the right of that block:

```tsx
<div className="relative group">
  {/* Block content rendered by TipTap */}
  {blockContent}

  {/* Comment button in gutter */}
  <CommentGutterButton blockId={blockId} onClick={openCommentCard} hasComments={blockHasComments} />

  {/* Comment card — only render when this block's card is open */}
  {commentCardBlock?.blockId === blockId && (
    <div className="absolute left-full top-0 ml-4 z-50">
      <CommentCard
        pageId={pageId}
        workspaceId={workspaceId}
        blockId={blockId}
        anchorStart={commentCardBlock.anchorStart}
        anchorEnd={commentCardBlock.anchorEnd}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={closeCommentCard}
      />
    </div>
  )}
</div>
```

### 12.4 `components/editor/inline-toolbar.tsx` — Add "Comment" button

Add to the existing bubble-menu buttons, after the link button:

```tsx
import { ChatTextIcon } from "@phosphor-icons/react";

// In Props:
onCommentSelection?: (anchorStart: number, anchorEnd: number) => void;

// Button:
<button
  type="button"
  title="Comment (Ctrl+Shift+Alt+X)"
  className={btnBase}
  onClick={() => {
    const { from, to } = editor.state.selection;
    onCommentSelection?.(from, to);
  }}
>
  <ChatTextIcon size={15} />
</button>
```

In `editor.tsx`, pass the callback:
```ts
onCommentSelection={(from, to) => {
  openCommentCard(activeBlockId, from, to);
}}
```

`activeBlockId` — track it from TipTap's `selectionUpdate` event:
```ts
editor.on("selectionUpdate", ({ editor: e }) => {
  const blockNode = e.state.doc.nodeAt(e.state.selection.$anchor.pos);
  // get the blockId from the node's attrs — set when syncing from DB
});
```

---

## 13. Page-Level Comment Button (Top Bar)

Add to the page's top-right action bar:

```tsx
<button
  type="button"
  className="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
  onClick={() => openCommentCard(null, null, null)}  // null blockId = page-level
>
  <ChatTextIcon size={15} />
  {unresolvedCount > 0 && (
    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-2xs font-medium text-white">
      {unresolvedCount > 9 ? "9+" : unresolvedCount}
    </span>
  )}
</button>
```

When `blockId = null`, the `CommentCard` shows **page-level threads** (no block association).

---

## 14. Text-Range Comments (Anchor Highlight)

When a comment exists with `anchorStart` and `anchorEnd` set:

1. Apply a TipTap decoration over the `[anchorStart, anchorEnd]` range:
   ```ts
   DecorationSet.create(doc, [
     Decoration.inline(anchorStart, anchorEnd, {
       class: "comment-anchor border-b-2 border-violet-400 bg-violet-50/30 cursor-pointer",
     })
   ])
   ```
2. Clicking the highlighted text opens the `CommentCard` for that thread.
3. When the comment is **resolved**, the highlight changes to `border-slate-300 bg-transparent`.
4. When `is_orphaned = true`, the highlight is removed entirely.

---

## 15. Orphan Detection

### On block content update (`PATCH /api/blocks/[id]`)

In the existing PATCH handler, after updating the block, in the same transaction:

```ts
const anchoredComments = await tx
  .select({ id: comments.id, anchorStart: comments.anchorStart, anchorEnd: comments.anchorEnd })
  .from(comments)
  .where(and(
    eq(comments.blockId, blockId),
    eq(comments.isOrphaned, false),
    isNotNull(comments.anchorStart),
  ));

const blockText = extractPlainText(newContent);  // strip TipTap JSON to plain string

const orphaned = anchoredComments.filter(c => {
  const sub = blockText.slice(c.anchorStart!, c.anchorEnd!);
  return !sub || sub.length === 0;
});

if (orphaned.length > 0) {
  await tx.update(comments)
    .set({ isOrphaned: true })
    .where(inArray(comments.id, orphaned.map(c => c.id)));
}
```

### On block delete (`DELETE /api/blocks/[id]`)

```ts
await tx.update(comments)
  .set({ isOrphaned: true })
  .where(and(
    eq(comments.blockId, blockId),
    eq(comments.isOrphaned, false),
    isNotNull(comments.anchorStart),
  ));
```

Both in the same transaction as the block mutation.

### Rendering orphaned comments

In the `CommentCard` when `blockId = null` (page-level card), include an **"Orphaned"** section at the bottom if any orphaned comments exist for this page:

```tsx
{orphanedThreads.length > 0 && (
  <div className="border-t border-white/10 pt-2 pb-1 px-3">
    <p className="text-[11px] text-amber-400 mb-2">⚠ Original content removed</p>
    {orphanedThreads.map(thread => <CommentThread key={thread.id} {...thread} />)}
  </div>
)}
```

---

## 16. Keyboard Shortcut

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Alt+X` | Open comment on selected block (Notion's exact shortcut) |
| `Escape` | Close comment card |
| `Enter` in composer | Submit |
| `Shift+Enter` | New line in composer |

Register globally in the editor:
```ts
useEffect(() => {
  function handler(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === "X") {
      openCommentCard(activeBlockId, null, null);
    }
  }
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [activeBlockId]);
```

---

## 17. Timestamp Formatting Utility

Used in `CommentCard`. Use `date-fns` (already a transitive dep):

```ts
import { formatDistanceToNow, format, isThisYear, differenceInMinutes, differenceInHours } from "date-fns";

export function formatCommentTime(date: Date): string {
  const mins = differenceInMinutes(new Date(), date);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = differenceInHours(new Date(), date);
  if (hrs < 24)   return `${hrs}h ago`;
  if (hrs < 168)  return format(date, "EEE");              // "Mon", "Tue"
  if (isThisYear(date)) return format(date, "MMM d");     // "Jun 12"
  return format(date, "MMM d, yyyy");                      // "Jun 12, 2025"
}

export function formatCommentTimeTooltip(date: Date): string {
  return format(date, "MMM d, yyyy 'at' h:mm a");         // "Jun 12, 2026 at 3:41 PM"
}
```

---

## 18. Three-Dot Menu — Full Option Set

Matches Notion's exact dropdown options shown in Screenshot 5:

| Option | Action | Condition |
|--------|--------|-----------|
| Mark as unread | Sets notification as unread (Phase 13 implements) | Always shown |
| Edit | Enters edit mode for this comment | Author only |
| Copy link | Copies `window.location.origin + /workspace/pageId#comment-{id}` | Always shown |
| Mute replies | Mutes notifications for this thread (Phase 13 implements) | Always shown |
| — separator — | | |
| Delete | Delete the comment | Author or workspace Admin |

Show "Edit" and "Delete" only when authorized. "Mark as unread" and "Mute replies" are shown to all (they are no-ops until Phase 13 notification system is built — add `toast("Coming in a future update")` for now).

---

## 19. Business Rules — Enforcement Checklist

- [ ] Workspace member check on all comment API routes
- [ ] Reply depth max 1 level — reject `parentId` pointing to a reply row
- [ ] `thread_number` assigned only to roots, sequential per page
- [ ] Author-only edit — `403` for non-author PATCH
- [ ] Author OR workspace Admin delete — `403` otherwise
- [ ] Soft delete when root has replies; hard delete otherwise
- [ ] Reply → always hard delete
- [ ] Mention notifications fire once per `(commentId, mentionedUserId)` — diff on edit
- [ ] Never notify the actor of their own action (Rule 11)
- [ ] Notification triggers enqueued inside same DB transaction (Rule 11)
- [ ] Orphan detection in same transaction as block update/delete

---

## 20. Error Responses

```ts
import { ApiError, apiError } from "@/lib/workspaces/auth";
```

| Scenario | Status | Message |
|----------|--------|---------|
| Not authenticated | 401 | `"Unauthorized"` |
| Not workspace member | 403 | `"Not a member of this workspace"` |
| Editing non-owned comment | 403 | `"Only the author can edit this comment"` |
| Deleting non-owned (non-admin) | 403 | `"Forbidden"` |
| Comment not found | 404 | `"Comment not found"` |
| Reply to a reply | 400 | `"Cannot reply to a reply"` |
| Resolve a reply | 400 | `"Only thread roots can be resolved"` |
| Invalid body | 400 | first Zod issue message |

---

## 21. Standard Import Header for all API Routes in Phase 11

```ts
import { and, eq, inArray, isNotNull, max, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments, notifications, pages, users } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";
import { extractMentionedUserIds } from "@/lib/comments/mentions";
import {
  triggerCommentNotifications,
  triggerMentionNotifications,
  triggerResolvedNotification,
  triggerReopenedNotification,
} from "@/lib/notifications/triggers";
```

---

## 22. Verification Checklist

```bash
pnpm add @tiptap/extension-mention@^3.26.1
pnpm typecheck    # MUST be zero errors
pnpm dev
```

### Comments
- [ ] Hover a block → comment icon (💬) appears in left gutter
- [ ] Block `···` context menu shows "Comment" with `Ctrl+Shift+Alt+X` shortcut label
- [ ] Clicking either → dark floating card opens to the RIGHT of the block
- [ ] Write a comment + submit → comment appears in card with `K` avatar, name, "just now"
- [ ] Comment count badge appears on top-right page button
- [ ] Click "✓" on thread root → thread header shows green ✓, all text fades (opacity-50ish)
- [ ] Three-dot `···` → dropdown shows: Mark as unread, Edit, Copy link, Mute replies, Delete
- [ ] Click "Edit" → text replaced with input with blue border, original text pre-filled
- [ ] Edit + submit → `(edited)` label appears next to timestamp
- [ ] Reply area always visible at bottom of card
- [ ] Reply → reply appears indented inside same card
- [ ] Reply to a reply → `400` error
- [ ] Delete comment with replies → `[Comment deleted]` placeholder appears
- [ ] Delete comment with no replies → thread disappears
- [ ] Click 💬 in top-right page bar → card opens for page-level comments (no blockId)

### Text-Range Comments
- [ ] Select text → inline toolbar shows 💬 button
- [ ] Click → card opens, new comment anchored to selected range
- [ ] Anchored text underlined in `border-violet-400` in editor
- [ ] Edit block to remove anchored text → `is_orphaned = true` in DB (verify `db:studio`)
- [ ] Orphaned thread shows in page-level card with amber ⚠ note

### Mentions in comment composer
- [ ] Type `@` → floating picker opens below cursor
- [ ] Type name → people list filters in real time
- [ ] Select member → `@Alice` appears in blue in the composer
- [ ] Type page name → pages section appears
- [ ] Select page → `📄 Roadmap` link inserted
- [ ] Type `@today` → date section shows today + next days
- [ ] Select date → `Jun 19, 2026` inserted in violet
- [ ] `comments.content` JSONB in DB contains `{ "type": "mention", "attrs": { "mentionType": "user", ... } }`

### Stability
- [ ] No TypeScript errors
- [ ] Creating / resolving / deleting comments does NOT throw (notification stubs are no-ops)
- [ ] Card closes on Escape
- [ ] Card closes on click-outside

---

## 23. What Phase 12 and 13 Will Change

**Phase 12 (Permissions):**
Replace `requireWorkspaceMember(page.workspaceId, session.user.id)` in comment routes with `requirePagePermission(db, userId, pageId, "can_comment")`. One-line swap per route — no structural change.

**Phase 13 (Notifications):**
Fill the stub bodies in `lib/notifications/triggers.ts` with real `db.insert(notifications, ...)` + pg-boss enqueue. Function signatures are locked by Phase 11 — all call sites remain valid.

---

## 24. Update Development Plan After Completion

In `DEVELOPMENT-PLAN.md` line 27, change:
```
**Current active phase: PHASE 4 — Navigation & Sidebar (in progress).**
```
to:
```
**Current active phase: PHASE 12 — Permissions & Sharing (in progress).**
```
