import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext secret", () => {
    const plaintext = "smtp-password-hunter2";
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptSecret("");
    expect(decryptSecret(encrypted)).toBe("");
  });

  it("produces different ciphertext for the same plaintext each call (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-secret");
    expect(decryptSecret(b)).toBe("same-secret");
  });

  it("stores the IV, auth tag, and ciphertext as three hex segments", () => {
    const encrypted = encryptSecret("s3cr3t");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("rejects tampered ciphertext instead of silently returning garbage", () => {
    const encrypted = encryptSecret("s3cr3t");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    // Flip the last hex character of the ciphertext — AES-GCM's auth tag must
    // then fail verification rather than decrypt to the wrong plaintext.
    const flipped =
      ciphertext.slice(0, -1) + (ciphertext.at(-1) === "0" ? "1" : "0");
    const tampered = [iv, authTag, flipped].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
