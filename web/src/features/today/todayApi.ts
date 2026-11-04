import { useQuery } from "@tanstack/react-query";
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
