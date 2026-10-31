import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoteRow } from "@/features/concepts/model";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { deleteVideo } from "./media";
import { videosFromRows, type Video, type VideoRow } from "./model";

const VIDEO_COLUMNS =
  "id,title,position,status,version,preview_uid,final_name,final_size,approved_version,approved_at,approved_by,author_name,created_at,updated_at,concept_id";

/** One client's videos with their conversation, for the team. Refreshes every half minute. */
export function useVideos(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["videos", workspaceId, clientId],
    queryFn: async (): Promise<Video[]> => {
      const db = requireSupabase();
      const [v, n, c] = await Promise.all([
        db
          .from("videos")
          .select(VIDEO_COLUMNS)
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId),
        db
          .from("video_notes")
          .select("id,video_id,kind,from_client,author_name,body,version,created_at")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId),
        db
          .from("concepts")
          .select("id,title")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId),
      ]);
      if (v.error) throw v.error;
      if (n.error) throw n.error;
      if (c.error) throw c.error;
      const titles = new Map(
        (c.data as { id: string; title: string }[]).map((r) => [r.id, r.title]),
      );
      return videosFromRows(
        v.data as VideoRow[],
        n.data as (Omit<NoteRow, "concept_id"> & { video_id: string })[],
        titles,
      );
    },
    refetchInterval: 30_000,
  });
}

/** Refreshes the list, e.g. after an upload the worker recorded. */
export function useRefreshVideos(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["videos", workspaceId, clientId] });
}

export interface VideoInput {
  id: string | null;
  title: string;
  conceptId: string | null;
  position?: number;
}

export function useSaveVideo(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const refresh = useRefreshVideos(clientId);
  return useMutation({
    mutationFn: async (input: VideoInput) => {
      const db = requireSupabase();
      const fields = { title: input.title, concept_id: input.conceptId };
      const { error } = input.id
        ? await db.from("videos").update(fields).eq("id", input.id)
        : await db.from("videos").insert({
            ...fields,
            workspace_id: workspaceId,
            client_id: clientId,
            position: input.position ?? 0,
          });
      if (error) throw error;
    },
    onSettled: refresh,
  });
}

export function useSetVideoStatus(clientId: string) {
  const refresh = useRefreshVideos(clientId);
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "review" }) => {
      const { error } = await requireSupabase().from("videos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSettled: refresh,
  });
}

/** Deletes through the worker, so the files at Cloudflare go too. */
export function useDeleteVideo(clientId: string) {
  const refresh = useRefreshVideos(clientId);
  return useMutation({ mutationFn: deleteVideo, onSettled: refresh });
}

export function useAddVideoNote(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const refresh = useRefreshVideos(clientId);
  return useMutation({
    mutationFn: async ({ videoId, body }: { videoId: string; body: string }) => {
      const { error } = await requireSupabase().from("video_notes").insert({
        workspace_id: workspaceId,
        client_id: clientId,
        video_id: videoId,
        body,
      });
      if (error) throw error;
    },
    onSettled: refresh,
  });
}
