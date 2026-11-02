import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import type { Template } from "@/lib/wording";

// The portal's template and cover, kept apart from the overview row like the logo, so saving one never
// overwrites the other.

/** Each client's template, by client id. A database without templates yet reads as all Performance. */
export function useTemplates() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["client-templates", workspaceId],
    queryFn: async (): Promise<Record<string, Template>> => {
      const { data, error } = await requireSupabase()
        .from("client_portals")
        .select("client_id,template")
        .eq("workspace_id", workspaceId);
      if (error) {
        if (/template/.test(error.message)) return {};
        throw error;
      }
      return Object.fromEntries(
        (data as { client_id: string; template: Template | null }[]).map((r) => [
          r.client_id,
          r.template === "cinematic" ? "cinematic" : "performance",
        ]),
      );
    },
  });
}

/** One client's cover still (only loaded on that client's page: covers are a few hundred KB). */
export function useCover(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["client-cover", workspaceId, clientId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await requireSupabase()
        .from("client_portals")
        .select("cover")
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) {
        if (/cover/.test(error.message)) return null;
        throw error;
      }
      return (data as { cover: string | null } | null)?.cover ?? null;
    },
  });
}

export function useSaveLook(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (look: { template?: Template; cover?: string | null }) => {
      const { error } = await requireSupabase()
        .from("client_portals")
        .upsert(
          { workspace_id: workspaceId, client_id: clientId, ...look },
          { onConflict: "workspace_id,client_id" },
        );
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-templates", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["client-cover", workspaceId, clientId] });
    },
  });
}
