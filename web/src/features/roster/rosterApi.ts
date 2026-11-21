import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import type { RosterEntry, RosterInput, RosterKind } from "./model";

const COLUMNS =
  "id,workspace_id,kind,name,role,city,phone,instagram,link,photo_url,rate,rate_note,tags,notes,rating,hidden,author_name,created_at,updated_at";

const key = (workspaceId: string, kind: RosterKind) => ["roster", workspaceId, kind];

export function useRoster(kind: RosterKind) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: key(workspaceId, kind),
    queryFn: async (): Promise<RosterEntry[]> => {
      const { data, error } = await requireSupabase()
        .from("studio_roster")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("kind", kind);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        rate: r.rate == null ? null : Number(r.rate),
      })) as RosterEntry[];
    },
  });
}

/** Add, change, hide or delete an entry. Deletes go to the trash (and the Undo bar). */
export function useRosterActions(kind: RosterKind) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: key(workspaceId, kind) });
  const db = () => requireSupabase().from("studio_roster");
  return {
    save: useMutation({
      mutationFn: async ({
        id,
        input,
        author,
      }: {
        id?: string;
        input: RosterInput;
        author: string;
      }) => {
        const row = { ...input, workspace_id: workspaceId };
        const { error } = id
          ? await db().update(row).eq("workspace_id", workspaceId).eq("id", id)
          : await db().insert({ ...row, author_name: author.slice(0, 120) });
        if (error) throw error;
      },
      onSettled: done,
    }),
    hide: useMutation({
      mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
        const { error } = await db()
          .update({ hidden })
          .eq("workspace_id", workspaceId)
          .eq("id", id);
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().delete().eq("workspace_id", workspaceId).eq("id", id);
        if (error) throw error;
      },
      onSettled: done,
    }),
    /** Copies the entry into a client's production options, proposed, for the client to approve. */
    propose: useMutation({
      mutationFn: async ({ entry, clientId }: { entry: RosterEntry; clientId: string }) => {
        const details = [entry.role, entry.city, entry.notes].filter(Boolean).join(" · ");
        const { error } = await requireSupabase().rpc("save_production_option", {
          p_workspace_id: workspaceId,
          p_client_id: clientId,
          p_option: {
            kind: entry.kind,
            name: entry.name,
            role: entry.role,
            details: details.slice(0, 4000),
            link: entry.link || entry.photo_url || "",
            cost: entry.rate ?? 0,
            costNote: entry.rate_note,
            privateNotes: entry.phone ? `Phone: ${entry.phone}` : "",
          },
        });
        if (error) throw error;
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["production"] }),
    }),
  };
}
