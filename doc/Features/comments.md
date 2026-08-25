# Comments & Mentions

## Overview

Comments and mentions are Pagevo's in-context collaboration layer. Comments can be attached to specific blocks, anchored to selected text ranges, or placed at the bottom of a page as general feedback. Mentions connect people, pages, and dates directly inside content.

---

## User Stories

- As a reviewer, I want to comment on a specific block so my feedback stays in context.
- As a designer, I want to highlight text and comment on it like in Google Docs.
- As a team member, I want to @mention a colleague so they get notified and know exactly what to look at.
- As a project lead, I want to resolve comment threads when the feedback has been addressed.
- As a writer, I want to insert a live page link via @mention so it updates automatically if the page is renamed.

---

## Comment Types

| Type | Description |
|------|-------------|
| Block comment | Attached to a specific block in the page |
| Text-level comment | Anchored to a selected text range within a block |
| Page-level comment | General comment at the bottom of the page |

---

## 1. Block Comments

Block comments are attached to a specific block and visible as a thread in a side panel.

**How to add:**
- Hover over a block → click the 💬 comment icon (appears on the left)
- Right-click a block → `"Comment"`
- Select text within a block → floating toolbar → `"Comment"` (creates a text-level comment, see below)

**Thread structure:**
```
[Avatar] Sarah — 2h ago                            [Resolve]
  "Should this section be moved after the intro?"
  [Reply...]

  [Avatar] You — 1h ago
    "Good point — I'll move it now."
  [Edited]
```

- One level of replies only (replies cannot have their own replies)
- Each reply notifies all previous thread participants
- Threads are numbered per page for reference (e.g., `#3`)

**Block comment indicator:** A purple dot on the left margin of a commented block. Click to open the comment thread panel.

---

## 2. Text-Level Comments

Anchored to a specific highlighted text range within a block — similar to Google Docs.

**How to add:**
1. Select text in a block
2. Click `"Comment"` in the floating toolbar
3. Write comment and submit

**Display:**
- Highlighted text is underlined with a subtle purple color
- Hovering the highlighted text shows the comment thread in a tooltip
- Clicking the highlight opens the full thread panel

**Behavior on edit:**
- If the highlighted text is slightly edited (characters added/removed), the anchor adjusts to the nearest matching text
- If the anchored text is deleted entirely, the comment becomes "orphaned" and is shown in the page-level comments section with a note: `"The original content has been removed."`

---

## 3. Page-Level Comments

General comments about the page as a whole, not tied to a specific block.

**Location:** A dedicated section at the bottom of every page, below all content blocks.

**Access:** Click the `"💬 Comments"` button in the top-right page action bar. Also scrolls into view when a user is linked to a page-level comment.

**Behavior:** Same threading rules as block comments — one level of replies, participants notified on reply.

---

## Comment Actions

| Action | Who can do it |
|--------|--------------|
| Write comment | Can Comment+ (and Can Edit+) |
| Edit own comment | Comment author only |
| Delete own comment | Comment author only |
| Delete any comment | Workspace Admin |
| Resolve thread | Anyone with Can Comment+ |
| Reopen thread | Anyone with Can Comment+ |
| Copy comment link | Anyone who can see the comment |

**Edit indicator:** Edited comments show an `"(edited)"` label with the last edit time on hover.

**Deleting the first comment in a thread:** If the opening comment is deleted and replies exist, the opening comment is replaced with `"[Comment deleted]"` placeholder. The thread remains visible. If no replies exist, the entire thread is removed.

---

## Resolved Comments

- Click `"Resolve"` on any thread to mark it as resolved
- Resolved threads: collapse visually, block highlight is removed, indicator dot changes to grey
- A `"Resolved"` toggle button in the page header shows/hides resolved threads
- Resolved threads can be reopened by clicking `"Reopen"`
- Resolving a thread does not delete it — content is preserved

---

## Mentions

Type `@` anywhere in a block or comment composer to open the mention picker.

### @name — People Mention

- Opens a dropdown listing workspace members (and guests who have access to the current page)
- Filtered in real time as you type after `@`
- Selecting a member inserts their name as a styled inline element (colored, clickable)
- Clicking the mention in content opens a small card with their name and avatar
- Sending a mention in a comment triggers a **direct notification** to that person

---

### @page — Page Link

- Opens a dropdown listing pages in the workspace, filtered by name as you type
- Selecting a page inserts a live page link (icon + title)
- The link **auto-updates** if the page is renamed — the link always shows the current title
- If the linked page is deleted: link shows `"Page not found"` in grey
- Clicking the link navigates to that page (opens in the same tab)

---

### @date — Date Reference

- Opens a date picker
- Supports relative terms as you type: `today`, `tomorrow`, `yesterday`, `next monday`, etc.
- Inserts a formatted, clickable date inline (e.g., `Jun 12, 2026`)
- Clicking the date in content opens a calendar popover to change the date
- Does not create a task or reminder — it is a visual date anchor only

