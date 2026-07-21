# Bug: "Copy workspace link" in the Share popover doesn't let invitees join

**Reported:** 2026-07-21

## Symptom

Opening the "Share workspace" popover (from the workspace topbar) and clicking "Copy workspace link" copies a URL to the clipboard, but visiting that URL doesn't let an invited (non-member) user actually join the workspace.

## Root cause

Two separate problems, both required to make the button actually work:

1. **`components/workspace/workspace-share-button.tsx`'s `copyLink()` copied `window.location.href`** — i.e. whatever `/app/{slug}` page the sharer happened to be viewing. That's a normal authenticated app route: it requires existing workspace membership to view, so a non-member opening it is a dead end, not an invite acceptance flow. The component wasn't even passed the workspace `id`, so it had no way to fetch a real invite token in the first place.
2. **The actual invite-acceptance backend never resolved the workspace-level shareable link at all.** `workspaces.inviteLinkToken`/`inviteLinkActive`/`inviteLinkRole` (generated via Settings → Workspace → General, `/api/workspaces/:id/invite-link`) is a distinct mechanism from the per-email invite (`workspaceMembers.inviteToken`). Both `app/invite/[token]/page.tsx` and `app/api/invite/[token]/accept/route.ts` only ever queried `workspaceMembers.inviteToken` — so even a correctly-built `/invite/{workspace.inviteLinkToken}` URL would 404 with "This invite link is invalid," because there's no `workspaceMembers` row for an anonymous invitee to match against.
