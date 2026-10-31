// The app's worker. It serves the built app, and under /api/ it hands out video links:
// watermarked previews from Cloudflare Stream and clean finals from R2. It never decides who may see
// what: it asks the database (video_media_access) with the signed-in person's own token every time.

import {
  attachmentHeader,
  finalPrefix,
  HttpError,
  matchVideoRoute,
  safeName,
  signLink,
  streamHost,
  verifyLink,
  type VideoAction,
} from "./lib";
import type { Access, Env, R2UploadedPart } from "./types";

const PART_SIZE = 50 * 1024 * 1024; // must match web/src/features/videos/media.ts
const WATCH_LINK_SECONDS = 2 * 60 * 60;
const DOWNLOAD_LINK_SECONDS = 10 * 60;
const WATERMARK_NAME = "Gecko preview";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: "server_error" }, 500);
    }
  },
};

async function api(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === "/api/download" && request.method === "GET") return download(env, url);
  const route = matchVideoRoute(url.pathname);
  if (!route) throw new HttpError(404, "not_found");
  const expected = route.action === "final/part" ? "PUT" : "POST";
  if (request.method !== expected) throw new HttpError(405, "method_not_allowed");
  const access = await checkAccess(request, env, route.videoId);
  return handlers[route.action](request, env, url, access);
}

type Handler = (request: Request, env: Env, url: URL, access: Access) => Promise<Response>;

