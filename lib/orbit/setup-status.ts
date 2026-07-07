import { env } from "@/lib/env";
import { isSmtpConfigured } from "@/lib/smtp/client";

// Loose match on purpose — every placeholder value across .env.example,
// this repo's Dockerfile build-time placeholder, and hand-written examples
// contains one of these words. Better to under-trust a real secret that
// happens to contain "example" than to miss an unrotated placeholder.
const PLACEHOLDER_PATTERN =
  /change-?me|replace-?with|placeholder|your-secret|^example/i;

export function getInstanceSetupStatus() {
  const storageConfigured =
    env.STORAGE_DRIVER === "local" ||
    Boolean(
      env.S3_BUCKET &&
        env.S3_REGION &&
        env.S3_ACCESS_KEY_ID &&
        env.S3_SECRET_ACCESS_KEY
    );

  return {
    smtpConfigured: isSmtpConfigured(),
    storageConfigured,
    storageDriver: env.STORAGE_DRIVER,
    appSecretIsPlaceholder: PLACEHOLDER_PATTERN.test(env.APP_SECRET),
  };
}
