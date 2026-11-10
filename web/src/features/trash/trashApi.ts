import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";

/** One delete in the trash: the item the person deleted, with what went with it. */
export interface TrashEntry {
  batch: string;
  kind: string;
  label: string;
  clientId: string | null;
  brand: string | null;
  deletedBy: string;
  deletedAt: string;
  withIt: number;
  restoredAt: string | null;
  restoredBy: string;
}

/** Fired after every successful change in the app; the Undo bar checks whether it was a delete. */
export const MUTATED = "gecko:mutated";

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

const KINDS: Record<string, string> = {
  concepts: "Idea",
  concept_notes: "Idea note",
  scripts: "Script",
  script_notes: "Script note",
  script_versions: "Script version",
  shoot_day_reels: "Reel on a shoot day",
  shared_items: "Note or link",
  board_items: "Inspiration",
  invoices: "Invoice",
  production_options: "Talent, location or prop",
  production_notes: "Production note",
  monthly_reads: "Monthly read",
  library_items: "Library item",
  posts: "Post",
  post_numbers: "Numbers",
  cuts: "Video",
  cut_notes: "Video note",
  cut_versions: "Video version",
  whiteboards: "Whiteboard",
  leads: "Lead",
};

export const kindName = (kind: string) => KINDS[kind] ?? kind;

export function normaliseTrash(data: unknown): TrashEntry[] {
  return (Array.isArray(data) ? data : []).map((v) => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const s = (x: unknown) => (typeof x === "string" ? x : "");
    return {
      batch: String(o.batch ?? ""),
      kind: s(o.kind),
      label: s(o.label),
      clientId: typeof o.clientId === "string" ? o.clientId : null,
      brand: typeof o.brand === "string" ? o.brand : null,
      deletedBy: s(o.deletedBy),
      deletedAt: s(o.deletedAt),
      withIt: typeof o.withIt === "number" ? o.withIt : 0,
      restoredAt: typeof o.restoredAt === "string" ? o.restoredAt : null,
      restoredBy: s(o.restoredBy),
    };
  });
}

export function useTrash(workspaceId: string) {
  return useQuery({
    queryKey: ["trash", workspaceId],
    queryFn: async () => normaliseTrash(await rpc("get_trash", { p_workspace_id: workspaceId })),
  });
}

/** Puts a delete back; every screen reads again. */
export function useRestore(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batch: string) =>
      rpc("restore_trash", { p_workspace_id: workspaceId, p_batch: batch }),
    onSettled: () => queryClient.invalidateQueries(),
  });
}

export async function lastDelete(
  workspaceId: string,
): Promise<{ batch: string; kind: string; label: string } | null> {
  const data = (await rpc("get_my_last_delete", { p_workspace_id: workspaceId })) as Record<
    string,
    unknown
  > | null;
  if (!data || data.batch == null) return null;
  return {
    batch: String(data.batch),
    kind: typeof data.kind === "string" ? data.kind : "",
    label: typeof data.label === "string" ? data.label : "",
  };
}

/** The founder empties the trash now: everything in it is destroyed for good. */
export function useEmptyTrash(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rpc("empty_trash", { p_workspace_id: workspaceId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] }),
  });
}
