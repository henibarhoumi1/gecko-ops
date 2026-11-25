// The shoot plan of an idea or a script, the same on Gecko's side and the client's (Heni, 25 Nov 2026): who is
// in it, which sets it's shot on (one or more), which props. No React here, so it's tested on its own.
import type { ShootPlan } from "@/features/scripts/model";

/** One thing a plan can pick: a talent, a set, a prop or a place, with its photos (production bucket paths). */
export interface Choice {
  id: string;
  name: string;
  /** A short line under the name: the role, the set's notes. */
  detail?: string;
  photos: string[];
  /** Talent only: approved by both sides ("ready") or still waiting. */
  stands?: "ready" | "waiting";
  /** Sets only: the campaign it belongs to (null: every campaign). */
  projectId?: string | null;
}

export interface ShootChoices {
  talent: Choice[];
  sets: Choice[];
  props: Choice[];
  /** Approved locations: older scripts picked one as their set, so they still show. */
  places: Choice[];
}

export const NO_CHOICES: ShootChoices = { talent: [], sets: [], props: [], places: [] };

/** Every set a plan names, in order: the list, or else the old single set. */
export function planSets(plan: ShootPlan | undefined | null): string[] {
  if (!plan) return [];
  if (Array.isArray(plan.sets)) return plan.sets.filter(Boolean);
  return plan.set ? [plan.set] : [];
}

/** The plan with these sets; the first is kept as the single set for older readers. */
export function withSets(plan: ShootPlan, sets: string[]): ShootPlan {
  const list = [...new Set(sets.filter(Boolean))].slice(0, 12);
  return { ...plan, sets: list, set: list[0] ?? null };
}

/** Adds the id if it's missing, takes it out if it's there. */
export function toggle(list: readonly string[] | undefined, id: string): string[] {
  const now = list ?? [];
  return now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
}

/** How many things the plan picks, for a badge. */
export function planCount(plan: ShootPlan | undefined | null): number {
  if (!plan) return 0;
  return (
    (plan.talent?.length ?? 0) +
    planSets(plan).length +
    (plan.props?.length ?? 0) +
    (plan.extraProps?.trim() ? 1 : 0)
  );
}

/** The plan as it's saved: only real picks, the extra props trimmed, the sets list and its first set. */
export function tidyPlan(plan: ShootPlan): ShootPlan {
  const sets = planSets(plan);
  const out: ShootPlan = {
    talent: [...new Set(plan.talent ?? [])].slice(0, 12),
    sets,
    set: sets[0] ?? null,
    props: [...new Set(plan.props ?? [])].slice(0, 30),
  };
  const extra = (plan.extraProps ?? "").trim().slice(0, 1000);
  if (extra) out.extraProps = extra;
  return out;
}

/** Two plans pick the same things (order of talent and props aside; the order of sets counts). */
export function samePlan(
  a: ShootPlan | undefined | null,
  b: ShootPlan | undefined | null,
): boolean {
  const x = tidyPlan(a ?? {});
  const y = tidyPlan(b ?? {});
  const same = (p: string[] = [], q: string[] = []) =>
    p.length === q.length && [...p].sort().every((v, i) => v === [...q].sort()[i]);
  return (
    same(x.talent, y.talent) &&
    same(x.props, y.props) &&
    (x.sets ?? []).join() === (y.sets ?? []).join() &&
    (x.extraProps ?? "") === (y.extraProps ?? "")
  );
}

/** The picked choices, in the plan's order, with anything no longer on the list left out. */
export function picked(choices: readonly Choice[], ids: readonly string[] | undefined): Choice[] {
  return (ids ?? []).flatMap((id) => choices.find((c) => c.id === id) ?? []);
}

/** The names a plan picks, for a one-line summary or plain text. */
export function planNames(
  plan: ShootPlan | undefined | null,
  choices: ShootChoices,
): { talent: string[]; sets: string[]; props: string[] } {
  const all = [...choices.sets, ...choices.places];
  return {
    talent: picked(choices.talent, plan?.talent).map((c) => c.name),
    sets: picked(all, planSets(plan)).map((c) => c.name),
    props: [
      ...picked(choices.props, plan?.props).map((c) => c.name),
      ...(plan?.extraProps?.trim() ? [plan.extraProps.trim()] : []),
    ],
  };
}

/** Initials for a face without a photo. */
export function initials(name: string): string {
  return (
    name
      .split(/[\s-]+/)
      .filter((w) => /\p{L}/u.test(w[0] ?? ""))
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "·"
  );
}
