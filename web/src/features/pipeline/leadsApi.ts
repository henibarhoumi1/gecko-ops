import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import type { Lead } from "./model";

const COLUMNS =
  "workspace_id,id,brand,stage,channel,contact,handle,phone,whatsapp,url,sector,pack,value,client_id,owner_member_id,next_step,next_date,lost_reason,history,log,extra,created_at,updated_at";

export type LeadInput = Omit<Lead, "workspace_id" | "created_at" | "updated_at" | "log" | "extra">;

export function useLeads() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["leads", workspaceId],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await requireSupabase()
        .from("leads")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data as Lead[];
    },
  });
}

/** Creates or updates one lead, then refreshes the board. */
export function useSaveLead() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInput) => {
      const { error } = await requireSupabase()
        .from("leads")
        .upsert({ ...lead, workspace_id: workspaceId }, { onConflict: "workspace_id,id" });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] }),
  });
}

export function newLeadId(): string {
  return "l" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/** The fields a quick change can touch. Only these are written; everything else on the lead stays as it is. */
export type LeadPatch = Partial<
  Pick<
    Lead,
    | "stage"
    | "owner_member_id"
    | "next_step"
    | "next_date"
    | "history"
    | "log"
    | "extra"
    | "contact"
    | "whatsapp"
    | "lost_reason"
    | "client_id"
  >
>;

/** Changes some fields of one or more leads, each with its own patch. */
export function usePatchLeads() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patches: { id: string; patch: LeadPatch }[]) => {
      const db = requireSupabase();
      const results = await Promise.all(
        patches.map(({ id, patch }) =>
          db.from("leads").update(patch).eq("workspace_id", workspaceId).eq("id", id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] }),
  });
}

/** Adds several new leads at once. */
export function useAddLeads() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leads: LeadInput[]) => {
      if (!leads.length) return;
      const { error } = await requireSupabase()
        .from("leads")
        .insert(leads.map((l) => ({ ...l, workspace_id: workspaceId })));
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] }),
  });
}
