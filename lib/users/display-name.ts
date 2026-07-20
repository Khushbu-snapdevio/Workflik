// A user who never set a display name is still a real, current member — not
// the same thing as "no longer in the workspace." Deriving a fallback from
// the email's local part (rather than leaving `name` null, or worse,
// stringifying that null all the way to a "this person is gone" label)
// keeps those two states distinct wherever a user's display name is shown.
export function resolveDisplayName(
  name: string | null | undefined,
  email: string | null | undefined
): string | null {
  return name || (email ? email.split("@")[0] : null);
}
