/** Turns an uploaded logo into a small image the database can hold: empty margins trimmed, at most 900 px wide
 * and 360 px tall, as PNG (keeps transparency) or WebP when the PNG is too heavy. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_CHARS = 280_000;

/** Bounds of everything that isn't transparent or near-white. Null when the image is blank. */
export function contentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  let top = height,
    left = width,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const ink =
        (data[i + 3] ?? 0) > 16 &&
        ((data[i] ?? 255) < 236 || (data[i + 1] ?? 255) < 236 || (data[i + 2] ?? 255) < 236);
      if (!ink) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export async function prepareLogo(file: File): Promise<string> {
  if (!LOGO_TYPES.includes(file.type)) throw new Error("logo_type");
  const bitmap = await createImageBitmap(file);
  const src = document.createElement("canvas");
  src.width = bitmap.width;
  src.height = bitmap.height;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("logo_type");
  sctx.drawImage(bitmap, 0, 0);
  const box = contentBounds(
    sctx.getImageData(0, 0, src.width, src.height).data,
    src.width,
    src.height,
  ) ?? { x: 0, y: 0, w: src.width, h: src.height };
  // A little air around the mark so it never touches the edge.
  const pad = Math.round(Math.max(box.w, box.h) * 0.02);
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(src.width - x, box.w + pad * 2);
  const h = Math.min(src.height - y, box.h + pad * 2);

  for (const limit of [1, 0.75, 0.5, 0.35]) {
    const scale = Math.min(1, (900 * limit) / w, (360 * limit) / h);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    const ctx = out.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
    const png = out.toDataURL("image/png");
    if (png.length <= MAX_CHARS) return png;
    const webp = out.toDataURL("image/webp", 0.9);
    if (webp.startsWith("data:image/webp") && webp.length <= MAX_CHARS) return webp;
  }
  throw new Error("logo_too_big");
}
