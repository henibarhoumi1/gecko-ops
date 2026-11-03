import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientReadData } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";
import {
  normaliseTeam,
  type Invoice,
  type InvoiceKind,
  type InvoiceLine,
  type InvoiceSettings,
  type Party,
} from "./model";

export interface InvoiceTarget {
  workspaceId: string;
  clientId: string;
}

const ids = (t: InvoiceTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });
const teamKey = (t: InvoiceTarget) => ["invoices", t.workspaceId, t.clientId];
const clientKey = (t: InvoiceTarget) => ["my-invoices", t.workspaceId, t.clientId];

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

// ---------- client ----------

/** Only owners and finance ask; everyone else gets nothing back. */
export function useMyInvoices(target: InvoiceTarget, enabled: boolean) {
  return useQuery({
    queryKey: clientKey(target),
    enabled,
    queryFn: async () =>
      ((await clientReadData("get_my_invoices", ids(target))) ?? []) as Invoice[],
    refetchInterval: 60_000,
  });
}

// ---------- team ----------

export function useInvoices(target: InvoiceTarget) {
  return useQuery({
    queryKey: teamKey(target),
    queryFn: async () => normaliseTeam(await rpc("get_invoices", ids(target))),
  });
}

export interface DraftPatch {
  lang: Lang;
  title: string;
  issueDate: string;
  dueDate: string;
  billTo: Party;
  lines: InvoiceLine[];
  note: string;
}

export function useInvoiceActions(target: InvoiceTarget) {
  const queryClient = useQueryClient();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: teamKey(target) });
    // Paying a deposit or balance changes the overview, and a paid balance opens the finals.
    void queryClient.invalidateQueries({ queryKey: ["cuts", target.workspaceId, target.clientId] });
  };
  return {
    create: useMutation({
      mutationFn: async (input: { kind: InvoiceKind; lang: Lang }) =>
        (await rpc("create_invoice", {
          ...ids(target),
          p_kind: input.kind,
          p_lang: input.lang,
        })) as string,
      onSettled: done,
    }),
    save: useMutation({
      mutationFn: (input: { id: string; patch: DraftPatch }) =>
        rpc("save_invoice", { ...ids(target), p_id: input.id, p: input.patch }),
      onSettled: done,
    }),
    send: useMutation({
      mutationFn: async (id: string) =>
        (await rpc("send_invoice", { ...ids(target), p_id: id })) as string,
      onSettled: done,
    }),
    paid: useMutation({
      mutationFn: (input: { id: string; paid: boolean; on: string | null; how: string }) =>
        rpc("mark_invoice_paid", {
          ...ids(target),
          p_id: input.id,
          p_paid: input.paid,
          p_on: input.on,
          p_how: input.how,
        }),
      onSettled: done,
    }),
    cancel: useMutation({
      mutationFn: (input: { id: string; reason: string }) =>
        rpc("void_invoice", { ...ids(target), p_id: input.id, p_reason: input.reason }),
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => rpc("delete_invoice", { ...ids(target), p_id: id }),
      onSettled: done,
    }),
  };
}

export function useSettingsActions(target: InvoiceTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: teamKey(target) });
  return {
    save: useMutation({
      mutationFn: (settings: Omit<InvoiceSettings, "taxesCheckedBy" | "taxesCheckedAt">) =>
        rpc("save_invoice_settings", { p_workspace_id: target.workspaceId, p: settings }),
      onSettled: done,
    }),
    check: useMutation({
      mutationFn: (input: { checked: boolean; by: string }) =>
        rpc("confirm_invoice_taxes", {
          p_workspace_id: target.workspaceId,
          p_checked: input.checked,
          p_by: input.by,
        }),
      onSettled: done,
    }),
  };
}
