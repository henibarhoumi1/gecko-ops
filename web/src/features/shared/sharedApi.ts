import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientPortal } from "@/features/auth/account";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";

export interface SharedItem {
  id: string;
  kind: "reference" | "request";
  title: string;
  body: string;
  url: string;
  status: "open" | "answered" | "closed" | null;
  answer: string;
  answeredBy: string;
  answeredAt: string | null;
  fromClient: boolean;
  /** Written by the person looking at it (client side only). */
  mine: boolean;
  authorName: string;
  createdAt: string;
}

export interface SharedSpace {
  brandNotes: { body: string; updatedBy: string; updatedAt: string | null };
  items: SharedItem[];
}

// ---------- client ----------

const clientKey = (portal: ClientPortal) => ["portal-shared", portal.workspaceId, portal.clientId];

export function useMyShared(portal: ClientPortal) {
  return useQuery({
    queryKey: clientKey(portal),
    queryFn: async (): Promise<SharedSpace> => {
      const { data, error } = await requireSupabase().rpc("get_my_shared", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
      });
      if (error) throw error;
      return data as SharedSpace;
    },
    refetchInterval: 30_000,
  });
}

export function useClientShared(portal: ClientPortal) {
  const queryClient = useQueryClient();
  const db = () => requireSupabase();
  const ids = { p_workspace_id: portal.workspaceId, p_client_id: portal.clientId };
  const done = () => queryClient.invalidateQueries({ queryKey: clientKey(portal) });
  return {
    saveNotes: useMutation({
      mutationFn: async (body: string) => {
        const { error } = await db().rpc("client_save_brand_notes", { ...ids, p_body: body });
        if (error) throw error;
      },
      onSettled: done,
    }),
    add: useMutation({
      mutationFn: async (input: {
        kind: SharedItem["kind"];
        title: string;
        body: string;
        url: string;
      }) => {
        const { error } = await db().rpc("client_add_shared", {
          ...ids,
          p_kind: input.kind,
          p_title: input.title,
          p_body: input.body,
          p_url: input.url,
        });
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().rpc("client_remove_shared", { ...ids, p_id: id });
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}

// ---------- team ----------

interface ItemRow {
  id: string;
  kind: SharedItem["kind"];
  title: string;
  body: string;
  url: string;
  status: SharedItem["status"];
  answer: string;
  answered_by: string;
  answered_at: string | null;
  from_client: boolean;
  author_name: string;
  created_at: string;
}

export function useTeamShared(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["shared", workspaceId, clientId],
    queryFn: async (): Promise<SharedSpace> => {
      const db = requireSupabase();
      const [n, i] = await Promise.all([
        db
          .from("client_brand_notes")
          .select("body,updated_by_name,updated_at")
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId)
          .maybeSingle(),
        db
          .from("shared_items")
          .select(
            "id,kind,title,body,url,status,answer,answered_by,answered_at,from_client,author_name,created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);
      if (n.error) throw n.error;
      if (i.error) throw i.error;
      const notes = n.data as { body: string; updated_by_name: string; updated_at: string } | null;
      return {
        brandNotes: {
          body: notes?.body ?? "",
          updatedBy: notes?.updated_by_name ?? "",
          updatedAt: notes?.updated_at ?? null,
        },
        items: (i.data as ItemRow[]).map((r) => ({
          id: r.id,
          kind: r.kind,
          title: r.title,
          body: r.body,
          url: r.url,
          status: r.status,
          answer: r.answer,
          answeredBy: r.answered_by,
          answeredAt: r.answered_at,
          fromClient: r.from_client,
          mine: !r.from_client,
          authorName: r.author_name,
          createdAt: r.created_at,
        })),
      };
    },
    refetchInterval: 30_000,
  });
}

export function useTeamSharedActions(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const db = () => requireSupabase();
  const done = () => queryClient.invalidateQueries({ queryKey: ["shared", workspaceId, clientId] });
  return {
    saveNotes: useMutation({
      mutationFn: async (body: string) => {
        const { error } = await db()
          .from("client_brand_notes")
          .upsert({ workspace_id: workspaceId, client_id: clientId, body });
        if (error) throw error;
      },
      onSettled: done,
    }),
    add: useMutation({
      mutationFn: async (input: { title: string; body: string; url: string }) => {
        const { error } = await db()
          .from("shared_items")
          .insert({ ...input, kind: "reference", workspace_id: workspaceId, client_id: clientId });
        if (error) throw error;
      },
      onSettled: done,
    }),
    answer: useMutation({
      mutationFn: async (input: { id: string; answer: string; status: "answered" | "closed" }) => {
        const { error } = await db()
          .from("shared_items")
          .update({ answer: input.answer, status: input.status })
          .eq("id", input.id);
        if (error) throw error;
      },
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db().from("shared_items").delete().eq("id", id);
        if (error) throw error;
      },
      onSettled: done,
    }),
  };
}

/** The site's name for a link, so a list of references reads as "instagram.com" rather than a long URL. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
