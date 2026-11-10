import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { clientReadData } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";
import {
  normaliseShootPage,
  normaliseTeamShoots,
  type PersonSide,
  type ReelStatus,
  type ShootPage,
} from "./model";

export interface ShootTarget {
  workspaceId: string;
  clientId: string;
}

const ids = (t: ShootTarget) => ({ p_workspace_id: t.workspaceId, p_client_id: t.clientId });
const pageKey = (t: ShootTarget) => ["shoot", t.workspaceId, t.clientId];

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

// ---------- the copy kept on the phone ----------
// Sets often have no signal. The last page read is kept in this browser so the day still opens, and ticks
// made offline wait here until the connection is back. Storage can be missing or full: then it's just skipped.

const CACHE = "gecko.shoot.page.";
const QUEUE = "gecko.shoot.queue.";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept on this phone; it still works online.
  }
}

const cacheKey = (t: ShootTarget) => `${CACHE}${t.workspaceId}.${t.clientId}`;
const queueKey = (t: ShootTarget) => `${QUEUE}${t.workspaceId}.${t.clientId}`;

/** A reel change still waiting to be sent, latest per reel. */
export type ReelChanges = Partial<{
  status: ReelStatus;
  note: string;
  slot: string;
  linesDone: string[];
  lineChanges: Record<string, string>;
}>;

function readQueue(t: ShootTarget): Record<string, ReelChanges> {
  const q = readJson(queueKey(t));
  return q && typeof q === "object" && !Array.isArray(q) ? (q as Record<string, ReelChanges>) : {};
}

function isOffline(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message);
}

/** Puts changes into the page on screen right away, before the database answers. */
function applyLocally(
  queryClient: QueryClient,
  target: ShootTarget,
  reelId: string,
  c: ReelChanges,
) {
  queryClient.setQueryData<ShootPage>(pageKey(target), (page) =>
    page
      ? {
          ...page,
          days: page.days.map((d) => ({
            ...d,
            reels: d.reels.map((r) => (r.id === reelId ? { ...r, ...c } : r)),
          })),
        }
      : page,
  );
}

/** The shoot days of a client: the same call for the team and the client, and for View as client. */
export function useShootPage(target: ShootTarget) {
  const { workspaceId, clientId } = target;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: pageKey(target),
    queryFn: async () => {
      const page = normaliseShootPage(await clientReadData("get_shoot_days", ids(target)));
      writeJson(cacheKey(target), page);
      // Changes still waiting to be sent stay visible on top of what the database says.
      const queued = readQueue(target);
      return {
        ...page,
        days: page.days.map((d) => ({
          ...d,
          reels: d.reels.map((r) => (queued[r.id] ? { ...r, ...queued[r.id] } : r)),
        })),
      };
    },
    // The copy kept on this phone opens the day at once, and stays on screen if there's no signal.
    initialData: () => {
      const saved = readJson(cacheKey(target));
      return saved ? normaliseShootPage(saved) : undefined;
    },
    initialDataUpdatedAt: 0,
    // Several phones on one set: keep everyone close to live.
    refetchInterval: 10_000,
    networkMode: "always",
  });

  // When the connection comes back, send what was ticked offline, then read again.
  useEffect(() => {
    const here = { workspaceId, clientId };
    const flush = async () => {
      const queued = readQueue(here);
      const left: Record<string, ReelChanges> = { ...queued };
      for (const [reelId, changes] of Object.entries(queued)) {
        try {
          await rpc("update_shoot_reel", { ...ids(here), p_id: reelId, p_changes: changes });
          delete left[reelId];
        } catch (error) {
          // Still offline: try again later. Refused by the database: drop it, the page shows the truth.
          if (!isOffline(error)) delete left[reelId];
        }
      }
      writeJson(queueKey(here), Object.keys(left).length ? left : undefined);
      void queryClient.invalidateQueries({ queryKey: pageKey(here) });
    };
    if (Object.keys(readQueue(here)).length && navigator.onLine !== false) void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [workspaceId, clientId, queryClient]);

  return query;
}

