// Studio media (supabase/migrations/202612170001): pictures the team adds outside a client's board, such as talent and
// location photos or images in pages. Shrunk in the browser, stored under the workspace's folder with a random name,
// shown by a public link so the same picture works in the app, the portal and a shared document.
import { requireSupabase } from "./supabase";

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIDE = 2000;

async function shrink(file: Blob): Promise<{ blob: Blob; ext: string; type: string }> {
  const type = file.type || "image/png";
  if (type === "image/gif") return { blob: file, ext: "gif", type };
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1_500_000)
      return { blob: file, ext: type.split("/")[1]!.replace("jpeg", "jpg"), type };
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    // PNG keeps transparency (logos, cut-outs); photos become JPEG.
    const out = type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("bad_upload"))), out, 0.86),
    );
    return { blob, ext: out === "image/png" ? "png" : "jpg", type: out };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Uploads one image and returns its public link. */
export async function uploadMedia(workspaceId: string, file: Blob): Promise<string> {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error("image_type");
  const { blob, ext, type } = await shrink(file);
  if (blob.size > 5_000_000) throw new Error("image_too_big");
  const id = crypto.randomUUID().replace(/-/g, "");
  const path = `${workspaceId}/${id}.${ext}`;
  const db = requireSupabase();
  const { error } = await db.storage
    .from("media")
    .upload(path, blob, { contentType: type, upsert: false });
  if (error) throw error;
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** The first image in a paste or a drop: a file, or a link to one. */
export function imageFrom(data: DataTransfer | null): { file?: File; url?: string } | null {
  if (!data) return null;
  const file = Array.from(data.files ?? []).find((f) => MEDIA_TYPES.includes(f.type));
  if (file) return { file };
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && MEDIA_TYPES.includes(item.type)) {
      const f = item.getAsFile();
      if (f) return { file: f };
    }
  }
  const text = (data.getData("text/uri-list") || data.getData("text/plain") || "").trim();
  if (/^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i.test(text)) return { url: text };
  return null;
}
