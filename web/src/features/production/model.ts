import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

export type OptionKind = "talent" | "location" | "prop";

export type OptionStatus =
  | "suggested"
  | "proposed"
  | "approved"
  | "passed"
  | "booked"
  | "shot"
  | "paid"
  | "invoiced";

export interface ProductionNote {
  id: string;
  kind: "comment" | "approve" | "pass" | "changed";
  body: string;
  cost: number | null;
  fromClient: boolean;
  authorName: string;
  createdAt: string;
}

export interface ProductionOption {
  id: string;
  kind: OptionKind;
  name: string;
  role: string;
  details: string;
  link: string;
  photos: string[];
  /** Null for a viewer, who doesn't see money. */
  cost: number | null;
  costNote: string;
  when: string;
  usage: string;
  boughtBy: "gecko" | "client";
  status: OptionStatus;
  overBudget: boolean;
  decidedBy: string;
  decidedAt: string | null;
  fromClient: boolean;
  mine: boolean;
  authorName: string;
  createdAt: string;
  /** Team only. */
  privateNotes?: string | null;
  releaseOnFile?: boolean | null;
  notes: ProductionNote[];
}

export interface Budget {
  cap: number | null;
  note: string;
  committed: number;
  updatedAt: string | null;
}

export interface Production {
  /** Null for a viewer. */
  budget: Budget | null;
  options: ProductionOption[];
}

/** Statuses where the money is spoken for. */
export const COMMITTED: OptionStatus[] = ["approved", "booked", "shot", "paid", "invoiced"];

/** The steps a cost walks through once it's approved, in order. */
export const STEPS: OptionStatus[] = ["approved", "booked", "shot", "paid", "invoiced"];

export const isCommitted = (o: Pick<ProductionOption, "status">) => COMMITTED.includes(o.status);

export const countsOnBudget = (o: Pick<ProductionOption, "status" | "boughtBy">) =>
  isCommitted(o) && o.boughtBy === "gecko";

/** Would saying yes to this option push the total past the budget? */
export function wouldGoOver(o: ProductionOption, budget: Budget | null): boolean {
  if (!budget || budget.cap == null || o.boughtBy !== "gecko" || o.cost == null) return false;
  const already = countsOnBudget(o) ? budget.committed - o.cost : budget.committed;
  return already + o.cost > budget.cap;
}

/** Money committed per kind, for the meter's breakdown. */
export function committedByKind(options: ProductionOption[]): Record<OptionKind, number> {
  const out: Record<OptionKind, number> = { talent: 0, location: 0, prop: 0 };
  for (const o of options) if (countsOnBudget(o) && o.cost != null) out[o.kind] += o.cost;
  return out;
}

export function kindName(kind: OptionKind, plural = false): string {
  if (kind === "talent")
    return plural
      ? tw(["Talent", "Talents"], ["Cast", "Casting"])
      : tw(["Talent", "Talent"], ["Cast", "Casting"]);
  if (kind === "location")
    return plural
      ? tw(["Locations", "Lieux"], ["Sets", "Décors"])
      : tw(["Location", "Lieu"], ["Set", "Décor"]);
  return plural ? t("Props", "Accessoires") : t("Prop", "Accessoire");
}

/** How a status reads to each side. The client never sees internal words. */
export function statusName(status: OptionStatus, reader: "client" | "team"): string {
  const client: Record<OptionStatus, string> = {
    suggested: t("Your suggestion, with Gecko", "Votre suggestion, chez Gecko"),
    proposed: t("Needs you", "À valider"),
    approved: t("Approved", "Validé"),
    passed: t("Passed", "Écarté"),
    booked: t("Booked", "Réservé"),
    shot: t("Shot", "Tourné"),
    paid: t("Paid by Gecko", "Payé par Gecko"),
    invoiced: t("On your invoice", "Sur votre facture"),
  };
  const team: Record<OptionStatus, string> = {
    suggested: "Client suggestion: price it",
    proposed: "With the client",
    approved: "Approved",
    passed: "Passed",
    booked: "Booked",
    shot: "Shot",
    paid: "Paid by Gecko",
    invoiced: "On the invoice",
  };
  return (reader === "client" ? client : team)[status];
}

/** Role choices for talent; free text stays possible on the team form. */
export const TALENT_ROLES = ["main", "extra", "voice"] as const;

export function talentRole(role: string): string {
  if (role === "main") return tw(["Main", "Principal"], ["Lead", "Rôle principal"]);
  if (role === "extra") return t("Extra", "Figurant");
  if (role === "voice") return t("Voice", "Voix");
  return role;
}
