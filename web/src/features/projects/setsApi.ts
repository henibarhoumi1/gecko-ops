import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { useProjectChoice } from "./projectChoice";
import { useProjects } from "./projectsApi";
import { toSet, type ProjectSet, type SetRow } from "./setsModel";

export type { ProjectSet } from "./setsModel";
export { setsForProject } from "./setsModel";

/** The campaign new sets go into: the one chosen, or else the newest active one. */
export function useCurrentProject(clientId: string): { id: string | null; name: string } {
  const { id: workspaceId } = useWorkspace();
  const [chosen] = useProjectChoice(workspaceId, clientId);
  const projects = useProjects({ workspaceId, clientId });
  const list = projects.data?.projects ?? [];
  const pick =
    list.find((p) => p.id === chosen) ??
    [...list]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ??
    null;
  return { id: pick?.id ?? chosen ?? null, name: pick?.name ?? "" };
}

const key = (workspaceId: string, clientId: string) => ["project-sets", workspaceId, clientId];

/** Every set of a client, across its campaigns. */
export function useProjectSets(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: key(workspaceId, clientId),
    queryFn: async (): Promise<ProjectSet[]> => {
      const { data, error } = await requireSupabase()
        .from("project_sets")
        .select("id,project_id,name,notes,position")
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .order("position");
      if (error) throw error;
      return (data as SetRow[]).map(toSet);
    },
  });
}

export function useSetActions(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: key(workspaceId, clientId) });
  return {
    add: useMutation({
      mutationFn: async (input: {
        name: string;
        notes?: string;
        projectId: string | null;
        position: number;
      }) => {
        const { data, error } = await requireSupabase()
          .from("project_sets")
          .insert({
            workspace_id: workspaceId,
            client_id: clientId,
            project_id: input.projectId,
            name: input.name.trim().slice(0, 120),
            notes: (input.notes ?? "").trim().slice(0, 1000),
            position: input.position,
          })
          .select("id")
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      },
      onSettled: done,
    }),
    update: useMutation({
      mutationFn: async (input: {
        id: string;
        name?: string;
        notes?: string;
        position?: number;
      }) => {
        const fields: Record<string, unknown> = {};
        if (input.name != null) fields.name = input.name.trim().slice(0, 120);
        if (input.notes != null) fields.notes = input.notes.trim().slice(0, 1000);
        if (input.position != null) fields.position = input.position;
        const { error } = await requireSupabase()
          .from("project_sets")
          .update(fields)
          .eq("id", input.id);
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await requireSupabase().from("project_sets").delete().eq("id", id);
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}