/** Changes still on this phone, waiting for a connection. */
export function pendingCount(target: ShootTarget): number {
  return Object.keys(readQueue(target)).length;
}

export interface DayInput {
  id: string | null;
  /** For a new day: the project it belongs to (the client's current one when left out). */
  projectId?: string | null;
  day: string;
  title: string;
  callTime: string;
  wrapTime: string;
  place: string;
  address: string;
  mapLink: string;
  notes: string;
  privateNotes: string;
}

export interface PersonInput {
  id: string | null;
  name: string;
  role: string;
  side: PersonSide;
  callTime: string;
  phone: string;
}

export function useShootActions(target: ShootTarget) {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey: pageKey(target) });
  return {
    saveDay: useMutation({
      mutationFn: async (input: DayInput) =>
        (await rpc("save_shoot_day", { ...ids(target), p_day: input })) as string,
      onSettled: done,
    }),
    removeDay: useMutation({
      mutationFn: (id: string) => rpc("remove_shoot_day", { ...ids(target), p_id: id }),
      onSettled: done,
    }),
    restoreDay: useMutation({
      mutationFn: (id: string) => rpc("restore_shoot_day", { ...ids(target), p_id: id }),
      onSettled: done,
    }),
    setReels: useMutation({
      mutationFn: (input: { dayId: string; scriptIds: string[] }) =>
        rpc("set_shoot_reels", {
          ...ids(target),
          p_day_id: input.dayId,
          p_script_ids: input.scriptIds,
        }),
      onSettled: done,
    }),
    orderReels: useMutation({
      mutationFn: (input: { dayId: string; reelIds: string[] }) =>
        rpc("order_shoot_reels", {
          ...ids(target),
          p_day_id: input.dayId,
          p_reel_ids: input.reelIds,
        }),
      onSettled: done,
    }),
    savePerson: useMutation({
      mutationFn: async (input: { dayId: string; person: PersonInput }) =>
        (await rpc("save_shoot_person", {
          ...ids(target),
          p_day_id: input.dayId,
          p_person: input.person,
        })) as string,
      onSettled: done,
    }),
    removePerson: useMutation({
      mutationFn: (id: string) => rpc("remove_shoot_person", { ...ids(target), p_id: id }),
      onSettled: done,
    }),
    setState: useMutation({
      mutationFn: (input: { id: string; state: "planned" | "live" | "wrapped" }) =>
        rpc("set_shoot_day_state", { ...ids(target), p_id: input.id, p_state: input.state }),
      onSettled: done,
    }),
    log: useMutation({
      mutationFn: (input: { dayId: string; body: string }) =>
        rpc("add_shoot_log", { ...ids(target), p_day_id: input.dayId, p_body: input.body }),
      onSettled: done,
    }),
    /** A tick, a note or a line said differently. Shown at once; kept on the phone if there's no signal. */
    updateReel: useMutation({
      mutationFn: async (input: { reelId: string; changes: ReelChanges }) => {
        applyLocally(queryClient, target, input.reelId, input.changes);
        try {
          await rpc("update_shoot_reel", {
            ...ids(target),
            p_id: input.reelId,
            p_changes: input.changes,
          });
          return { queued: false };
        } catch (error) {
          if (!isOffline(error)) throw error;
          const queue = readQueue(target);
          queue[input.reelId] = { ...queue[input.reelId], ...input.changes };
          writeJson(queueKey(target), queue);
          return { queued: true };
        }
      },
      networkMode: "always",
      onSettled: (result) => {
        // Offline, reading again would only fail; the queue is sent when the connection is back.
        if (!result?.queued) void done();
      },
    }),
  };
}

/** The team's shoots across every client they can open. */
export function useTeamShoots(workspaceId: string) {
  return useQuery({
    queryKey: ["team-shoots", workspaceId],
    queryFn: async () =>
      normaliseTeamShoots(await rpc("get_team_shoots", { p_workspace_id: workspaceId })),
    refetchInterval: 60_000,
  });
}
