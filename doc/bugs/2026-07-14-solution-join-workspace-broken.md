# Solution: "Join workspace" replaced with a working "Invite members" popup

**Fixed:** 2026-07-14

## What changed

1. **`components/sidebar/workspace-switcher.tsx`** — removed the broken "Join workspace" feature entirely: the paste-a-link panel and its backing state/logic (`showJoin`, `joinLink`, `joinError`, `extractToken`, `handleJoin`). In its place, the footer now shows **"Invite members"**, matching Notion's own workspace-switcher menu (confirmed against a real Notion screenshot) — no dead "join via link" affordance left behind.

2. **`components/workspace/invite-members-modal.tsx`** (new) — "Invite members" now opens a lightweight popup (email input, accepts comma-separated addresses, role picker, Send/Cancel) instead of navigating to Settings → Members. It calls the *same* `POST /api/workspaces/:id/members` endpoint the Settings page already used — no new invite logic, just a faster entry point to the mechanism that actually works. Settings → Members is untouched and remains the fuller page for managing existing members, pending invites, and roles.

3. **Role parity fix** — the modal initially only offered Member/Viewer (not Admin), since assigning Admin is owner-only server-side and the modal had no way to check ownership. Added an `isOwner` check (`workspace.createdBy === session.user.id`, via the existing `useSession()` client hook) so the modal now offers the same three roles as Settings → Members, and only shows Admin when the current user actually is the owner — matching that page's own gating exactly instead of quietly differing from it.

4. **`components/ui/select.tsx`** — while wiring up the role picker inside the new modal, its dropdown appeared not to open at all. Root cause: `SelectContent` (Radix, portaled to `document.body`) had a hardcoded `z-50`, while the new modal sits at `z-[590]` — since the portaled dropdown becomes a *sibling* of the modal under `<body>`, the modal won the stacking order and the dropdown rendered invisibly underneath it. Fixed at the shared component (bumped to `z-[600]`, above every elevated tier already in this app: sidebar `z-[550]`, modals `z-[580]`/`z-[590]`) rather than patching just this one call site, since the same shared primitive is used by every `Select` in the app.

## Why this fixes the root cause

The actual problem was never "the invite-link UI has a bug" — it was that an entire feature (shareable link) had no working consumer side at all, while a real, working feature (email invite) was one extra navigation away from where users would naturally look for it. Removing the non-functional option and putting the functional one in its place — with the same role rules as the page it's a shortcut for — closes that gap without inventing new invite plumbing.

## Verification

`tsc --noEmit` passes across the whole project after all edits. Not verified in a live browser (no browser automation tool available in this environment) — worth confirming: "Invite members" opens the popup (not a navigation), sending an invite works end to end, the Admin option only appears for the workspace owner, and the role dropdown visibly opens above the modal.
