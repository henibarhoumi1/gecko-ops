import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { normaliseResults, type Checkpoint, type Metrics, type Platform } from "./model";
import { normaliseLibrary, type ItemKind } from "./library";

export interface ResultsTarget {
  workspaceId: string;
  clientId: string;
}

export const RESULTS_BUCKET = "results";
export const LIBRARY_BUCKET = "library";

const ids = (t: ResultsTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });
const resultsKey = (t: ResultsTarget) => ["results", t.workspaceId, t.clientId];
const libraryKey = (t: ResultsTarget) => ["library", t.workspaceId, t.clientId];

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

/** The same call for the team and the client: the database decides what each one sees. */
export function useResults(target: ResultsTarget, enabled = true) {
  return useQuery({
    queryKey: resultsKey(target),
    enabled,
    queryFn: async () => normaliseResults(await rpc("get_results", ids(target))),
    refetchInterval: 60_000,
  });
}

export interface PostInput {
  id: string | null;
  cutId: string | null;
  title: string;
  platform: Platform;
  paid: boolean;
  link: string;
  liveOn: string;
  press: string;
}

export function useResultActions(target: ResultsTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: resultsKey(target) });
  return {
    savePost: useMutation({
      mutationFn: async (input: PostInput) =>
        (await rpc("save_post", {
          ...ids(target),
          p_id: input.id,
          p_cut_id: input.cutId,
          p_title: input.title,
          p_platform: input.platform,
          p_paid: input.paid,
          p_link: input.link,
          p_live_on: input.liveOn,
          p_press: input.press,
        })) as string,
      onSettled: done,
    }),
    removePost: useMutation({
      mutationFn: async (input: { id: string; shots: string[] }) => {
        // Screenshots first: the post is what gives access to them.
        if (input.shots.length) {
          const { error } = await requireSupabase()
            .storage.from(RESULTS_BUCKET)
            .remove(input.shots);
          if (error) throw error;
        }
        await rpc("delete_post", { ...ids(target), p_id: input.id });
      },
      onSettled: done,
    }),
    saveNumbers: useMutation({
      mutationFn: (input: {
        postId: string;
        day: Checkpoint;
        metrics: Metrics;
        shots: string[];
        note: string;
      }) =>
        rpc("save_post_numbers", {
          ...ids(target),
          p_post_id: input.postId,
          p_day: input.day,
          p_metrics: input.metrics,
          p_shots: input.shots,
          p_note: input.note,
        }),
      onSettled: done,
    }),
    saveRead: useMutation({
      mutationFn: async (input: {
        month: string;
        best: string | null;
        bestWhy: string;
        worst: string | null;
        worstWhy: string;
        learned: string[];
        next: string[];
      }) =>
        (await rpc("save_monthly_read", {
          ...ids(target),
          p_month: input.month,
          p_best: input.best,
          p_best_why: input.bestWhy,
          p_worst: input.worst,
          p_worst_why: input.worstWhy,
          p_learned: input.learned,
          p_next: input.next,
        })) as string,
      onSettled: done,
    }),
    publishRead: useMutation({
      mutationFn: async (id: string) =>
        (await rpc("publish_monthly_read", { ...ids(target), p_id: id })) as number,
      onSettled: () => {
        void done();
        // The tests just became ideas.
        void queryClient.invalidateQueries({ queryKey: ["concepts"] });
      },
    }),
    setPostScript: useMutation({
      mutationFn: (input: { postId: string; scriptId: string | null; hook: number | null }) =>
        rpc("set_post_script", {
          ...ids(target),
          p_post_id: input.postId,
          p_script_id: input.scriptId,
          p_hook: input.hook,
        }),
      onSettled: done,
    }),
    removeRead: useMutation({
      mutationFn: (id: string) => rpc("delete_monthly_read", { ...ids(target), p_id: id }),
      onSettled: done,
    }),
  };
}

// ---------- library ----------

export function useLibrary(target: ResultsTarget) {
  return useQuery({
    queryKey: libraryKey(target),
    queryFn: async () => normaliseLibrary(await rpc("get_library", ids(target))),
  });
}

export interface ItemInput {
  id: string | null;
  kind: ItemKind;
  title: string;
  shoot: string;
  shotOn: string | null;
  tags: string[];
  seconds: number | null;
  thumb: string | null;
  link: string;
  talentId: string | null;
}

export function useLibraryActions(target: ResultsTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: libraryKey(target) });
  return {
    save: useMutation({
      mutationFn: async (input: ItemInput) =>
        (await rpc("save_library_item", {
          ...ids(target),
          p_id: input.id,
          p_kind: input.kind,
          p_title: input.title,
          p_shoot: input.shoot,
          p_shot_on: input.shotOn,
          p_tags: input.tags,
          p_seconds: input.seconds,
          p_thumb: input.thumb,
          p_link: input.link,
          p_talent_id: input.talentId,
        })) as string,
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (input: { id: string; thumb: string | null }) => {
        await rpc("delete_library_item", { ...ids(target), p_id: input.id });
        // The thumbnail is the team's file; if removing it fails, it only takes a little space.
        if (input.thumb) await requireSupabase().storage.from(LIBRARY_BUCKET).remove([input.thumb]);
      },
      onSettled: done,
    }),
    request: useMutation({
      mutationFn: (input: { ids: string[]; body: string }) =>
        rpc("library_request", { ...ids(target), p_ids: input.ids, p_body: input.body }),
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: ["portal-shared", target.workspaceId, target.clientId],
        }),
    }),
  };
}
