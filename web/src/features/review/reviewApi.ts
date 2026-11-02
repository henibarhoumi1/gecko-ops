import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { normaliseCuts, PREVIEW_LIMIT, PREVIEW_TYPES } from "./model";

export interface CutTarget {
  workspaceId: string;
  clientId: string;
}

export const PREVIEW_BUCKET = "previews";

const ids = (t: CutTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });
const teamKey = (t: CutTarget) => ["cuts", t.workspaceId, t.clientId];
const clientKey = (t: CutTarget) => ["my-cuts", t.workspaceId, t.clientId];

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

// ---------- client ----------

export function useMyCuts(target: CutTarget) {
  return useQuery({
    queryKey: clientKey(target),
    queryFn: async () => normaliseCuts(await rpc("get_my_cuts", ids(target))),
    refetchInterval: 30_000,
  });
}

export function useClientCutNote(target: CutTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      kind: "comment" | "approve" | "changes";
      version: number;
      at: number | null;
      body: string;
    }) =>
      rpc("client_cut_note", {
        ...ids(target),
        p_id: input.id,
        p_kind: input.kind,
        p_version: input.version,
        p_at: input.at,
        p_body: input.body,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientKey(target) }),
  });
}

// ---------- team ----------

export function useCuts(target: CutTarget) {
  return useQuery({
    queryKey: teamKey(target),
    queryFn: async () => normaliseCuts(await rpc("get_cuts", ids(target))),
    refetchInterval: 30_000,
  });
}

function extension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^(mp4|mov|webm|m4v)$/.test(fromName)) return fromName;
  return file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
}

/** Reads the length of a local video file, so notes can be placed on a timeline before it's watched. */
function duration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

export function useCutActions(target: CutTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: teamKey(target) });
  return {
    save: useMutation({
      mutationFn: async (input: { id: string | null; title: string }) =>
        (await rpc("save_cut", { ...ids(target), p_id: input.id, p_title: input.title })) as string,
      onSettled: done,
    }),
    upload: useMutation({
      mutationFn: async (input: {
        id: string;
        version: number;
        file: File;
        whatChanged: string;
      }) => {
        const { file } = input;
        if (file.size > PREVIEW_LIMIT) throw new Error("preview_too_big");
        if (file.type && !PREVIEW_TYPES.includes(file.type)) throw new Error("preview_type");
        const stamp = Math.random().toString(36).slice(2, 8);
        const path = `${target.workspaceId}/${target.clientId}/${input.id}/v${input.version + 1}-${stamp}.${extension(file)}`;
        const seconds = await duration(file);
        const { error } = await requireSupabase()
          .storage.from(PREVIEW_BUCKET)
          .upload(path, file, { contentType: file.type || "video/mp4" });
        if (error) throw error;
        await rpc("add_cut_version", {
          ...ids(target),
          p_id: input.id,
          p_path: path,
          p_size: file.size,
          p_seconds: seconds == null ? null : Math.round(seconds * 100) / 100,
          p_what_changed: input.whatChanged,
        });
      },
      onSettled: done,
    }),
    status: useMutation({
      mutationFn: (input: { id: string; status: "review" | "draft" }) =>
        rpc("set_cut_status", { ...ids(target), p_id: input.id, p_status: input.status }),
      onSettled: done,
    }),
    final: useMutation({
      mutationFn: (input: { id: string; link: string; note: string }) =>
        rpc("set_cut_final", {
          ...ids(target),
          p_id: input.id,
          p_link: input.link,
          p_note: input.note,
        }),
      onSettled: done,
    }),
    note: useMutation({
      mutationFn: (input: { id: string; at: number | null; body: string }) =>
        rpc("team_cut_note", {
          ...ids(target),
          p_id: input.id,
          p_at: input.at,
          p_body: input.body,
        }),
      onSettled: done,
    }),
    noteDone: useMutation({
      mutationFn: (input: { note: string; done: boolean }) =>
        rpc("set_cut_note_done", { ...ids(target), p_note: input.note, p_done: input.done }),
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (input: { id: string; paths: string[] }) => {
        // The files go first; if that fails the cut stays, so nothing is left without a record.
        if (input.paths.length) {
          const { error } = await requireSupabase()
            .storage.from(PREVIEW_BUCKET)
            .remove(input.paths);
          if (error) throw error;
        }
        await rpc("delete_cut", { ...ids(target), p_id: input.id });
      },
      onSettled: done,
    }),
  };
}

// ---------- both ----------

/** A one-hour link to a preview. The file itself stays private. */
export function usePreviewUrl(path: string | undefined) {
  return useQuery({
    queryKey: ["preview-url", path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .storage.from(PREVIEW_BUCKET)
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
