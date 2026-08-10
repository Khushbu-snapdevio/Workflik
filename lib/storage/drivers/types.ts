export interface UploadSlot {
  /** Headers the client must include (e.g. Content-Type for S3) */
  headers: Record<string, string>;
  /** PUT for S3/R2 presigned URLs, POST for local multipart */
  method: "PUT" | "POST";
  /** URL the client sends the file to */
  url: string;
}

export interface StorageDriver {
  /** Generate an upload slot for the client to PUT/POST the file to. */
  createUploadSlot(params: {
    objectKey: string;
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<UploadSlot>;

  /** Delete an object from storage. */
  delete(objectKey: string): Promise<void>;

  /** Verify the object exists in storage after the client upload. */
  exists(objectKey: string): Promise<boolean>;

  /** Return the stable public URL for a stored object. */
  getPublicUrl(objectKey: string): string;
}