const handlers: Record<VideoAction, Handler> = {
  // A signed player link for the preview, or how far Stream is with processing it.
  async watch(_request, env, _url, access) {
    if (!access.previewUid) throw new HttpError(404, "no_preview");
    const video = await stream<{
      readyToStream: boolean;
      status?: { state?: string; pctComplete?: string };
      preview?: string;
    }>(env, `/stream/${access.previewUid}`);
    if (!video.readyToStream)
      return json({
        ready: false,
        state: video.status?.state ?? "processing",
        percent: Number(video.status?.pctComplete ?? 0),
      });
    const { token } = await stream<{ token: string }>(env, `/stream/${access.previewUid}/token`, {
      method: "POST",
      body: JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + WATCH_LINK_SECONDS,
        downloadable: false,
      }),
    });
    const host = streamHost(video.preview) ?? "iframe.videodelivery.net";
    const iframe =
      host === "iframe.videodelivery.net"
        ? `https://${host}/${token}`
        : `https://${host}/${token}/iframe`;
    return json({ ready: true, iframe });
  },

  // A one-time upload address for a new preview. Stream burns the Gecko watermark into it and only
  // plays it through signed links.
  async preview(request, env, _url, access) {
    needUpload(access);
    const origin = new URL(request.url).origin;
    const watermark = await watermarkUid(env, origin);
    const result = await stream<{ uploadURL: string; uid: string }>(env, "/stream/direct_upload", {
      method: "POST",
      body: JSON.stringify({
        maxDurationSeconds: 1800,
        requireSignedURLs: true,
        watermark: { uid: watermark },
        meta: { name: `${access.clientId} / ${access.videoId}`, videoId: access.videoId },
      }),
    });
    return json({ uploadURL: result.uploadURL, uid: result.uid });
  },

  // Points the video at the preview the browser just uploaded, then drops the old cut from Stream.
  // The upload must be one this worker created for this same video.
  async "preview/attach"(request, env, _url, access) {
    needUpload(access);
    const { uid } = (await request.json().catch(() => ({}))) as { uid?: string };
    if (!uid || !/^[0-9a-f]{32}$/.test(uid)) throw new HttpError(400, "bad_upload");
    const video = await stream<{ meta?: Record<string, string> }>(env, `/stream/${uid}`);
    if (video.meta?.videoId !== access.videoId) throw new HttpError(400, "bad_upload");
    await updateVideo(request, env, access.videoId, { preview_uid: uid });
    if (access.previewUid && access.previewUid !== uid) await dropPreview(env, access.previewUid);
    return json({ attached: true });
  },

  // Deletes the video (the database checks the person may), then its files at Cloudflare.
  async delete(request, env, _url, access) {
    needUpload(access);
    const res = await asUser(request, env, `/rest/v1/videos?id=eq.${access.videoId}&select=id`, {
      method: "DELETE",
      headers: { prefer: "return=representation" },
    });
    const rows = (await res.json().catch(() => [])) as unknown[];
    if (!res.ok || rows.length !== 1) throw new HttpError(403, "forbidden");
    await Promise.all([
      access.previewUid ? dropPreview(env, access.previewUid) : null,
      access.finalKey ? dropFinal(env, access.finalKey) : null,
    ]);
    return json({ deleted: true });
  },

  async download(_request, env, url, access) {
    if (!access.canDownload || !access.finalKey) throw new HttpError(403, "locked");
    const secret = needSecret(env.LINK_SECRET, "LINK_SECRET");
    const token = await signLink(
      {
        k: access.finalKey,
        n: access.finalName ?? "final",
        e: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_SECONDS,
      },
      secret,
    );
    return json({ url: `${url.origin}/api/download?t=${encodeURIComponent(token)}` });
  },

  // Finals go to R2 in 50 MB parts, through this worker (one request can't carry a whole 4K file).
  async "final/start"(request, env, _url, access) {
    needUpload(access);
    const body = (await request.json().catch(() => ({}))) as { name?: string; type?: string };
    const name = String(body.name ?? "final").slice(0, 200);
    const key = `${finalPrefix(access)}${Date.now()}-${safeName(name)}`;
    const upload = await env.FINALS.createMultipartUpload(key, {
      httpMetadata: { contentType: String(body.type || "application/octet-stream").slice(0, 100) },
      customMetadata: { name },
    });
    return json({ key: upload.key, uploadId: upload.uploadId, partSize: PART_SIZE });
  },

  async "final/part"(request, env, url, access) {
    needUpload(access);
    const { key, uploadId } = ownUpload(url.searchParams, access);
    const partNumber = Number(url.searchParams.get("part"));
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000)
      throw new HttpError(400, "bad_part");
    const length = Number(request.headers.get("content-length"));
    if (!request.body || !length || length > PART_SIZE) throw new HttpError(400, "bad_part");
    const part = await env.FINALS.resumeMultipartUpload(key, uploadId).uploadPart(
      partNumber,
      request.body,
    );
    return json(part);
  },

  // Joins the parts, records the file on the video, then drops the file it replaces.
  async "final/complete"(request, env, _url, access) {
    needUpload(access);
    const body = (await request.json().catch(() => ({}))) as {
      key?: string;
      uploadId?: string;
      parts?: R2UploadedPart[];
      name?: string;
    };
    const { key, uploadId } = ownUpload(
      new URLSearchParams({ key: body.key ?? "", uploadId: body.uploadId ?? "" }),
      access,
    );
    const parts = (body.parts ?? []).filter(
      (p) => Number.isInteger(p.partNumber) && typeof p.etag === "string",
    );
    if (parts.length === 0) throw new HttpError(400, "bad_parts");
    const object = await env.FINALS.resumeMultipartUpload(key, uploadId).complete(parts);
    const name = String(object.customMetadata?.name ?? body.name ?? "final").slice(0, 200);
    try {
      await updateVideo(request, env, access.videoId, {
        final_key: object.key,
        final_name: name,
        final_size: object.size,
      });
    } catch (error) {
      await dropFinal(env, object.key);
      throw error;
    }
    if (access.finalKey && access.finalKey !== object.key) await dropFinal(env, access.finalKey);
    return json({ key: object.key, size: object.size, name });
  },

  async "final/abort"(request, env, _url, access) {
    needUpload(access);
    const body = (await request.json().catch(() => ({}))) as { key?: string; uploadId?: string };
    const { key, uploadId } = ownUpload(
      new URLSearchParams({ key: body.key ?? "", uploadId: body.uploadId ?? "" }),
      access,
    );
    await env.FINALS.resumeMultipartUpload(key, uploadId).abort();
    return json({ aborted: true });
  },
};

/** Streams a final file to whoever holds a valid, unexpired link from the download handler. */
async function download(env: Env, url: URL): Promise<Response> {
  const secret = needSecret(env.LINK_SECRET, "LINK_SECRET");
  const claims = await verifyLink(url.searchParams.get("t") ?? "", secret);
  if (!claims) throw new HttpError(403, "link_expired");
  const object = await env.FINALS.get(claims.k);
  if (!object) throw new HttpError(404, "not_found");
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Content-Disposition": attachmentHeader(claims.n),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Calls the database's API as the signed-in person, so their own rights apply. */
async function asUser(
  request: Request,
  env: Env,
  path: string,
  init: { method: string; body?: string; headers?: Record<string, string> },
): Promise<Response> {
  const authorization = request.headers.get("authorization");
  const apikey = request.headers.get("apikey");
  if (!authorization?.startsWith("Bearer ") || !apikey) throw new HttpError(401, "sign_in");
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey, authorization, "content-type": "application/json", ...init.headers },
  });
  if (res.status === 401) throw new HttpError(401, "sign_in");
  return res;
}

