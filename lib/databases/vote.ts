// Vote-mode Person properties (config.voteMode) store the same
// `{ userIds, _members }` shape as any other Person value — a "vote" is just
// the acting user's own id being present in that list. This helper computes
// the value after the current user toggles their *own* vote on/off, used by
// every view's click-to-vote handler (table/board/gallery + the template
// variants + the entry detail page) so the toggle logic lives in one place.
//
// The server (app/api/entries/[id]/property-values/[propId]/route.ts)
// independently enforces that a non-admin write only ever adds/removes the
// requester's own id — this helper is the UI side of that same rule, never
// the sole guard.

export interface VoteUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export type VoteValue = {
  userIds: string[];
  _members: { id: string; name: string; email: string }[];
};

export function toggleSelfVote(
  current: { userIds?: string[]; _members?: { id: string; name?: string; email?: string }[] } | null | undefined,
  user: VoteUser,
): VoteValue {
  const userIds = current?.userIds ?? [];
  const members = (current?._members ?? []).map((m) => ({ id: m.id, name: m.name ?? "", email: m.email ?? "" }));
  const hasVoted = userIds.includes(user.id);
  return {
    userIds: hasVoted ? userIds.filter((id) => id !== user.id) : [...userIds, user.id],
    _members: hasVoted
      ? members.filter((m) => m.id !== user.id)
      : [...members, { id: user.id, name: user.name ?? "", email: user.email ?? "" }],
  };
}
