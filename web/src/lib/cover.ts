/** Turns a still from the brand's shoot into a cover the database can hold: at most 1600 px wide, as JPEG,
 * shrunk until it fits under the 700 KB the overview row allows. */
export const COVER_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_CHARS = 680_000;

export async function prepareCover(file: File): Promise<string> {
  if (!COVER_TYPES.includes(file.type)) throw new Error("cover_type");
  const bitmap = await createImageBitmap(file);
  for (const [width, quality] of [
    [1600, 0.82],
    [1400, 0.78],
    [1200, 0.74],
    [1000, 0.7],
  ] as const) {
    const scale = Math.min(1, width / bitmap.width);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(bitmap.width * scale));
    out.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = out.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, out.width, out.height);
    const jpeg = out.toDataURL("image/jpeg", quality);
    if (jpeg.length <= MAX_CHARS) return jpeg;
  }
  throw new Error("cover_too_big");
}
