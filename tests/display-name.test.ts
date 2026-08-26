import { describe, expect, it } from "vitest";
import { resolveDisplayName } from "@/lib/users/display-name";

describe("resolveDisplayName", () => {
  it("prefers the name when one is set", () => {
    expect(resolveDisplayName("Ada Lovelace", "ada@example.com")).toBe(
      "Ada Lovelace"
    );
  });

  it("falls back to the email's local part when no name is set", () => {
    expect(resolveDisplayName(null, "ada@example.com")).toBe("ada");
    expect(resolveDisplayName(undefined, "ada@example.com")).toBe("ada");
  });

  it("falls back to the email's local part for an empty-string name", () => {
    // "" is falsy, so `name || ...` falls through exactly like null/undefined.
    expect(resolveDisplayName("", "ada@example.com")).toBe("ada");
  });

  it("returns null when neither a name nor an email is available", () => {
    // Kept visually distinct from "no name set" — see the comment in
    // lib/users/display-name.ts.
    expect(resolveDisplayName(null, null)).toBeNull();
    expect(resolveDisplayName(undefined, undefined)).toBeNull();
  });
});
