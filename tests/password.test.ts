import { describe, expect, it } from "vitest";
import {
  isPasswordValid,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordError,
} from "@/lib/auth/password";

describe("passwordError", () => {
  it("accepts a password satisfying every rule", () => {
    expect(passwordError("Correct-Horse9")).toBeNull();
  });

  it("reports the length rule first, before character-class rules", () => {
    // Too short AND missing every character class — length should win since
    // PASSWORD_RULES is ordered length-first.
    expect(passwordError("ab")).toBe(
      `Password must be at least ${PASSWORD_MIN} characters.`
    );
  });

  it("reports a missing uppercase letter", () => {
    expect(passwordError("lowercase1!")).toBe(
      "Password must include at least one uppercase letter."
    );
  });

  it("reports a missing lowercase letter", () => {
    expect(passwordError("UPPERCASE1!")).toBe(
      "Password must include at least one lowercase letter."
    );
  });

  it("reports a missing digit", () => {
    expect(passwordError("NoDigitsHere!")).toBe(
      "Password must include at least one number."
    );
  });

  it("reports a missing special character", () => {
    expect(passwordError("NoSymbolsHere1")).toBe(
      "Password must include at least one special character."
    );
  });

  it("rejects a password over the maximum length", () => {
    const tooLong = `Aa1!${"x".repeat(PASSWORD_MAX)}`;
    expect(passwordError(tooLong)).toBe(
      `Password must be at most ${PASSWORD_MAX} characters.`
    );
  });

  it("accepts non-Latin uppercase/lowercase letters (\\p{Lu}/\\p{Ll}, not [A-Z]/[a-z])", () => {
    // Cyrillic Б (uppercase) + б (lowercase) satisfy the letter-case rules
    // the same way Latin letters do — this is a documented, deliberate
    // choice in lib/auth/password.ts, not an accident.
    expect(passwordError("Бб123456!")).toBeNull();
  });

  it("does not let an accented letter alone satisfy the special-character rule", () => {
    // "ñ" is \p{L}, not a symbol — "Contraseña1" must still fail for having
    // no special character, per the comment in lib/auth/password.ts.
    expect(passwordError("Contrasena1")).toBe(
      "Password must include at least one special character."
    );
  });
});

describe("isPasswordValid", () => {
  it("mirrors passwordError being null", () => {
    expect(isPasswordValid("Correct-Horse9")).toBe(true);
    expect(isPasswordValid("weak")).toBe(false);
  });
});
