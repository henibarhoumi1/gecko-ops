import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientPortal } from "@/features/auth/account";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import {
  scriptsFromRows,
  type Script,
  type ScriptContent,
  type ScriptNoteRow,
  type ScriptRow,
  type ScriptStatus,
  type ScriptVersionRow,
} from "./model";

const COLUMNS =
  "id,client_id,concept_id,title,style,seconds,goal,hooks,beats,cta,position,status,version,hook,approved_version,approved_at,approved_by,author_name,created_at,updated_at";

/** Every script of one client (or of all clients), with its notes and the version the client saw before. */
export function useScripts(clientId: string | null) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["scripts", workspaceId, clientId],
    queryFn: async (): Promise<(Script & { clientId: string })[]> => {
      const db = requireSupabase();
      let scripts = db.from("scripts").select(COLUMNS).eq("workspace_id", workspaceId);
      let notes = db
        .from("script_notes")
        .select("id,script_id,kind,line,hook,from_client,author_name,body,version,created_at")
        .eq("workspace_id", workspaceId);
      let versions = db
        .from("script_versions")
        .select("script_id,version,content")
        .eq("workspace_id", workspaceId);
      if (clientId) {
        scripts = scripts.eq("client_id", clientId);
        notes = notes.eq("client_id", clientId);
        versions = versions.eq("client_id", clientId);
      }
      const [s, n, v] = await Promise.all([scripts, notes, versions]);
      if (s.error) throw s.error;
      if (n.error) throw n.error;
      if (v.error) throw v.error;
      const rows = s.data as ScriptRow[];
      return scriptsFromRows(rows, n.data as ScriptNoteRow[], v.data as ScriptVersionRow[]).map(
        (script, i) => ({ ...script, clientId: rows[i]!.client_id }),
      );
    },
    refetchInterval: 30_000,
  });
}

export interface ScriptInput extends ScriptContent {
  id: string | null;
  conceptId: string | null;
  status?: Extract<ScriptStatus, "draft" | "review">;
  position?: number;
}

export function useSaveScript(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScriptInput): Promise<string> => {
      const db = requireSupabase();
      const fields = {
        title: input.title,
        style: input.style,
        seconds: input.seconds,
        goal: input.goal,
        hooks: input.hooks,
        beats: input.beats,
        cta: input.cta,
        concept_id: input.conceptId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.position != null ? { position: input.position } : {}),
      };
      if (input.id) {
        const { error } = await db.from("scripts").update(fields).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await db
        .from("scripts")
        .insert({ ...fields, workspace_id: workspaceId, client_id: clientId })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scripts", workspaceId] }),
  });
}

export function useSetScriptStatus() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "review" }) => {
      const { error } = await requireSupabase().from("scripts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scripts", workspaceId] }),
  });
}

export function useDeleteScript() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().from("scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scripts", workspaceId] }),
  });
}

/** A team comment, on the whole script or on one line. */
export function useTeamScriptNote(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scriptId: string; line: string | null; body: string }) => {
      const { error } = await requireSupabase().from("script_notes").insert({
        workspace_id: workspaceId,
        client_id: clientId,
        script_id: input.scriptId,
        line: input.line,
        body: input.body,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scripts", workspaceId] }),
  });
}

/** The client's side: approve with a hook, ask for changes, or comment on a line. */
export function useClientScriptNote(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      scriptId: string;
      kind: "comment" | "approve" | "changes";
      body: string;
      version: number;
      line: string | null;
      hook: number | null;
    }) => {
      const { error } = await requireSupabase().rpc("client_script_note", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_script_id: input.scriptId,
        p_kind: input.kind,
        p_body: input.body,
        p_version: input.version,
        p_line: input.line,
        p_hook: input.hook,
      });
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["portal", portal.workspaceId, portal.clientId] }),
  });
}
