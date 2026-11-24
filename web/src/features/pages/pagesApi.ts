import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { readBlocks, type Block } from "./blocks";

export interface PageSummary {
  id: string;
  title: string;
  icon: string;
  kind: "page" | "doc";
  template: string;
  clientId: string | null;
  pinned: boolean;
  authorName: string;
  updatedAt: string;
}

export interface Page extends PageSummary {
  blocks: Block[];
}

interface Row {
  id: string;
  title: string;
  icon: string;
  kind: "page" | "doc";
  template: string;
  client_id: string | null;
  pinned: boolean;
  author_name: string;
  updated_at: string;
  blocks?: unknown;
}

const sum = (r: Row): PageSummary => ({
  id: r.id,
  title: r.title,
  icon: r.icon,
  kind: r.kind,
  template: r.template,
  clientId: r.client_id,
  pinned: r.pinned,
  authorName: r.author_name,
  updatedAt: r.updated_at,
});

const listKey = (ws: string) => ["pages", ws];

export function usePages() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: listKey(workspaceId),
    queryFn: async (): Promise<PageSummary[]> => {
      const { data, error } = await requireSupabase()
        .from("studio_pages")
        .select("id,title,icon,kind,template,client_id,pinned,author_name,updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Row[]).map(sum);
    },
  });
}

export function usePage(id: string | undefined) {
  return useQuery({
    queryKey: ["page", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Page | null> => {
      const { data, error } = await requireSupabase()
        .from("studio_pages")
        .select("id,title,icon,kind,template,client_id,pinned,author_name,updated_at,blocks")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const r = data as Row;
      return { ...sum(r), blocks: readBlocks(r.blocks) };
    },
  });
}

export function usePageActions() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: listKey(workspaceId) });
  return {
    create: useMutation({
      mutationFn: async (p: {
        title: string;
        icon: string;
        kind: "page" | "doc";
        template: string;
        blocks: Block[];
        authorName: string;
        clientId?: string | null;
      }) => {
        const { data, error } = await requireSupabase()
          .from("studio_pages")
          .insert({
            workspace_id: workspaceId,
            title: p.title,
            icon: p.icon,
            kind: p.kind,
            template: p.template,
            blocks: p.blocks,
            author_name: p.authorName,
            client_id: p.clientId ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      },
      onSettled: refresh,
    }),
    save: useMutation({
      mutationFn: async (p: {
        id: string;
        title?: string;
        icon?: string;
        blocks?: Block[];
        pinned?: boolean;
        clientId?: string | null;
      }) => {
        const patch: Record<string, unknown> = {};
        if (p.title !== undefined) patch.title = p.title;
        if (p.icon !== undefined) patch.icon = p.icon;
        if (p.blocks !== undefined) patch.blocks = p.blocks;
        if (p.pinned !== undefined) patch.pinned = p.pinned;
        if (p.clientId !== undefined) patch.client_id = p.clientId;
        const { error } = await requireSupabase().from("studio_pages").update(patch).eq("id", p.id);
        if (error) throw error;
      },
      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await requireSupabase().from("studio_pages").delete().eq("id", id);
        if (error) throw error;
      },
      onSettled: refresh,
    }),
  };
}
