import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { StorageDriver, UploadSlot } from "./types";

function buildClient(): S3Client {
  return new S3Client({
    region: env.S3_REGION ?? "auto",
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    // Required for path-style access (Cloudflare R2, MinIO, etc.)
    forcePathStyle: !!env.S3_ENDPOINT,
  });
}

export function createS3Driver(): StorageDriver {
  const client = buildClient();
  const bucket = env.S3_BUCKET!;
  const cdnUrl = env.CDN_URL!.replace(/\/$/, "");

  return {
    async createUploadSlot({
      objectKey,
      mimeType,
      fileSizeBytes,
    }): Promise<UploadSlot> {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: mimeType,
        ContentLength: fileSizeBytes,
      });

      const url = await getSignedUrl(client, command, { expiresIn: 900 }); // 15 min

      return {
        url,
        method: "PUT",
        headers: { "Content-Type": mimeType },
      };
    },

    async exists(objectKey): Promise<boolean> {
      try {
        await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: objectKey })
        );
        return true;
      } catch {
        return false;
      }
    },

    async delete(objectKey): Promise<void> {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })
      );
    },

    getPublicUrl(objectKey): string {
      return `${cdnUrl}/${objectKey}`;
    },
  };
}
