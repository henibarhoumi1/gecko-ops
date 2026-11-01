import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientPortal } from "@/features/auth/account";
import type { Concept, NoteKind } from "@/features/concepts/model";
import type { Script } from "@/features/scripts/model";
import type { Video } from "@/features/videos/model";
import { videosOn } from "@/lib/features";
import { requireSupabase } from "@/lib/supabase";

export interface Milestone {
  label: string;
  date?: string | null;
  done?: boolean;
}

export interface Overview {
  campaign: string;
  summary: string;
  included: string[];
  shootDate: string | null;
  shootPlace: string;
  nextStep: string;
  milestones: Milestone[];
  price: number | null;
  depositStatus: "due" | "paid";
  balanceStatus: "later" | "due" | "paid";
  updatedAt: string;
}

export interface PortalData {
  brand: string;
  me: string;
  overview: Overview | null;
  concepts: Concept[];
  scripts: Script[];
}

const key = (portal: ClientPortal) => ["portal", portal.workspaceId, portal.clientId];

/** Everything the client sees, refreshed every half minute so the team's changes show up. */
export function useMyPortal(portal: ClientPortal) {
  return useQuery({
    queryKey: key(portal),
    queryFn: async (): Promise<PortalData> => {
      const { data, error } = await requireSupabase().rpc("get_my_portal", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
      });
      if (error) throw error;
      const page = data as PortalData;
      // An older database without scripts returns no key; treat it as none yet.
      return { ...page, scripts: page.scripts ?? [] };
    },
    refetchInterval: 30_000,
  });
}

/** Approve, ask for changes or comment, then refresh the page. */
export function useConceptNote(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conceptId: string;
      kind: NoteKind;
      body: string;
      version: number;
    }) => {
      const { error } = await requireSupabase().rpc("client_concept_note", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_concept_id: input.conceptId,
        p_kind: input.kind,
        p_body: input.body,
        p_version: input.version,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(portal) }),
  });
}

export function useSaveIdea(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string | null; title: string; body: string; refs: string }) => {
      const { error } = await requireSupabase().rpc("client_save_idea", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_id: input.id,
        p_title: input.title,
        p_body: input.body,
        p_refs: input.refs,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(portal) }),
  });
}

export function useDeleteIdea(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().rpc("client_delete_idea", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_id: id,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(portal) }),
  });
}

export interface PaymentLine {
  label: string;
  amount: number | null;
  state: "Paid" | "Due" | "Later";
}

/** Deposit and balance from the price: the 50/50 split Gecko works with. */
export function paymentLines(
  overview: Pick<Overview, "price" | "depositStatus" | "balanceStatus">,
): PaymentLine[] {
  const half = overview.price == null ? null : Math.round(overview.price * 500) / 1000;
  return [
    {
      label: "Deposit, 50% to book the shoot",
      amount: half,
      state: overview.depositStatus === "paid" ? "Paid" : "Due",
    },
    {
      label: "Balance, 50% once you approve the previews",
      amount: half,
      state:
        overview.balanceStatus === "paid"
          ? "Paid"
          : overview.balanceStatus === "due"
            ? "Due"
            : "Later",
    },
  ];
}

export function dt(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 3 })} DT`;
}

// ---------- videos ----------

export interface MyVideos {
  balancePaid: boolean;
  videos: Video[];
}

const videosKey = (portal: ClientPortal) => ["portal-videos", portal.workspaceId, portal.clientId];

/** The videos Gecko shared, and whether the finals can be downloaded yet. */
export function useMyVideos(portal: ClientPortal) {
  return useQuery({
    queryKey: videosKey(portal),
    enabled: videosOn,
    queryFn: async (): Promise<MyVideos> => {
      const { data, error } = await requireSupabase().rpc("get_my_videos", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
      });
      if (error) throw error;
      return data as MyVideos;
    },
    refetchInterval: 30_000,
  });
}

/** Approve a cut, ask for changes, or comment, on the version the client watched. */
export function useVideoNote(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      videoId: string;
      kind: NoteKind;
      body: string;
      version: number;
    }) => {
      const { error } = await requireSupabase().rpc("client_video_note", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_video_id: input.videoId,
        p_kind: input.kind,
        p_body: input.body,
        p_version: input.version,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: videosKey(portal) }),
  });
}
