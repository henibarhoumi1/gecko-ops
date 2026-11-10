// Plain-language rules for the Today screen, kept apart from the page so they can be tested.

import type { Waiting } from "@/features/clients/messages";

export type Part = "concept" | "script" | "cut" | "production" | "request" | "invoice";

export interface UsItem {
  client_id: string;
  brand: string;
  part: Part;
  id: string;
  title: string;
  why: "changes" | "comment" | "idea" | "suggested" | "request";
  at: string;
  body: string | null;
}

export interface ClientItem {
  client_id: string;
  brand: string;
  part: Part;
  id: string;
  title: string;
  at: string;
  due: string | null;
}

export interface DateItem {
  client_id: string | null;
  brand: string;
  kind: "shoot" | "drafts" | "milestone" | "invoice" | "lead";
  label: string;
  date: string;
}

export interface Today {
  today: string;
  us: UsItem[];
  client: ClientItem[];
  dates: DateItem[];
  leads: { id: string; at: string; brand: string; form: string | null; person: string | null }[];
  problems: number;
}

const DAY = 86_400_000;

/** Whole days between an ISO time and now (0 for today). */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
}

/** "today", "1 day", "4 days". */
export function waited(days: number): string {
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

/** Days from `today` (YYYY-MM-DD) to `date` (YYYY-MM-DD). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
}

/** "Today", "Tomorrow", "In 3 days", "Yesterday", "4 days ago". */
export function when(date: string, today: string): string {
  const d = daysUntil(date, today);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return d > 0 ? `In ${d} days` : `${-d} days ago`;
}

/** "Thu 19 Nov". */
export function shortDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const PART: Record<Part, string> = {
  concept: "Idea",
  script: "Script",
  cut: "Video",
  production: "Shoot option",
  request: "Request",
  invoice: "Invoice",
};

export const partName = (part: Part) => PART[part] ?? part;

const WHY: Record<UsItem["why"], string> = {
  changes: "asked for changes",
  comment: "commented, no reply yet",
  idea: "suggested an idea",
  suggested: "suggested a shoot option",
  request: "asked for something",
};

export const whyText = (why: UsItem["why"]) => WHY[why] ?? why;

/** Where in the client's page the item lives. */
export function linkFor(item: { client_id: string; part: Part; id: string }): string {
  const base = `/clients/${encodeURIComponent(item.client_id)}`;
  switch (item.part) {
    case "concept":
      return `${base}/concepts`;
    case "script":
      return `${base}/scripts`;
    case "cut":
      return `${base}/review`;
    case "production":
      return `${base}/production`;
    case "request":
      return `${base}/shared`;
    case "invoice":
      return `${base}/money/${encodeURIComponent(item.id)}`;
  }
}

export interface ClientGroup {
  client_id: string;
  brand: string;
  items: ClientItem[];
  oldest: string;
  waiting: Waiting;
}

/** Waiting-on-client items per brand, the longest wait first, with the counts for a WhatsApp nudge. */
export function byClient(items: ClientItem[]): ClientGroup[] {
  const groups = new Map<string, ClientGroup>();
  for (const item of items) {
    const g = groups.get(item.client_id) ?? {
      client_id: item.client_id,
      brand: item.brand,
      items: [],
      oldest: item.at,
      waiting: { ideas: 0, scripts: 0, cuts: 0, options: 0 },
    };
    g.items.push(item);
    if (item.at < g.oldest) g.oldest = item.at;
    if (item.part === "concept") g.waiting.ideas += 1;
    if (item.part === "script") g.waiting.scripts += 1;
    if (item.part === "cut") g.waiting.cuts = (g.waiting.cuts ?? 0) + 1;
    if (item.part === "production") g.waiting.options = (g.waiting.options ?? 0) + 1;
    groups.set(item.client_id, g);
  }
  return [...groups.values()].sort((a, b) => a.oldest.localeCompare(b.oldest));
}

/** True when the creative part (not invoices) has something a nudge can name. */
export const hasCreative = (w: Waiting) =>
  w.ideas + w.scripts + (w.cuts ?? 0) + (w.options ?? 0) > 0;

/** Dates split into what slipped (past, still open) and what is coming. */
export function splitDates(dates: DateItem[], today: string) {
  const late = dates.filter(
    (d) => daysUntil(d.date, today) < 0 && d.kind !== "shoot" && d.kind !== "drafts",
  );
  const coming = dates.filter((d) => daysUntil(d.date, today) >= 0);
  return { late, coming };
}

/** One line at the top: how the day looks. */
export function headline(t: Pick<Today, "us" | "client" | "dates" | "today">): string {
  const due = t.dates.filter((d) => daysUntil(d.date, t.today) === 0).length;
  const parts = [
    t.us.length > 0 && `${t.us.length} ${t.us.length === 1 ? "thing" : "things"} waiting on you`,
    t.client.length > 0 && `${t.client.length} waiting on clients`,
    due > 0 && `${due} due today`,
  ].filter(Boolean);
  return parts.length === 0 ? "Nothing waiting. A clear day." : `${parts.join(" · ")}.`;
}

// ---------- V1: one line per client, a week strip, the leads to touch ----------

const PLURAL: Record<Part, [string, string]> = {
  concept: ["idea", "ideas"],
  script: ["script", "scripts"],
  cut: ["video", "videos"],
  production: ["shoot option", "shoot options"],
  request: ["request", "requests"],
  invoice: ["invoice", "invoices"],
};

/** "8 ideas, 1 script": what a list of items is, counted by kind, biggest first. */
export function summarise(items: readonly { part: Part }[]): string {
  const counts = new Map<Part, number>();
  for (const i of items) counts.set(i.part, (counts.get(i.part) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([part, n]) => `${n} ${PLURAL[part][n === 1 ? 0 : 1]}`)
    .join(", ");
}

export interface UsGroup {
  client_id: string;
  brand: string;
  items: UsItem[];
  oldest: string;
}

/** Waiting-on-you items per brand, the longest wait first. */
export function groupUs(items: readonly UsItem[]): UsGroup[] {
  const groups = new Map<string, UsGroup>();
  for (const item of items) {
    const g = groups.get(item.client_id) ?? {
      client_id: item.client_id,
      brand: item.brand,
      items: [],
      oldest: item.at,
    };
    g.items.push(item);
    if (item.at < g.oldest) g.oldest = item.at;
    groups.set(item.client_id, g);
  }
  return [...groups.values()].sort((a, b) => a.oldest.localeCompare(b.oldest));
}

/** A shoot day from the Shoot Day pages, as the week strip needs it. */
export interface ShootDate {
  id: string;
  clientId: string;
  brand: string;
  day: string;
  title: string;
  callTime: string | null;
  reels: number;
  done: number;
}

export interface WeekEntry {
  kind: DateItem["kind"];
  brand: string;
  label: string;
  to: string;
}

export interface WeekDay {
  date: string;
  entries: WeekEntry[];
}

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * The next seven days, each with its shoots, deadlines, invoices and follow-ups. A shoot day page
 * replaces the shoot date written in the client's Overview for the same brand and day.
 */
export function weekStrip(
  today: string,
  dates: readonly DateItem[],
  shoots: readonly ShootDate[],
): WeekDay[] {
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
    date: plusDays(today, i),
    entries: [],
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const s of shoots) {
    byDate.get(s.day)?.entries.push({
      kind: "shoot",
      brand: s.brand,
      label: [
        s.title || "Shoot",
        s.callTime && `call ${s.callTime}`,
        s.reels ? `${s.done}/${s.reels} shot` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      to: `/shoots/${encodeURIComponent(s.clientId)}/${s.id}`,
    });
  }
  for (const d of dates) {
    const day = byDate.get(d.date);
    if (!day) continue;
    if (d.kind === "shoot" && shoots.some((s) => s.day === d.date && s.clientId === d.client_id))
      continue;
    day.entries.push({
      kind: d.kind,
      brand: d.brand,
      label: d.label,
      to: d.client_id ? `/clients/${encodeURIComponent(d.client_id)}` : "/pipeline",
    });
  }
  return days;
}

/** The next shoot from today on: the one to get ready for. */
export function nextShoot<T extends { day: string; callTime: string | null }>(
  shoots: readonly T[],
  today: string,
): T | null {
  return (
    [...shoots]
      .filter((s) => s.day >= today)
      .sort(
        (a, b) => a.day.localeCompare(b.day) || (a.callTime ?? "").localeCompare(b.callTime ?? ""),
      )[0] ?? null
  );
}

/** Open leads whose follow-up is due today or late, the latest first. Leads with no date count as due. */
export function dueLeads<T extends { stage: string; next_date: string | null; brand: string }>(
  leads: readonly T[],
  today: string,
): T[] {
  const open = (s: string) => !["won", "lost", "nurture"].includes(s);
  return leads
    .filter((l) => open(l.stage) && (!l.next_date || l.next_date <= today))
    .sort(
      (a, b) =>
        (a.next_date ?? today).localeCompare(b.next_date ?? today) ||
        a.brand.localeCompare(b.brand),
    );
}

/**
 * Quick capture: "idea Dany: the mother-in-law inspects the house" or "lead @crush__cookies".
 * Without a keyword, the text is an idea when a client is picked, else a lead.
 */
export function parseCapture(
  text: string,
  clients: readonly { id: string; brand: string }[],
):
  | { kind: "idea"; clientId: string | null; title: string; body: string }
  | { kind: "lead"; text: string }
  | null {
  const raw = text.trim();
  if (!raw) return null;
  const lead = /^lead\s*:?\s+(.+)$/i.exec(raw);
  if (lead) return { kind: "lead", text: lead[1]!.trim() };
  const idea = /^idea\s+(.+?)\s*:\s*(.+)$/i.exec(raw);
  if (idea) {
    const who = idea[1]!.trim().toLowerCase();
    const client =
      clients.find((c) => c.brand.toLowerCase() === who) ??
      clients.find((c) => c.brand.toLowerCase().startsWith(who)) ??
      clients.find((c) => c.brand.toLowerCase().includes(who));
    return { kind: "idea", clientId: client?.id ?? null, ...splitIdea(idea[2]!) };
  }
  return { kind: "idea", clientId: null, ...splitIdea(raw.replace(/^idea\s*:?\s*/i, "")) };
}

/** The first sentence is the title (160 characters at most); the rest is the body. */
function splitIdea(text: string): { title: string; body: string } {
  const t = text.trim();
  const cut = /^(.{1,160}?[.!?])\s+(.+)$/s.exec(t);
  if (cut) return { title: cut[1]!, body: cut[2]! };
  if (t.length <= 160) return { title: t, body: "" };
  return { title: `${t.slice(0, 157)}…`, body: t };
}
