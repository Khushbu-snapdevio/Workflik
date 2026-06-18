export interface UploadSlot {
  /** URL the client sends the file to */
  url: string;
  /** PUT for S3/R2 presigned URLs, POST for local multipart */
  method: "PUT" | "POST";
  /** Headers the client must include (e.g. Content-Type for S3) */
  headers: Record<string, string>;
}

export interface StorageDriver {
  /** Generate an upload slot for the client to PUT/POST the file to. */
  createUploadSlot(params: {
    objectKey:     string;
    mimeType:      string;
    fileSizeBytes: number;
  }): Promise<UploadSlot>;

  /** Verify the object exists in storage after the client upload. */
  exists(objectKey: string): Promise<boolean>;

  /** Delete an object from storage. */
  delete(objectKey: string): Promise<void>;

  /** Return the stable public URL for a stored object. */
  getPublicUrl(objectKey: string): string;
}
