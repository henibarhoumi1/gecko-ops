// The outreach session (Heni, 21 Nov 2026: "lead generation and outreach needs to actually work"): one lead at a
// time, the message ready, one click to send it and the next lead comes up. A daily goal, a streak and the team's
// count keep it a game. Everything is read from the leads' own log; nothing new is stored but who sent each touch.
import type { LeadPatch } from "./leadsApi";
import { isOpen, stepOf, type Lead, type Stage } from "./model";
import { addDays, afterSend, touches, type Channel, type Moment } from "./outreach";

export type Scope = "mine" | "all";

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Who a lead waits on: the leads due today or late, then fresh prospects nobody has written to yet. */
export function queue(
  leads: readonly Lead[],
  today: string,
  me: string | null,
  scope: Scope,
): Lead[] {
  const mineOrFree = (l: Lead) => scope === "all" || !l.owner_member_id || l.owner_member_id === me;
  const due = leads.filter(
    (l) => isOpen(l.stage) && mineOrFree(l) && (!l.next_date || l.next_date <= today),
  );
  const rank = (l: Lead) => {
    if (l.next_date && l.next_date < today) return 0; // late
    if (l.next_date === today) return 1; // due today
    if (stepOf(l.stage) !== "prospect") return 2; // in a conversation, no date
    return 3; // never written to
  };
  return [...due].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.next_date ?? "").localeCompare(b.next_date ?? "") ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** Every touch sent on a given day, with who sent it when the log knows. */
export function touchesOn(leads: readonly Lead[], day: string): { by: string | null }[] {
  const out: { by: string | null }[] = [];
  for (const l of leads) {
    const list = Array.isArray(l.log) ? l.log : [];
    for (const v of list) {
      const o = obj(v);
      const at = typeof o.at === "string" ? o.at : "";
      if (at.slice(0, 10) === day) out.push({ by: typeof o.by === "string" ? o.by : null });
    }
  }
  return out;
}

/** Days in a row, ending today or yesterday, with at least one touch sent. */
export function streak(leads: readonly Lead[], today: string): number {
  const days = new Set<string>();
  for (const l of leads) for (const t of touches(l)) if (t.at) days.add(t.at.slice(0, 10));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export interface Score {
  team: number;
  mine: number;
  streak: number;
  /** Replies and booked meetings this week: what the touches are for. */
  wins: number;
}

export function score(leads: readonly Lead[], today: string, me: string | null): Score {
  const sent = touchesOn(leads, today);
  const weekAgo = addDays(today, -6);
  const wins = leads.filter((l) =>
    (l.history ?? []).some(
      (h) =>
        h.at.slice(0, 10) >= weekAgo &&
        ["conversation", "meeting_booked", "qualified", "proposal_sent", "won", "signed"].includes(
          h.stage,
        ),
    ),
  ).length;
  return {
    team: sent.length,
    mine: me ? sent.filter((t) => t.by === me).length : 0,
    streak: streak(leads, today),
    wins,
  };
}

/** Sending: what afterSend changes, with who sent it on the log entry. */
export function sent(
  lead: Lead,
  moment: Moment,
  channel: Channel,
  text: string,
  now: string,
  me: string | null,
) {
  const next = afterSend(lead, moment, channel, text, now, me);
  const log = [...(next.log ?? [])];
  const last = obj(log[log.length - 1]);
  log[log.length - 1] = { ...last, by: me };
  return { ...next, log };
}

/** They answered: the lead moves to a conversation and the next step is to reply, today. */
export function replied(lead: Lead, today: string, me: string | null): LeadPatch {
  const history = Array.isArray(lead.history) ? lead.history : [];
  const stage: Stage = stepOf(lead.stage) === "prospect" ? "conversation" : lead.stage;
  return {
    stage,
    history: stage !== lead.stage ? [...history, { at: today, stage }] : history,
    next_step: "Reply and book a call",
    next_date: today,
    owner_member_id: lead.owner_member_id ?? me,
  };
}

/** Not now: back in the queue on another day. */
export function later(lead: Lead, today: string, days = 1): LeadPatch {
  return { next_date: addDays(today, days), next_step: lead.next_step || "First message" };
}

/** Not a fit: closed as lost with a reason, out of every queue. */
export function notAFit(lead: Lead, today: string, reason: string): LeadPatch {
  const history = Array.isArray(lead.history) ? lead.history : [];
  return {
    stage: "lost",
    lost_reason: reason,
    history: [...history, { at: today, stage: "lost" }],
    next_date: null,
  };
}

/** The Instagram page of a handle, or null when there's none. */
export function instagramUrl(handle: string | null): string | null {
  const h = (handle ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  const clean = h.split(/[/?#]/)[0];
  return clean && /^[\w.]{1,40}$/.test(clean) ? `https://instagram.com/${clean}` : null;
}

/** A WhatsApp link with the message filled in, or null without a number. */
export function whatsappUrl(number: string | null, text: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const full = digits.length === 8 ? `216${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
