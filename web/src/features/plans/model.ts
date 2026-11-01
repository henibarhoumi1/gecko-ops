import type { Script } from "@/features/scripts/model";

export type PlanId = "test" | "regular" | "pro" | "partner" | "custom";

export interface Plan {
  label: string;
  /** Shown under the plan name on the client's Home. */
  cadence: string;
  price: number | null;
  reels: number | null;
  included: string[];
}

/** Gecko's offers, with launch prices valid until 31 December 2026. */
export const PLANS: Record<PlanId, Plan> = {
  test: {
    label: "The Test",
    cadence: "One campaign",
    price: 999,
    reels: 3,
    included: ["3 edited reels", "1 static post", "A 3-hour shoot"],
  },
  regular: {
    label: "Regular",
    cadence: "Every month",
    price: 2900,
    reels: 10,
    included: ["10 edited reels a month"],
  },
  pro: {
    label: "Pro",
    cadence: "Every month",
    price: 3800,
    reels: 15,
    included: ["15 edited reels a month"],
  },
  partner: {
    label: "Creative Partner",
    cadence: "Every month",
    price: null,
    reels: 20,
    included: ["20 to 100 reels a month", "A review of your results and the market"],
  },
  custom: { label: "Custom", cadence: "", price: null, reels: null, included: [] },
};

export const PLAN_OPTIONS = (Object.keys(PLANS) as PlanId[]).map(
  (id) => [id, PLANS[id].label] as const,
);

export type ReelState = "approved" | "review" | "writing" | "open";

/**
 * One slot per reel in the plan, filled from the scripts: approved first, then the ones with the client, then the
 * ones Gecko is writing or reworking. Extra scripts beyond the plan don't add slots.
 */
export function reelSlots(reels: number, scripts: Pick<Script, "status">[]): ReelState[] {
  const count = (status: Script["status"]) => scripts.filter((s) => s.status === status).length;
  const states: ReelState[] = [
    ...Array<ReelState>(count("approved")).fill("approved"),
    ...Array<ReelState>(count("review")).fill("review"),
    ...Array<ReelState>(count("changes") + count("draft")).fill("writing"),
  ];
  return Array.from({ length: reels }, (_, i) => states[i] ?? "open");
}
