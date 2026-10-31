// Pure helpers for the worker: routes, file keys and signed download links. No Cloudflare APIs here,
// so they run in the app's unit tests.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const VIDEO_ROUTE = new RegExp(
  `^/api/videos/(${UUID})/(watch|preview|preview/attach|download|delete|final/start|final/part|final/complete|final/abort)$`,
);

export type VideoAction =
  | "watch"
  | "preview"
  | "preview/attach"
  | "download"
  | "delete"
  | "final/start"
  | "final/part"
  | "final/complete"
  | "final/abort";

export function matchVideoRoute(path: string): { videoId: string; action: VideoAction } | null {
  const m = VIDEO_ROUTE.exec(path);
  return m ? { videoId: m[1]!, action: m[2] as VideoAction } : null;
}

/** Final files live under <workspace>/<client>/<video>/, which the database also checks. */
export function finalPrefix(a: { workspaceId: string; clientId: string; videoId: string }): string {
  return `${a.workspaceId}/${a.clientId}/${a.videoId}/`;
}

/** A file name that is safe inside a storage key: letters, digits, dot, dash, underscore. */
export function safeName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
    .slice(-120);
  return cleaned || "final";
}

/** Content-Disposition that keeps the original name, accents included. */
export function attachmentHeader(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface LinkClaims {
  /** Storage key of the file. */
  k: string;
  /** Name the browser saves it as. */
  n: string;
  /** Expiry, unix seconds. */
  e: number;
}

/** A download link token: the claims plus an HMAC, so the worker can trust it without a lookup. */
export async function signLink(claims: LinkClaims, secret: string): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyLink(
  token: string,
  secret: string,
  now = Date.now() / 1000,
): Promise<LinkClaims | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64url(sig),
      new TextEncoder().encode(payload),
    );
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as LinkClaims;
    if (
      typeof claims.k !== "string" ||
      typeof claims.n !== "string" ||
      typeof claims.e !== "number"
    )
      return null;
    return claims.e > now ? claims : null;
  } catch {
    return null;
  }
}

/** The customer-…cloudflarestream.com host, read from the preview link Stream returns for a video. */
export function streamHost(previewUrl: string | undefined): string | null {
  if (!previewUrl) return null;
  try {
    const host = new URL(previewUrl).host;
    return /^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host) ? host : null;
  } catch {
    return null;
  }
}
