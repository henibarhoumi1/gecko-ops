import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientPortal } from "@/features/auth/account";
import type { Concept, NoteKind } from "@/features/concepts/model";
import type { PlanId } from "@/features/plans/model";
import type { Script } from "@/features/scripts/model";
import type { Video } from "@/features/videos/model";
import { videosOn } from "@/lib/features";
import { requireSupabase } from "@/lib/supabase";
import { inviteLink } from "@/lib/hosts";
import { locale, t } from "@/lib/i18n";
import type { ClientRole } from "./role";

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
  /** Missing on a database without plans yet. */
  plan?: PlanId;
  reels?: number | null;
}

export interface PortalData {
  brand: string;
  me: string;
  /** The brand's logo as an image data URL, when Gecko added one. */
  logo?: string | null;
  /** Performance or Cinematic; missing on a database without templates yet. */
  template?: string;
  /** A still from the brand's own shoot for the top of a Cinematic portal. */
  cover?: string | null;
  /** The signed-in person's role on the client's side; missing before roles existed (treated as owner). */
  role?: string;
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
      label: t("Deposit, 50% to book the shoot", "Acompte, 50 % pour réserver le tournage"),
      amount: half,
      state: overview.depositStatus === "paid" ? "Paid" : "Due",
    },
    {
      label: t(
        "Balance, 50% once you approve the previews",
        "Solde, 50 % après validation des aperçus",
      ),
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
  return `${amount.toLocaleString(locale(), { maximumFractionDigits: 3 })} DT`;
}

/** How a payment state reads to the client. */
export function stateLabel(state: PaymentLine["state"]): string {
  if (state === "Paid") return t("Paid", "Payé");
  if (state === "Due") return t("Due", "À régler");
  return t("Later", "Plus tard");
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

// ---------- the client's own team ----------

export interface Teammate {
  id: string;
  name: string;
  /** Only owners see other people's emails. */
  email: string | null;
  role: ClientRole;
  joined: boolean;
  expires: string | null;
  me: boolean;
}

const teamKey = (portal: ClientPortal) => ["portal-team", portal.workspaceId, portal.clientId];

export function useMyTeam(portal: ClientPortal) {
  return useQuery({
    queryKey: teamKey(portal),
    queryFn: async (): Promise<Teammate[]> => {
      const { data, error } = await requireSupabase().rpc("get_my_team", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
      });
      if (error) throw error;
      return data as Teammate[];
    },
  });
}

/** An owner invites someone from their side; returns the link to send them. */
export function useInviteTeammate(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: ClientRole }): Promise<string> => {
      const { data, error } = await requireSupabase().rpc("client_invite_teammate", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_email: input.email,
        p_role: input.role,
      });
      if (error) throw error;
      return inviteLink("client", String(data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKey(portal) }),
  });
}

export function useSetTeammateRole(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role: ClientRole }) => {
      const { error } = await requireSupabase().rpc("client_set_teammate_role", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_account_id: input.id,
        p_role: input.role,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKey(portal) }),
  });
}

export function useRemoveTeammate(portal: ClientPortal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().rpc("client_remove_teammate", {
        p_workspace_id: portal.workspaceId,
        p_client_id: portal.clientId,
        p_account_id: id,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKey(portal) }),
  });
}
