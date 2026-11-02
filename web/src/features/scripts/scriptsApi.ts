import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientPortal } from "@/features/auth/account";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import {
  scriptsFromRows,
  type Script,
  type ScriptContent,
  type ScriptLine,
  type Treatment,
  type ScriptNoteRow,
  type ScriptRow,
  type ScriptStatus,
  type ScriptVersionRow,
} from "./model";

const COLUMNS =
  "id,client_id,concept_id,title,style,seconds,goal,hooks,beats,cta,position,status,version,hook,approved_version,approved_at,approved_by,author_name,created_at,updated_at,written_by,treatment";

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
        ...(input.treatment ? { treatment: input.treatment } : {}),
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
    /** Draft or review for Gecko's own; approved or changes on a version the client wrote. */
    mutationFn: async ({ id, status }: { id: string; status: ScriptStatus }) => {
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

/** The client writes a script or treatment of their own, or edits one Gecko hasn't approved yet. */
export function useClientWriteScript(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string | null;
      title: string;
      seconds: number;
      goal: string;
      hooks: ScriptLine[];
      beats: ScriptLine[];
      cta: string;
      treatment: Treatment;
    }) => {
      const { error } = await requireSupabase().rpc("client_write_script", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_id: input.id,
        p_title: input.title,
        p_seconds: input.seconds,
        p_goal: input.goal,
        p_hooks: input.hooks,
        p_beats: input.beats,
        p_cta: input.cta,
        p_treatment: input.treatment,
      });
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["portal", portal.workspaceId, portal.clientId] }),
  });
}
