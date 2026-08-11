# File Storage

## Overview

File Storage handles all binary uploads in WorkFlik — page cover images, page icons, and media blocks (Image, Video, Audio, File).

**Storage driver:** Controlled by the `STORAGE_DRIVER` env var (or Orbit Admin → Integrations, which overrides it without touching `.env`):

| `STORAGE_DRIVER` | Where files go | How served | When to use |
|-----------------|---------------|------------|------------|
| `local` (default) | `./uploads/` on disk | `/api/uploads/files/*` API route, proxied from disk | Local development — no credentials needed |
| `s3` | AWS S3 bucket via presigned PUT URL | `/api/uploads/files/*` API route, proxied from the bucket | Production with AWS S3 |
| `r2` | Cloudflare R2 via presigned PUT URL (S3-compatible) | `/api/uploads/files/*` API route, proxied from the bucket | Production with Cloudflare R2 |

Every driver is *served* the same way — `/api/uploads/files/[...path]` calls the active driver's `download()` and streams the bytes back itself, so no public bucket or CDN URL is ever needed. *Uploads* are the one place drivers still diverge: `local` posts through the app, `s3`/`r2` upload directly from the browser to the bucket via a presigned PUT URL (bucket needs a CORS policy allowing that, see `SELF-HOSTING.md` §5).

The storage abstraction lives in `lib/storage/` — drivers are in `lib/storage/drivers/`. Switching drivers requires only changing `STORAGE_DRIVER`; all API routes and job handlers work with any driver.

---

## Upload Flow

All uploads use **pre-signed URLs** — the client receives a signed URL from the API and uploads directly to the storage bucket, bypassing the Next.js server. This avoids streaming large files through the app server.

### Step-by-step

```
Client                     API Server              S3-compatible storage
  │                              │                                │
  │── POST /api/uploads/sign ───►│                                │
  │   { type, size, mimeType }   │                                │
  │                              │── generate pre-signed PUT URL ►│ (presigned URL)
  │                              │◄─ signed URL + objectKey ──────│
  │◄─ { uploadUrl, objectKey } ──│                                │
  │                              │                                │
  │── PUT {uploadUrl} ──────────────────────────────────────────►│
  │   (file bytes, direct to bucket)                              │
  │◄─ 200 OK ────────────────────────────────────────────────────│
  │                              │                                │
  │── POST /api/uploads/confirm ►│                                │
  │   { objectKey }              │── verify object exists ───────►│ (HeadObject)
  │                              │── update storage usage ─────── DB
  │◄─ { fileUrl } ───────────────│                                │
```

### API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/uploads/sign` | Validate file type + size + quota, create unconfirmed `file_uploads` row, return upload slot (`{ fileUploadId, objectKey, fileUrl, upload: { url, method, headers } }`). `method` is `"PUT"` for S3/R2 (presigned URL) or `"POST"` for the local driver. | Authenticated member |
| POST | `/api/uploads/confirm` | Verify object exists in storage, mark `confirmed_at`, increment `workspace_storage_usage.bytes_used`. Idempotent. | Authenticated member (must be uploader) |
| POST | `/api/uploads/local` | **Local driver only.** Accepts `multipart/form-data` with `file` + `objectKey` fields. Saves file to `UPLOAD_DIR`. Returns 404 when `STORAGE_DRIVER != "local"`. | Authenticated member |
| GET | `/api/uploads/files/[...path]` | **Every driver.** Calls the active driver's `download()` and streams the bytes back — disk read for `local`, `GetObject` for `s3`/`r2`. The only place any uploaded file is ever served from. | Public (files served with immutable cache headers) |

> **File deletion** is always async via pg-boss job handlers — no delete endpoint for end-user actions. Cleanup jobs call `lib/storage/index.ts#getStorage().delete()` directly.

---

## Upload Rules

### Allowed MIME Types

| Category | Allowed Types |
|----------|--------------|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Video | `video/mp4`, `video/webm`, `video/quicktime` |
| Audio | `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/mp4` |
| File | Any MIME type (generic file block) |

### Per-File Size Limits

| Block Type | Max Size |
|------------|---------|
| Page cover image | 5 MB |
| Page icon (custom image) | 1 MB |
| User avatar | 1 MB |
| Workspace icon | 1 MB |
| Image block | 10 MB |
| Video block | 50 MB |
| Audio block | 50 MB |
| File block | 100 MB |

**User avatars and workspace icons** are image-only (`image/jpeg`, `image/png`, `image/webp`). A **user avatar is global to the user, not workspace-scoped** — it is stored with `workspace_id = null` and **does not count toward any workspace's 5 GB quota**. A **workspace icon is workspace-scoped and counts** toward that workspace's quota like any other upload.

These limits are enforced at the `/api/uploads/sign` step — if the declared size exceeds the limit, the API returns a 400 error before any upload occurs.

---

## Storage Tracking

Storage usage is calculated as the sum of all file sizes stored in the workspace. Database content (text, block metadata) does not count toward storage.

**Workspace storage quota:** **5 GB per workspace** (MVP). All uploaded files in the workspace count toward this ceiling.

## Storage Usage Enforcement

### Pre-upload check

Before issuing a pre-signed URL, the API checks:

1. Current workspace storage usage (from `WorkspaceStorageUsage.bytes_used`)
2. Requested file size
3. Whether `bytes_used + requested size` would exceed the **5 GB** workspace quota — if so, the request is rejected before any bytes are sent

### Usage tracking

- `WorkspaceStorageUsage.bytes_used` is incremented on upload confirm
- `WorkspaceStorageUsage.bytes_used` is decremented when a file is deleted (block delete, page permanent delete, workspace delete)
- Usage is updated atomically to prevent race conditions

