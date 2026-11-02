import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import type { OptionKind, OptionStatus, Production, ProductionOption } from "./model";

/** Which client's production we're looking at; the same shape on both sides. */
export interface ProductionTarget {
  workspaceId: string;
  clientId: string;
}

export const PHOTO_BUCKET = "production";

const ids = (t: ProductionTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });

function normalise(data: unknown): Production {
  const page = (data ?? {}) as Partial<Production>;
  return { budget: page.budget ?? null, options: page.options ?? [] };
}

// ---------- client ----------

const clientKey = (t: ProductionTarget) => ["my-production", t.workspaceId, t.clientId];

export function useMyProduction(target: ProductionTarget) {
  return useQuery({
    queryKey: clientKey(target),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_my_production", ids(target));
      if (error) throw error;
      return normalise(data);
    },
    refetchInterval: 30_000,
  });
}

export function useClientProduction(target: ProductionTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: clientKey(target) });
  const db = () => requireSupabase();
  return {
    decide: useMutation({
      mutationFn: async (input: {
        id: string;
        decision: "approve" | "pass";
        body: string;
        over?: boolean;
      }) => {
        const { error } = await db().rpc("client_decide_option", {
          ...ids(target),
          p_id: input.id,
          p_decision: input.decision,
          p_body: input.body,
          p_over: input.over ?? false,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    comment: useMutation({
      mutationFn: async (input: { id: string; body: string }) => {
        const { error } = await db().rpc("client_comment_option", {
          ...ids(target),
          p_id: input.id,
          p_body: input.body,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    suggest: useMutation({
      mutationFn: async (input: {
        kind: OptionKind;
        name: string;
        details: string;
        link: string;
        photos: string[];
      }) => {
        const { error } = await db().rpc("client_suggest_option", {
          ...ids(target),
          p_kind: input.kind,
          p_name: input.name,
          p_details: input.details,
          p_link: input.link,
          p_photos: input.photos,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().rpc("client_remove_suggestion", { ...ids(target), p_id: id });
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}

// ---------- team ----------

const teamKey = (t: ProductionTarget) => ["production", t.workspaceId, t.clientId];

export function useTeamProduction(target: ProductionTarget) {
  return useQuery({
    queryKey: teamKey(target),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_production", ids(target));
      if (error) throw error;
      return normalise(data);
    },
    refetchInterval: 30_000,
  });
}

/** What the team form sends; the database decides status, author and approvals. */
export type OptionDraft = Partial<
  Pick<
    ProductionOption,
    | "id"
    | "name"
    | "role"
    | "details"
    | "link"
    | "photos"
    | "costNote"
    | "when"
    | "usage"
    | "boughtBy"
    | "privateNotes"
    | "releaseOnFile"
  >
> & { kind: OptionKind; cost: number };

export function useTeamProductionActions(target: ProductionTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: teamKey(target) });
  const db = () => requireSupabase();
  return {
    saveBudget: useMutation({
      mutationFn: async (input: { cap: number | null; note: string }) => {
        const { error } = await db().rpc("set_production_budget", {
          ...ids(target),
          p_cap: input.cap,
          p_note: input.note,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    save: useMutation({
      mutationFn: async (draft: OptionDraft) => {
        const { error } = await db().rpc("save_production_option", {
          ...ids(target),
          p_option: draft,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    setStatus: useMutation({
      mutationFn: async (input: { id: string; status: OptionStatus }) => {
        const { error } = await db().rpc("set_production_status", {
          ...ids(target),
          p_id: input.id,
          p_status: input.status,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().rpc("delete_production_option", { ...ids(target), p_id: id });
        if (error) throw error;
      },
      onSettled: done,
    }),
    note: useMutation({
      mutationFn: async (input: { id: string; body: string }) => {
        const { error } = await db().rpc("add_production_note", {
          ...ids(target),
          p_id: input.id,
          p_body: input.body,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}
