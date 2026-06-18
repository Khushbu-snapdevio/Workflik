import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── Email ──────────────────────────────────────────────────────────────────
  SMTP_HOST: optionalString,
  SMTP_PORT: z.preprocess((v) => (v ? Number(v) : undefined), z.number().optional()),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_WEBHOOK_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // ── File storage ───────────────────────────────────────────────────────────
  // STORAGE_DRIVER: "local" (default) saves to UPLOAD_DIR and serves via API.
  //                 "s3" or "r2" uses presigned PUT URLs with the AWS SDK.
  STORAGE_DRIVER: z.enum(["local", "s3", "r2"]).default("local"),
  // Local driver — absolute or relative path; defaults to <project-root>/uploads
  UPLOAD_DIR: optionalString,
  // S3 / R2 driver — all required when STORAGE_DRIVER is "s3" or "r2"
  S3_ENDPOINT:          optionalString,   // leave unset for AWS; set for R2 / MinIO
  S3_BUCKET:            optionalString,
  S3_REGION:            optionalString,
  S3_ACCESS_KEY_ID:     optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  CDN_URL:              optionalString,   // CDN base URL, e.g. https://cdn.example.com
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