---

## Storage Usage UI

Shown in **Workspace Settings → General** (visible to all members, admin can see full detail):

```
┌────────────────────────────────────────────────┐
│ Storage                                         │
│                                                 │
│  [████████░░░░░░░░░░░░░░] 4.2 GB of 5 GB used   │
│                                                 │
└────────────────────────────────────────────────┘
```

- Progress bar turns amber at 90% used (4.5 GB of the 5 GB quota)
- Progress bar turns red at 100% used (5 GB — new uploads blocked)

---

## File Deletion

Files are deleted from storage when:

| Trigger | Behavior |
|---------|---------|
| Block deleted from editor | File is **not** deleted immediately — this preserves undo (`Ctrl+Z`) and Version History restore. The file becomes a deletion candidate and is removed later by the orphaned-media cleanup job (below); usage is decremented when the file is actually deleted. |
| Page permanently deleted | Delete all file blocks on the page from storage; decrement usage |
| Workspace deleted | Delete all workspace files from storage; usage record dropped |
| Upload aborted / not confirmed within 30 minutes | Object is cleaned up by a pg-boss job (stale upload cleanup) |

Deletes from storage are **always async via pg-boss** — the UI reflects block deletion immediately, but storage cleanup happens in the background. File bytes are **never** deleted synchronously from the editor.

### Orphaned-media cleanup

Because deleting a block is reversible (in-session undo, and page Version History for 7 days), the stored file is **never** deleted at the moment a block is removed. Instead, a daily pg-boss job (`cleanup-orphaned-media`) deletes a file only when **both** are true:

- No active block on any live page references the object key, **and**
- The object key is not referenced by any `page_versions` row whose `created_at` is within the last **7 calendar days** (wall-clock, not rolling — the boundary is `NOW() - INTERVAL '7 days'`).

Only then is the object removed from storage and the workspace `bytes_used` decremented. This guarantees that undoing a block delete — or restoring an older page version — always finds its media intact.

> **Boundary example:** A file uploaded on Day 1 and deleted from its block on Day 2 will be cleaned up on or after Day 9 (once all page versions referencing it are older than 7 days). If Version History is restored on Day 6 (re-creating an active block reference), the file is no longer a deletion candidate until that block is removed again.

---

## Object Key Structure

```
{workspaceId}/{pageId}/{uuid}.{ext}      # workspace-scoped uploads
users/{userId}/{uuid}.{ext}              # user_avatar (no workspace)
```

Example: `wsp_abc123/pg_xyz789/img_k3j9x2a.webp` · `users/usr_def456/avatar_k3j9x2a.webp`

- Never publicly guessable — UUIDs are random
- Public URL: `{NEXT_PUBLIC_APP_URL}/api/uploads/files/{objectKey}` — always app-relative, regardless of driver (see the proxy route above)

---

## Data Model

```
FileUpload
├── id                  (uuid, primary key)
├── workspace_id        (foreign key → Workspace, nullable — null for user_avatar; not quota-counted)
├── kind                (enum: page_cover | page_icon | block_media | user_avatar | workspace_icon)
├── page_id             (foreign key → Page, nullable — for page cover/icon)
├── block_id            (foreign key → Block, nullable — for media blocks)
├── object_key          (string — storage object key, unique)
├── file_url            (string — app-relative /api/uploads/files/{objectKey} URL, any driver)
├── mime_type           (string)
├── file_size_bytes     (bigint)
├── uploaded_by         (user_id, foreign key)
├── confirmed_at        (timestamp, nullable — null until upload confirmed)
└── created_at          (timestamp)

WorkspaceStorageUsage
├── workspace_id        (foreign key → Workspace, primary key)
├── bytes_used          (bigint, default: 0)
└── updated_at          (timestamp)
```

---

## Background Jobs (pg-boss)

| Job | Schedule | Description |
|-----|----------|-------------|
| `cleanup-stale-uploads` | Every 30 minutes | Delete storage objects for uploads not confirmed within 30 minutes (abandoned uploads) |
| `cleanup-orphaned-media` | Daily | Delete stored files no longer referenced by any active block or by a page version within the 7-day window, then decrement `bytes_used` |
| `sync-storage-usage` | Daily | Reconcile `bytes_used` against actual storage objects for drift correction |

---

## Business Rules

1. Uploads go directly to the storage bucket via pre-signed URL (s3/r2) or through the app (local) — they never transit the Next.js app server for s3/r2. Reads always transit the app server, via `/api/uploads/files/[...path]`, regardless of driver.
2. Pre-signed PUT URLs expire after **15 minutes** — the client must complete the upload within this window.
3. An upload is not recorded until `/api/uploads/confirm` is called with the object key.
4. Storage quota is checked before issuing a pre-signed URL — a quota breach blocks the upload before any bytes are sent.
5. File deletion from storage is always async via pg-boss — the UI reflects deletion immediately but storage cleanup happens in the background.
6. Deleting a file block does not decrement `bytes_used` immediately — usage is decremented when the orphaned-media cleanup job actually removes the file (after it leaves the 7-day Version History window), so undo and version restore keep working.
7. Workspace storage usage is shown to all members.
8. A file's public URL is stable — it does not change after upload.
9. Abandoned uploads (not confirmed within 30 minutes) are cleaned up by the stale-upload job.

---

## Out of Scope (MVP)

- Image resizing / optimization on upload (Phase 2)
- Video transcoding (embed via URL is the MVP path for large videos)
- Per-member storage breakdown
- Storage usage history / graph
