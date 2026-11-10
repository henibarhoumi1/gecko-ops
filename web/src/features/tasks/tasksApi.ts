import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientReadData } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";
import type { Task, TaskInput } from "./model";

export interface TaskTarget {
  workspaceId: string;
  /** null: the team's own tasks, on no client. */
  clientId: string | null;
}

const key = (workspaceId: string) => ["tasks", workspaceId];

/** One client's tasks. The client side reads through the preview when previewing. */
export function useTasks(target: TaskTarget & { clientId: string }, reader: "client" | "team") {
  return useQuery({
    queryKey: [...key(target.workspaceId), target.clientId, reader],
    queryFn: async (): Promise<Task[]> => {
      const args = { p_workspace_id: target.workspaceId, p_client_id: target.clientId };
      if (reader === "client") return (await clientReadData("get_tasks", args)) as Task[];
      const { data, error } = await requireSupabase().rpc("get_tasks", args);
      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 30_000,
  });
}

/** Every open task across the clients the team member can see, and the team's own. */
export function useTeamTasks(workspaceId: string) {
  return useQuery({
    queryKey: [...key(workspaceId), "all"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await requireSupabase().rpc("get_team_tasks", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 60_000,
  });
}

export function useTaskActions(workspaceId: string) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: key(workspaceId) });
  const db = () => requireSupabase();
  return {
    save: useMutation({
      mutationFn: async ({ clientId, task }: { clientId: string | null; task: TaskInput }) => {
        const { data, error } = await db().rpc("save_task", {
          p_workspace_id: workspaceId,
          p_client_id: clientId,
          p_task: task,
        });
        if (error) throw error;
        return data as string;
      },
      onSettled: done,
    }),
    tick: useMutation({
      mutationFn: async ({
        clientId,
        id,
        done: isDone,
      }: {
        clientId: string | null;
        id: string;
        done: boolean;
      }) => {
        const { error } = await db().rpc("set_task_done", {
          p_workspace_id: workspaceId,
          p_client_id: clientId,
          p_id: id,
          p_done: isDone,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async ({ clientId, id }: { clientId: string | null; id: string }) => {
        const { error } = await db().rpc("remove_task", {
          p_workspace_id: workspaceId,
          p_client_id: clientId,
          p_id: id,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}
