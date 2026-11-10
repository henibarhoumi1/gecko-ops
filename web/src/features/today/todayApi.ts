import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import type { Today } from "./model";

/** Everything waiting on the team and on clients, and the dates coming up. Founder and producers only. */
export function useToday() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["today", workspaceId],
    queryFn: async (): Promise<Today> => {
      const { data, error } = await requireSupabase().rpc("get_today", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      const r = (data ?? {}) as Partial<Today>;
      return {
        today: r.today ?? new Date().toISOString().slice(0, 10),
        us: r.us ?? [],
        client: r.client ?? [],
        dates: r.dates ?? [],
        leads: r.leads ?? [],
        problems: r.problems ?? 0,
      };
    },
    refetchInterval: 60_000,
  });
}

/** Quick capture: an idea goes to a client's ideas as a team draft; nothing reaches the client until sent. */
export function useCaptureIdea() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; title: string; body: string }) => {
      const { error } = await requireSupabase().from("concepts").insert({
        workspace_id: workspaceId,
        client_id: input.clientId,
        title: input.title,
        body: input.body,
        format: "reel",
        refs: "",
        hook: "",
        status: "draft",
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["concepts", workspaceId] }),
  });
}
