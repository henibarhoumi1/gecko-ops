/** Lead stages as the database stores them. Older, finer stages still exist on some leads. */
export const STAGES = [
  "prospect",
  "contacted",
  "conversation",
  "meeting_booked",
  "qualified",
  "proposal_sent",
  "negotiation",
  "accepted",
  "signed",
  "won",
  "lost",
  "nurture",
] as const;
export type Stage = (typeof STAGES)[number];

/** The five columns of the board, then the three outcomes. */
export const STEPS = [
  "prospect",
  "contacted",
  "meeting_booked",
  "proposal_sent",
  "signed",
] as const;
export type Step = (typeof STEPS)[number];
export const OUTCOMES = ["won", "lost", "nurture"] as const;
export type Outcome = (typeof OUTCOMES)[number];

const STEP_OF: Record<Stage, Step | Outcome> = {
  prospect: "prospect",
  contacted: "contacted",
  conversation: "contacted",
  meeting_booked: "meeting_booked",
  qualified: "meeting_booked",
  proposal_sent: "proposal_sent",
  negotiation: "proposal_sent",
  accepted: "proposal_sent",
  signed: "signed",
  won: "won",
  lost: "lost",
  nurture: "nurture",
};

export const STAGE_LABEL: Record<Step | Outcome, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  proposal_sent: "Proposal sent",
  signed: "Signed",
  won: "Won",
  lost: "Lost",
  nurture: "Later",
};

export const CHANNELS: Record<string, string> = {
  ig_organic: "Instagram organic",
  tiktok_organic: "TikTok organic",
  ig_ads: "Instagram ads",
  tiktok_ads: "TikTok ads",
  website_form: "Website form",
  referral_client: "Client referral",
  referral_personal: "Personal network",
  outbound_dm: "Outbound DM",
  outbound_visit: "Outbound visit",
  outbound_email: "Outbound email",
  event: "Event",
  international_platform: "International platform",
  other: "Other",
};

export const LOST_REASONS: Record<string, string> = {
  price: "Price",
  no_budget_now: "No budget now",
  no_response: "Never replied",
  chose_competitor: "Chose someone else",
  doing_it_in_house: "Doing it in house",
  bad_fit: "Not a fit",
  timing: "Timing",
  decision_maker_said_no: "Decision maker said no",
  other: "Other",
};

export interface Lead {
  workspace_id: string;
  id: string;
  brand: string;
  stage: Stage;
  channel: string | null;
  contact: string | null;
  handle: string | null;
  phone: string | null;
  whatsapp: string | null;
  url: string | null;
  sector: string | null;
  pack: string | null;
  value: number | null;
  client_id: string | null;
  owner_member_id: string | null;
  next_step: string | null;
  next_date: string | null;
  lost_reason: string | null;
  history: { at: string; stage: string }[];
  created_at: string;
  updated_at: string;
}

export function stepOf(stage: Stage): Step | Outcome {
  return STEP_OF[stage];
}

export function isOpen(stage: Stage): boolean {
  return !(OUTCOMES as readonly string[]).includes(stage);
}

export type Gap = "owner" | "next" | "date";
export const GAP_LABEL: Record<Gap, string> = {
  owner: "no owner",
  next: "no next step",
  date: "no date",
};
const GAP_ASK: Record<Gap, string> = { owner: "an owner", next: "a next step", date: "a date" };

/** "Add an owner, a next step and a date so this lead can't go quiet." */
export function gapMessage(missing: Gap[]): string {
  const asks = missing.map((g) => GAP_ASK[g]);
  const list = asks.length > 1 ? `${asks.slice(0, -1).join(", ")} and ${asks.at(-1)}` : asks[0];
  return `Add ${list} so this lead can't go quiet.`;
}

/** An open lead must always have an owner, a next step and a date, so it can't go quiet. */
export function gaps(
  lead: Pick<Lead, "stage" | "owner_member_id" | "next_step" | "next_date">,
  memberIds: ReadonlySet<string>,
): Gap[] {
  if (!isOpen(lead.stage)) return [];
  const missing: Gap[] = [];
  if (!lead.owner_member_id || !memberIds.has(lead.owner_member_id)) missing.push("owner");
  if (!lead.next_step?.trim()) missing.push("next");
  if (!lead.next_date) missing.push("date");
  return missing;
}

/** Soonest follow-up first; leads with no date sink to the bottom. */
export function byNextDate(a: Lead, b: Lead): number {
  if (a.next_date === b.next_date) return a.brand.localeCompare(b.brand);
  if (!a.next_date) return 1;
  if (!b.next_date) return -1;
  return a.next_date.localeCompare(b.next_date);
}

export function isOverdue(lead: Pick<Lead, "stage" | "next_date">, today: string): boolean {
  return isOpen(lead.stage) && !!lead.next_date && lead.next_date < today;
}
