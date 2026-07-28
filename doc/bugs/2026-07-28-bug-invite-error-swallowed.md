# Bug: invite failures always show the same generic error, no matter the reason

**Reported:** 2026-07-28

## Symptom

Sending a workspace invite that failed for any reason — inviting someone already an active member, an already-pending invite, insufficient role, etc. — showed only "Couldn't invite: <email>" in the "Add members" modal, with no indication of why. This made a correctly-behaving 409 rejection (e.g. inviting an email that's already a member) look like a broken feature.

## Root cause

`components/workspace/invite-members-modal.tsx`'s `handleSendInvite` checked `res.ok` on each invite request but never read the response body when it failed, discarding whatever specific reason `app/api/workspaces/[id]/members/route.ts` returned (`{ error: "..." }`) — e.g. "User is already a member of this workspace", "An invite has already been sent to this email", "Only the workspace owner can invite someone as an Admin".
