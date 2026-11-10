import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";

/** A project of a client: its own ideas, scripts, shoot days, reels and invoices. */
export interface Project {
  id: string;
  name: string;
  kind: "performance" | "cinematic";
  status: "active" | "done" | "archived";
  createdAt: string;
  ideas: number;
  scripts: number;
  approved: number;
  shootDays: number;
  nextShoot: string | null;
  reels: number;
}

export interface ProjectList {
  canManage: boolean;
  projects: Project[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function normaliseProjects(data: unknown): ProjectList {
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const list = Array.isArray(o.projects) ? o.projects : [];
  return {
    canManage: o.canManage === true,
    projects: list.map((v) => {
      const p = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      return {
        id: String(p.id ?? ""),
        name: typeof p.name === "string" ? p.name : "",
        kind: p.kind === "cinematic" ? "cinematic" : "performance",
        status: p.status === "done" || p.status === "archived" ? p.status : "active",
        createdAt: typeof p.createdAt === "string" ? p.createdAt : "",
        ideas: num(p.ideas),
        scripts: num(p.scripts),
        approved: num(p.approved),
        shootDays: num(p.shootDays),
        nextShoot: typeof p.nextShoot === "string" ? p.nextShoot : null,
        reels: num(p.reels),
      };
    }),
  };
}

export interface ProjectTarget {
  workspaceId: string;
  clientId: string;
}

const key = (t: ProjectTarget) => ["projects", t.workspaceId, t.clientId];

export function useProjects(target: ProjectTarget) {
  return useQuery({
    queryKey: key(target),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_projects", {
        p_workspace_id: target.workspaceId,
        p_client_id: target.clientId,
      });
      if (error) throw error;
      return normaliseProjects(data);
    },
  });
}

export function useSaveProject(target: ProjectTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      kind?: Project["kind"];
      status?: Project["status"];
    }) => {
      const { data, error } = await requireSupabase().rpc("save_project", {
        p_workspace_id: target.workspaceId,
        p_client_id: target.clientId,
        p_project: input,
      });
      if (error) throw error;
      return data as string;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(target) }),
  });
}
