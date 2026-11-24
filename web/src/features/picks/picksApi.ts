// What the client picked for an idea or a script: talent, a set or a place, props and a note.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { previewRole } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";

export interface Picks {
  talent: string[];
  set: string | null;
  location: string | null;
  props: string[];
  note: string;
  by?: string;
  at?: string;
}

export interface SetRow {
  id: string;
  name: string;
  notes: string;
  projectId: string | null;
}

export const NO_PICKS: Picks = { talent: [], set: null, location: null, props: [], note: "" };

export function readPicks(raw: unknown): Picks {
  if (!raw || typeof raw !== "object") return NO_PICKS;
  const r = raw as Record<string, unknown>;
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const one = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    talent: ids(r.talent),
    set: one(r.set),
    location: one(r.location),
    props: ids(r.props),
    note: typeof r.note === "string" ? r.note : "",
    ...(typeof r.by === "string" ? { by: r.by } : {}),
    ...(typeof r.at === "string" ? { at: r.at } : {}),
  };
}

export const hasPicks = (p: Picks) =>
  p.talent.length > 0 || p.props.length > 0 || Boolean(p.set || p.location || p.note.trim());

interface Target {
  workspaceId: string;
  clientId: string;
}

const myKey = (t: Target) => ["my-picks", t.workspaceId, t.clientId];

/** The client's side: their picks and the set list of their campaigns. Empty while the team previews. */
export interface PicksPage {
  concepts: Record<string, Picks>;
  scripts: Record<string, Picks>;
  sets: SetRow[];
}

export function useMyPicks(t: Target) {
  return useQuery({
    queryKey: myKey(t),
    queryFn: async (): Promise<PicksPage> => {
      if (previewRole()) return { concepts: {}, scripts: {}, sets: [] };
      const { data, error } = await requireSupabase().rpc("get_my_picks", {
        p_workspace_id: t.workspaceId,
        p_client_id: t.clientId,
      });
      if (error) throw error;
      const d = (data ?? {}) as {
        concepts?: Record<string, unknown>;
        scripts?: Record<string, unknown>;
        sets?: SetRow[];
      };
      const map = (m?: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, readPicks(v)])) as Record<
          string,
          Picks
        >;
      return { concepts: map(d.concepts), scripts: map(d.scripts), sets: d.sets ?? [] };
    },
    staleTime: 20_000,
  });
}

export function useSavePicks(t: Target) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "concept" | "script"; id: string; picks: Picks }) => {
      const { error } = await requireSupabase().rpc("client_set_picks", {
        p_workspace_id: t.workspaceId,
        p_client_id: t.clientId,
        p_kind: input.kind,
        p_id: input.id,
        p_talent: input.picks.talent,
        p_set: input.picks.set,
        p_location: input.picks.location,
        p_props: input.picks.props,
        p_note: input.picks.note.slice(0, 1000),
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: myKey(t) }),
  });
}

/** The team's side: what each client picked, by idea and by script. */
export function useTeamPicks(workspaceId: string, clientId: string | null) {
  return useQuery({
    queryKey: ["team-picks", workspaceId, clientId],
    enabled: Boolean(clientId),
    queryFn: async (): Promise<PicksPage> => {
      const db = requireSupabase();
      const [c, s, sets] = await Promise.all([
        db
          .from("concepts")
          .select("id,client_picks")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId!),
        db
          .from("scripts")
          .select("id,client_picks")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId!),
        db
          .from("project_sets")
          .select("id,name,notes,project_id")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId!),
      ]);
      // A database without the column yet: no picks rather than an error.
      const rows = (r: { data: unknown; error: unknown }) =>
        r.error ? [] : ((r.data ?? []) as { id: string; client_picks: unknown }[]);
      const map = (list: { id: string; client_picks: unknown }[]) => {
        const out: Record<string, Picks> = {};
        for (const x of list) {
          const p = readPicks(x.client_picks);
          if (hasPicks(p)) out[x.id] = p;
        }
        return out;
      };
      return {
        concepts: map(rows(c)),
        scripts: map(rows(s)),
        sets: (
          (sets.data ?? []) as {
            id: string;
            name: string;
            notes: string;
            project_id: string | null;
          }[]
        ).map((x) => ({
          id: x.id,
          name: x.name,
          notes: x.notes,
          projectId: x.project_id,
        })),
      };
    },
    refetchInterval: 30_000,
  });
}
