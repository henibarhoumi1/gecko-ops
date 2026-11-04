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
