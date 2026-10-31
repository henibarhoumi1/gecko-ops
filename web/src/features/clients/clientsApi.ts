import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fromRows,
  type Concept,
  type ConceptFormat,
  type ConceptRow,
  type ConceptStatus,
  type NoteRow,
} from "@/features/concepts/model";
import type { Milestone } from "@/features/portal/portalApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { inviteLink } from "@/lib/hosts";
import { requireSupabase } from "@/lib/supabase";

export interface ClientRow {
  id: string;
  brand: string;
  created_at: string;
}

export function useClients() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["clients", workspaceId],
    queryFn: async (): Promise<ClientRow[]> => {
      const { data, error } = await requireSupabase()
        .from("clients")
        .select("id,brand,created_at")
        .eq("workspace_id", workspaceId)
        .order("brand");
      if (error) throw error;
      return data as ClientRow[];
    },
  });
}

export function newClientId(): string {
  return "c" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/** Adds a client. The database's record call checks the role and fills the clients table. */
export function useAddClient() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: string): Promise<string> => {
      const id = newClientId();
      const { error } = await requireSupabase().rpc("put_workspace_record", {
        p_workspace_id: workspaceId,
        p_collection: "clients",
        p_id: id,
        p_data: { id, brand, createdAt: new Date().toISOString() },
      });
      if (error) throw error;
      return id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["clients", workspaceId] }),
  });
}

// ---------- the overview the client sees ----------

export interface PortalRow {
  client_id: string;
  campaign: string;
  summary: string;
  included: string[];
  shoot_date: string | null;
  shoot_place: string;
  next_step: string;
  milestones: Milestone[];
  price: number | null;
  deposit_status: "due" | "paid";
  balance_status: "later" | "due" | "paid";
  updated_at?: string;
}

const PORTAL_COLUMNS =
  "client_id,campaign,summary,included,shoot_date,shoot_place,next_step,milestones,price,deposit_status,balance_status,updated_at";

export function blankPortal(clientId: string): PortalRow {
  return {
    client_id: clientId,
    campaign: "",
    summary: "",
    included: [],
    shoot_date: null,
    shoot_place: "",
    next_step: "",
    milestones: [],
    price: null,
    deposit_status: "due",
    balance_status: "later",
  };
}

export function usePortalRow(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["client-portal", workspaceId, clientId],
    queryFn: async (): Promise<PortalRow | null> => {
      const { data, error } = await requireSupabase()
        .from("client_portals")
        .select(PORTAL_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as PortalRow | null;
    },
  });
}

export function useSavePortal(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: PortalRow) => {
      const { updated_at: _skip, ...fields } = row;
      void _skip;
      const { error } = await requireSupabase()
        .from("client_portals")
        .upsert(
          { ...fields, workspace_id: workspaceId, client_id: clientId },
          {
            onConflict: "workspace_id,client_id",
          },
        );
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["client-portal", workspaceId, clientId] }),
  });
}

// ---------- concepts ----------

const CONCEPT_COLUMNS =
  "id,title,format,body,refs,position,from_client,status,version,approved_version,approved_at,approved_by,author_name,created_at,updated_at";

/** Every concept of one client (or of all clients, for the list), with its conversation. */
export function useConcepts(clientId: string | null) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["concepts", workspaceId, clientId],
    queryFn: async (): Promise<(Concept & { clientId: string })[]> => {
      const db = requireSupabase();
      let concepts = db
        .from("concepts")
        .select(`${CONCEPT_COLUMNS},client_id`)
        .eq("workspace_id", workspaceId);
      let notes = db
        .from("concept_notes")
        .select("id,concept_id,kind,from_client,author_name,body,version,created_at")
        .eq("workspace_id", workspaceId);
      if (clientId) {
        concepts = concepts.eq("client_id", clientId);
        notes = notes.eq("client_id", clientId);
      }
      const [c, n] = await Promise.all([concepts, notes]);
      if (c.error) throw c.error;
      if (n.error) throw n.error;
      const rows = c.data as (ConceptRow & { client_id: string })[];
      return fromRows(rows, n.data as NoteRow[]).map((concept, i) => ({
        ...concept,
        clientId: rows[i]!.client_id,
      }));
    },
    refetchInterval: 30_000,
  });
}

export interface ConceptInput {
  id: string | null;
  title: string;
  format: ConceptFormat;
  body: string;
  refs: string;
  status?: ConceptStatus;
  position?: number;
}

export function useSaveConcept(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConceptInput) => {
      const db = requireSupabase();
      const fields = {
        title: input.title,
        format: input.format,
        body: input.body,
        refs: input.refs,
        ...(input.status ? { status: input.status } : {}),
        ...(input.position != null ? { position: input.position } : {}),
      };
      const { error } = input.id
        ? await db.from("concepts").update(fields).eq("id", input.id)
        : await db
            .from("concepts")
            .insert({ ...fields, workspace_id: workspaceId, client_id: clientId });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["concepts", workspaceId] }),
  });
}

export function useSetConceptStatus() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "review" }) => {
      const { error } = await requireSupabase().from("concepts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["concepts", workspaceId] }),
  });
}

export function useDeleteConcept() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().from("concepts").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["concepts", workspaceId] }),
  });
}

export function useAddNote(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conceptId, body }: { conceptId: string; body: string }) => {
      const { error } = await requireSupabase().from("concept_notes").insert({
        workspace_id: workspaceId,
        client_id: clientId,
        concept_id: conceptId,
        body,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["concepts", workspaceId] }),
  });
}

// ---------- client logins ----------

export interface ClientAccount {
  id: string;
  email: string;
  name: string;
  joined: boolean;
  expires: string | null;
  revoked: boolean;
  createdAt: string;
}

export function useClientAccounts(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["client-accounts", workspaceId, clientId],
    queryFn: async (): Promise<ClientAccount[]> => {
      const { data, error } = await requireSupabase().rpc("list_client_accounts", {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
      });
      if (error) throw error;
      return data as ClientAccount[];
    },
  });
}

/** Creates a one-time invite for the client's email and returns the link to send them. */
export function useInviteClient(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<string> => {
      const { data, error } = await requireSupabase().rpc("invite_client_account", {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
        p_email: email,
      });
      if (error) throw error;
      return inviteLink("client", String(data));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["client-accounts", workspaceId, clientId] }),
  });
}

export function useRevokeClientAccount(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await requireSupabase().rpc("revoke_client_account", {
        p_workspace_id: workspaceId,
        p_account_id: accountId,
      });
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["client-accounts", workspaceId, clientId] }),
  });
}
