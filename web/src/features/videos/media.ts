import { api, authHeaders, sendWithProgress } from "@/lib/api";

export type WatchResult =
  | { ready: true; iframe: string }
  | { ready: false; state: string; percent: number };

/** A signed, two-hour player link for the watermarked preview, or how far processing is. */
export function watchLink(videoId: string): Promise<WatchResult> {
  return api<WatchResult>(`/api/videos/${videoId}/watch`);
}

/** Opens a ten-minute link to the clean final; the browser saves it. */
export async function downloadFinal(videoId: string): Promise<void> {
  const { url } = await api<{ url: string }>(`/api/videos/${videoId}/download`);
  window.location.assign(url);
}

export const PREVIEW_LIMIT = 200 * 1024 * 1024;

/**
 * Uploads a new preview straight to Cloudflare Stream (it adds the watermark), then points the
 * video at it. Up to 200 MB, which is plenty for a 1080p reel.
 */
export async function uploadPreview(
  videoId: string,
  file: File,
  onProgress: (share: number) => void,
): Promise<void> {
  if (file.size > PREVIEW_LIMIT) throw new Error("preview_too_big");
  const { uploadURL, uid } = await api<{ uploadURL: string; uid: string }>(
    `/api/videos/${videoId}/preview`,
  );
  const form = new FormData();
  form.append("file", file);
  await sendWithProgress("POST", uploadURL, form, {}, (loaded) => onProgress(loaded / file.size));
  await api(`/api/videos/${videoId}/preview/attach`, { uid });
}

/** Uploads the clean final to private storage in parts; the worker records it on the video. */
export async function uploadFinal(
  videoId: string,
  file: File,
  onProgress: (share: number) => void,
): Promise<void> {
  const base = `/api/videos/${videoId}/final`;
  const start = await api<{ key: string; uploadId: string; partSize: number }>(`${base}/start`, {
    name: file.name,
    type: file.type,
  });
  const { key, uploadId, partSize } = start;
  const parts: { partNumber: number; etag: string }[] = [];
  try {
    for (let offset = 0, n = 1; offset < file.size; offset += partSize, n += 1) {
      const chunk = file.slice(offset, Math.min(offset + partSize, file.size));
      const params = new URLSearchParams({ key, uploadId, part: String(n) });
      const text = await sendWithProgress(
        "PUT",
        `${base}/part?${params.toString()}`,
        chunk,
        await authHeaders(),
        (loaded) => onProgress((offset + loaded) / file.size),
      );
      parts.push(JSON.parse(text) as { partNumber: number; etag: string });
    }
  } catch (e) {
    await api(`${base}/abort`, { key, uploadId }).catch(() => undefined);
    throw e;
  }
  await api(`${base}/complete`, { key, uploadId, parts, name: file.name });
}

/** Deletes the video and its files at Cloudflare. */
export async function deleteVideo(videoId: string): Promise<void> {
  await api(`/api/videos/${videoId}/delete`);
}
