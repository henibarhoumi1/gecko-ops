import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";

export interface WhiteboardTarget {
  workspaceId: string;
  clientId: string;
}

export interface WhiteboardSummary {
  id: string;
  title: string;
  rev: number;
  updatedAt: string;
  updatedBy: string;
}

/** Where an image on the board lives in storage, by Excalidraw's file id. */
export type FileMap = Record<string, { path: string; mimeType: string }>;

export interface Whiteboard extends WhiteboardSummary {
  /** Excalidraw elements, stored as they come. */
  elements: unknown[];
  files: FileMap;
}

export const BUCKET = "boards";

const ids = (t: WhiteboardTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });
const listKey = (t: WhiteboardTarget) => ["whiteboards", t.workspaceId, t.clientId];

export function useWhiteboards(target: WhiteboardTarget) {
  return useQuery({
    queryKey: listKey(target),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("list_whiteboards", ids(target));
      if (error) throw error;
      return (data ?? []) as WhiteboardSummary[];
    },
  });
}

export async function getWhiteboard(target: WhiteboardTarget, id: string): Promise<Whiteboard> {
  const { data, error } = await requireSupabase().rpc("get_whiteboard", {
    ...ids(target),
    p_id: id,
  });
  if (error) throw error;
  return data as Whiteboard;
}

export async function whiteboardRev(target: WhiteboardTarget, id: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc("whiteboard_rev", {
    ...ids(target),
    p_id: id,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function saveWhiteboard(
  target: WhiteboardTarget,
  id: string,
  elements: readonly unknown[],
  files: FileMap,
): Promise<number> {
  const { data, error } = await requireSupabase().rpc("save_whiteboard", {
    ...ids(target),
    p_id: id,
    p_elements: elements,
    p_files: files,
  });
  if (error) throw error;
  return Number(data);
}

export function useWhiteboardActions(target: WhiteboardTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: listKey(target) });
  const db = () => requireSupabase();
  return {
    create: useMutation({
      mutationFn: async (title: string) => {
        const { data, error } = await db().rpc("create_whiteboard", {
          ...ids(target),
          p_title: title,
        });
        if (error) throw error;
        return data as string;
      },
      onSettled: done,
    }),
    rename: useMutation({
      mutationFn: async (input: { id: string; title: string }) => {
        const { error } = await db().rpc("rename_whiteboard", {
          ...ids(target),
          p_id: input.id,
          p_title: input.title,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().rpc("delete_whiteboard", { ...ids(target), p_id: id });
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}

function extension(mimeType: string): string {
  return mimeType.split("/")[1]?.replace("jpeg", "jpg").replace("svg+xml", "svg") ?? "bin";
}

/** Uploads one image the board holds as a data URL; Excalidraw's file id names it, so a retry is harmless. */
export async function uploadBoardFile(
  target: WhiteboardTarget,
  fileId: string,
  dataURL: string,
  mimeType: string,
): Promise<string> {
  const blob = await (await fetch(dataURL)).blob();
  if (blob.size > 5_000_000) throw new Error("image_too_big");
  const safe = fileId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) || "file";
  const path = `${target.workspaceId}/${target.clientId}/wb-${safe}.${extension(mimeType)}`;
  const { error } = await requireSupabase()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: true });
  if (error) throw error;
  return path;
}

/** Reads a stored image back as a data URL, which is how Excalidraw wants its files. */
export async function downloadBoardFile(path: string): Promise<string> {
  const { data, error } = await requireSupabase().storage.from(BUCKET).download(path);
  if (error) throw error;
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("bad_upload"));
    reader.readAsDataURL(data);
  });
}