---

## Comment Composer

The comment input field supports limited formatting:

| Formatting | Supported |
|-----------|-----------|
| Bold (`**text**`) | ✅ |
| Italic (`*text*`) | ✅ |
| Inline Code | ✅ |
| Hyperlink | ✅ |
| @mention (people, pages, dates) | ✅ |
| Block types (headings, lists, images) | ❌ — comments are inline only |

Submit: `Enter` (single line) or `Ctrl+Enter` / `Cmd+Enter` (multi-line).

---

## Comment Notifications

| Trigger | Who is notified |
|---------|----------------|
| New comment on a page you created | Page creator |
| Reply to a thread you participated in | All prior participants |
| @mention in a comment | Mentioned user |
| @mention in page content | Mentioned user |
| Thread resolved or reopened | All prior participants |

---

## Data Model

```
Comment
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page)
├── block_id            (foreign key → Block, nullable — null = page-level)
├── parent_id           (foreign key → Comment, nullable — null = thread root)
├── anchor_start        (integer, nullable — character offset in block text)
├── anchor_end          (integer, nullable — character offset in block text)
├── is_resolved         (boolean, default: false)
├── is_orphaned         (boolean, default: false — text anchor was deleted)
├── author_id           (foreign key → User, nullable — ON DELETE SET NULL; null = "Former Member")
├── content             (jsonb — inline text with marks and mentions)
├── created_at          (timestamp)
├── edited_at           (timestamp, nullable)
└── deleted_at          (timestamp, nullable — soft delete for first-comment placeholder)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pages/:id/comments` | List all comments for a page | Can View+ |
| POST | `/api/pages/:id/comments` | Create a comment or reply | Can Comment+ |
| PATCH | `/api/comments/:id` | Edit a comment | Author only |
| DELETE | `/api/comments/:id` | Delete a comment | Author or Admin |
| POST | `/api/comments/:id/resolve` | Resolve a thread | Can Comment+ |
| POST | `/api/comments/:id/reopen` | Reopen a resolved thread | Can Comment+ |

---

## UI Screens

| Screen | Location | Access |
|--------|----------|--------|
| Block comment thread panel | Side panel on page | Can Comment+ |
| Page-level comments section | Bottom of every page | Can Comment+ |
| Comment icon in top-right bar | Top bar action button | Can View+ (read), Can Comment+ (write) |

---

## Business Rules

1. Comments on a page are visible to all users who have at least **Can Comment** or **Can View** access to the page. Can View users can read comments but cannot add new ones.
2. Only the comment author can edit their own comment. Editing does not change the thread's resolved state.
3. Only the comment author or a workspace Admin can delete a comment.
4. Deleting the first comment in a thread with replies replaces it with a `"[Comment deleted]"` placeholder — the thread is not removed.
5. Replies are one level deep only — you cannot reply to a reply.
6. Resolving a thread does not delete it. It is always recoverable by toggling resolved threads visible and reopening.
7. A text-level comment whose anchored text has been deleted becomes orphaned and moves to the page-level section with a note. **Orphan detection is synchronous:** the block update handler (`PATCH /api/blocks/:id`) queries all comments where `block_id = :blockId AND is_orphaned = false AND anchor_start IS NOT NULL`, then checks whether the updated content still contains the original substring at `[anchor_start, anchor_end]`. Any comment whose anchor no longer matches is set to `is_orphaned = true` in the same transaction as the block update. When a block is permanently deleted (`DELETE /api/blocks/:id`), all its non-orphaned text-anchored comments are set to `is_orphaned = true` in the same delete transaction — they then appear in the page-level section with the "original content has been removed" note.
8. @mention notifications fire once at the time of the mention — not again if the comment is edited. **Edit edge cases:** (a) If a comment is edited and a previously-mentioned user's `@name` is removed, no follow-up notification is sent to that user. (b) If a new `@name` is added during an edit, the newly mentioned user **does** receive a notification — the rule is "fire once per unique (comment, mentioned_user) pair", not once per comment. The server must diff the mention list before and after edit, and enqueue notifications only for newly added mentions. **Implementation:** the edit handler (`PATCH /api/comments/:id`) identifies already-notified users by querying `notifications WHERE type = 'mention' AND source_id = :commentId`. Building `new_mentions - already_notified_set` gives the users to notify. The `notifications` table is the authoritative record of who has been notified per comment — no separate tracking table is needed.
9. @page links update their displayed title automatically when the referenced page is renamed.
10. Comment count is shown on the page as a badge on the 💬 button in the top-right action bar.

---

## Out of Scope (MVP)

- Emoji reactions on comments
- Comment-only editing mode for external guests without an account
- Comment export
- Comment search
- Thread subscription / watching specific threads