/** Asks the database, as the signed-in person, what they may do with this video. */
async function checkAccess(request: Request, env: Env, videoId: string): Promise<Access> {
  const res = await asUser(request, env, "/rest/v1/rpc/video_media_access", {
    method: "POST",
    body: JSON.stringify({ p_video_id: videoId }),
  });
  if (!res.ok) throw new HttpError(403, "forbidden");
  return (await res.json()) as Access;
}

/** Updates the video row as the signed-in person; the database's rules decide what sticks. */
async function updateVideo(
  request: Request,
  env: Env,
  videoId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const res = await asUser(request, env, `/rest/v1/videos?id=eq.${videoId}&select=id`, {
    method: "PATCH",
    body: JSON.stringify(fields),
    headers: { prefer: "return=representation" },
  });
  const body = (await res.json().catch(() => null)) as unknown;
  if (res.ok && Array.isArray(body) && body.length === 1) return;
  const message = (body as { message?: string } | null)?.message;
  throw new HttpError(res.ok ? 403 : 400, message ? message.slice(0, 200) : "forbidden");
}

/** Removes an old preview from Stream. A miss only costs storage, so it never fails the request. */
async function dropPreview(env: Env, uid: string): Promise<void> {
  if (!env.STREAM_TOKEN) return;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/${uid}`,
    { method: "DELETE", headers: { authorization: `Bearer ${env.STREAM_TOKEN}` } },
  ).catch(() => null);
  if (!res?.ok && res?.status !== 404) console.error("stream delete", uid, res?.status);
}

async function dropFinal(env: Env, key: string): Promise<void> {
  await env.FINALS.delete(key).catch((error: unknown) => console.error("r2 delete", key, error));
}

function needUpload(access: Access): void {
  if (!access.canUpload) throw new HttpError(403, "forbidden");
}

function needSecret(value: string | undefined, name: string): string {
  if (!value) throw new HttpError(503, `missing_${name.toLowerCase()}`);
  return value;
}

/** Upload ids come back from the browser; the key must still belong to this video. */
function ownUpload(params: URLSearchParams, access: Access): { key: string; uploadId: string } {
  const key = params.get("key") ?? "";
  const uploadId = params.get("uploadId") ?? "";
  if (!key.startsWith(finalPrefix(access)) || key.includes("..") || !uploadId)
    throw new HttpError(400, "bad_upload");
  return { key, uploadId };
}

/** Calls the Cloudflare Stream API for this account and returns its result. */
async function stream<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const token = needSecret(env.STREAM_TOKEN, "STREAM_TOKEN");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(typeof init.body === "string" ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    },
  );
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: { message?: string }[];
  } | null;
  if (!res.ok || !body?.success || body.result === undefined) {
    console.error("stream", path, res.status, JSON.stringify(body?.errors ?? body));
    throw new HttpError(502, "stream_error");
  }
  return body.result;
}

/** The Gecko watermark profile in Stream, created from /watermark.png the first time it's needed. */
async function watermarkUid(env: Env, origin: string): Promise<string> {
  const existing = await stream<{ uid: string; name: string }[]>(env, "/stream/watermarks");
  const found = existing.find((w) => w.name === WATERMARK_NAME);
  if (found) return found.uid;
  const image = await env.ASSETS.fetch(new Request(`${origin}/watermark.png`));
  if (!image.ok) throw new HttpError(500, "missing_watermark");
  const form = new FormData();
  form.append(
    "file",
    new File([await image.arrayBuffer()], "watermark.png", { type: "image/png" }),
  );
  form.append("name", WATERMARK_NAME);
  form.append("opacity", "0.55");
  form.append("padding", "0");
  form.append("scale", "0.6");
  form.append("position", "center");
  const created = await stream<{ uid: string }>(env, "/stream/watermarks", {
    method: "POST",
    body: form,
  });
  return created.uid;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
