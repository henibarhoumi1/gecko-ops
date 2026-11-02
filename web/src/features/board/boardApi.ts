import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { newId, type BoardPage, type Card } from "./model";

/** Whose board: one client of one workspace. The same calls work for the team and for the client. */
export interface BoardTarget {
  workspaceId: string;
  clientId: string;
}

const args = (t: BoardTarget, boardId: string | null) => ({
  p_workspace_id: t.workspaceId,
  p_client_id: t.clientId,
  p_board_id: boardId,
});

export const boardKey = (t: BoardTarget, boardId: string | null) => [
  "board",
  t.workspaceId,
  t.clientId,
  boardId ?? "top",
];

export function useBoard(t: BoardTarget, boardId: string | null) {
  return useQuery({
    queryKey: boardKey(t, boardId),
    queryFn: async (): Promise<BoardPage> => {
      const { data, error } = await requireSupabase().rpc("get_board", args(t, boardId));
      if (error) throw error;
      return data as BoardPage;
    },
  });
}

export async function boardRev(t: BoardTarget, boardId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc("board_rev", args(t, boardId));
  if (error) throw error;
  return Number(data);
}

/** Only what the database keeps; the author and the counts are its own. */
function wire(card: Card) {
  return {
    id: card.id,
    kind: card.kind,
    x: Math.round(card.x),
    y: Math.round(card.y),
    w: Math.round(card.w),
    h: card.h === null ? null : Math.round(card.h),
    z: card.z,
    columnId: card.columnId,
    position: card.position,
    data: card.data,
  };
}

export async function saveCards(t: BoardTarget, boardId: string, cards: Card[]): Promise<number> {
  const { data, error } = await requireSupabase().rpc("save_board_items", {
    ...args(t, boardId),
    p_items: cards.map(wire),
  });
  if (error) throw error;
  return Number(data);
}

export async function deleteCards(t: BoardTarget, boardId: string, ids: string[]): Promise<number> {
  const { data, error } = await requireSupabase().rpc("delete_board_items", {
    ...args(t, boardId),
    p_ids: ids,
  });
  if (error) throw error;
  return Number(data);
}

export async function renameBoard(t: BoardTarget, boardId: string, title: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc("rename_board", {
    ...args(t, boardId),
    p_title: title,
  });
  if (error) throw error;
  return Number(data);
}

// ---------- images ----------

const MAX_BYTES = 4_500_000;
const MAX_SIDE = 2400;

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Big photos are scaled down to 2400 px and saved as JPEG, so an upload stays under the 5 MB limit. */
async function prepare(
  file: File,
): Promise<{ blob: Blob; type: string; ext: string; ratio: number }> {
  const img = await loadImage(file);
  const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const big = Math.max(img.naturalWidth, img.naturalHeight) > MAX_SIDE;
  if ((file.size <= MAX_BYTES && !big) || file.type === "image/gif")
    return { blob: file, type: file.type, ext, ratio };
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("bad_upload"))), "image/jpeg", 0.86),
  );
  return { blob, type: "image/jpeg", ext: "jpg", ratio };
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Uploads one image to the client's folder and returns where it went, with its shape. */
export async function uploadImage(
  t: BoardTarget,
  file: File,
  bucket = "boards",
): Promise<{ path: string; ratio: number }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("image_type");
  const { blob, type, ext, ratio } = await prepare(file);
  if (blob.size > 5_000_000) throw new Error("image_too_big");
  const path = `${t.workspaceId}/${t.clientId}/${newId()}.${ext}`;
  const { error } = await requireSupabase()
    .storage.from(bucket)
    .upload(path, blob, { contentType: type, upsert: false });
  if (error) throw error;
  return { path, ratio };
}

/** A short-lived link to show an image; refreshed before it runs out. */
export function useImageUrl(path: string | undefined, bucket = "boards") {
  return useQuery({
    queryKey: ["board-image", bucket, path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .storage.from(bucket)
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
