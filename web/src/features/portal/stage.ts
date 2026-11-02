import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

/** Where a campaign stands, as the client reads it. */
export type Stage = "plan" | "prep" | "shoot" | "edit" | "delivery" | "results";

export const STAGES: Stage[] = ["plan", "prep", "shoot", "edit", "delivery", "results"];

/** Today as YYYY-MM-DD in the reader's own time zone, to compare with the shoot date. */
export function localDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Plan until something is approved, then Prep until the shoot day, Shoot on the day, Edit after it. Delivery and
 * Results take over once cuts and numbers live in the portal.
 */
export function currentStage(shootDate: string | null, approved: number, now: Date): Stage {
  const today = localDay(now);
  if (shootDate && today === shootDate) return "shoot";
  if (shootDate && today > shootDate) return "edit";
  return approved > 0 ? "prep" : "plan";
}

export function stageName(stage: Stage): string {
  return {
    plan: t("Plan", "Plan"),
    prep: t("Prep", "Préparation"),
    shoot: t("Shoot", "Tournage"),
    edit: t("Edit", "Montage"),
    delivery: t("Delivery", "Livraison"),
    results: tw(["Results", "Résultats"], ["Impact", "Impact"]),
  }[stage];
}
