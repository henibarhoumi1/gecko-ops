// The few Cloudflare Workers types this worker uses, so the app needs no extra type package.

export interface R2Object {
  key: string;
  size: number;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

export interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

export interface R2MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(partNumber: number, body: ReadableStream | ArrayBuffer): Promise<R2UploadedPart>;
  complete(parts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
  createMultipartUpload(
    key: string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
}

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  FINALS: R2Bucket;
  SUPABASE_URL: string;
  CF_ACCOUNT_ID: string;
  /** Cloudflare API token with Stream: Edit. A secret, set in the dashboard. */
  STREAM_TOKEN?: string;
  /** Any long random string; signs the short-lived download links. A secret, set in the dashboard. */
  LINK_SECRET?: string;
}

/** What the database says the signed-in person may do with one video (video_media_access). */
export interface Access {
  workspaceId: string;
  clientId: string;
  videoId: string;
  who: "team" | "client";
  previewUid: string | null;
  canUpload: boolean;
  canDownload: boolean;
  finalKey: string | null;
  finalName: string | null;
}
