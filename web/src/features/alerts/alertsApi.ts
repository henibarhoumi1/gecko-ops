import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";

export interface AlertError {
  id: number;
  at: string;
  client_id: string | null;
  brand: string | null;
  from_client: boolean;
  area: "crash" | "request" | "unexpected";
  message: string;
  path: string;
  seen: boolean;
}

export interface ClientAction {
  at: string;
  client_id: string;
  brand: string;
  part: "concept" | "script" | "cut" | "production";
  kind: string;
  title: string;
  author: string;
  body: string;
}

export interface Alerts {
  errors: AlertError[];
  activity: ClientAction[];
}

/** Problems people hit and what clients did, over the last `days` days. Founder and producers only. */
export function useAlerts(days: number) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["alerts", workspaceId, days],
    queryFn: async (): Promise<Alerts> => {
      const { data, error } = await requireSupabase().rpc("get_client_alerts", {
        p_workspace_id: workspaceId,
        p_days: days,
      });
      if (error) throw error;
      const result = (data ?? {}) as Partial<Alerts>;
      return { errors: result.errors ?? [], activity: result.activity ?? [] };
    },
    refetchInterval: 60_000,
  });
}

export function useMarkErrorsSeen() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().rpc("mark_client_errors_seen", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["alerts", workspaceId] }),
  });
}

const PART: Record<ClientAction["part"], string> = {
  concept: "idea",
  script: "script",
  cut: "cut",
  production: "option",
};

/** "approved the script", "asked for changes on the cut", in plain words. */
export function describeAction(action: Pick<ClientAction, "part" | "kind">): string {
  const part = PART[action.part] ?? action.part;
  switch (action.kind) {
    case "approve":
      return `approved the ${part}`;
    case "changes":
      return `asked for changes on the ${part}`;
    case "pass":
      return `passed on the ${part}`;
    case "changed":
      return `changed the ${part}`;
    default:
      return `commented on the ${part}`;
  }
}

export const AREA_LABEL: Record<AlertError["area"], string> = {
  crash: "Page crashed",
  request: "Action failed",
  unexpected: "Unexpected error",
};
