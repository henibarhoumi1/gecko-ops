// The studio at a glance, for the top of Home (Heni, 21 Nov 2026: "one dashboard; the CEO just sees more").
// Pure functions over data the app already loads: leads, clients, shoots and tasks. No new tables.
import { isOpen, type Lead } from "@/features/pipeline/model";

export interface PulseLead {
  stage: Lead["stage"];
  value: number | null;
  next_date: string | null;
  history: { at: string; stage: string }[];
  created_at: string;
}

export interface PulseShoot {
  day: string;
}

export interface PulseTask {
  side: "gecko" | "client";
  due: string | null;
  doneAt: string | null;
}

export interface Tile {
  key: string;
  label: string;
  value: string;
  hint: string;
  to: string;
  /** "alert" when something needs doing now. */
  tone: "plain" | "alert" | "good";
}

const WON = new Set(["won", "signed", "accepted"]);

const dayDiff = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );

/** "12 400" with a thin space, as Tunisian invoices write it. */
export function money(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** When a lead reached a won stage, from its history; null if it never did. */
export function wonAt(lead: Pick<PulseLead, "stage" | "history">): string | null {
  const hit = [...(lead.history ?? [])].reverse().find((h) => WON.has(h.stage));
  return hit ? hit.at.slice(0, 10) : null;
}

export interface PulseInput {
  today: string;
  leads: PulseLead[];
  activeClients: number;
  shoots: PulseShoot[];
  tasks: PulseTask[];
}

export function pulse({ today, leads, activeClients, shoots, tasks }: PulseInput): Tile[] {
  const open = leads.filter((l) => isOpen(l.stage));
  const pipeValue = open.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const due = open.filter((l) => l.next_date && l.next_date <= today).length;
  const month = today.slice(0, 7);
  const wonThisMonth = leads.filter((l) => wonAt(l)?.startsWith(month));
  const wonValue = wonThisMonth.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const newThisWeek = leads.filter((l) => {
    const d = dayDiff(l.created_at, today);
    return d >= 0 && d < 7;
  }).length;
  const week = shoots.filter((s) => {
    const d = dayDiff(today, s.day);
    return d >= 0 && d < 7;
  }).length;
  const ours = tasks.filter((t) => t.side === "gecko" && !t.doneAt);
  const late = ours.filter((t) => t.due && t.due < today).length;
  return [
    {
      key: "pipeline",
      label: "Open pipeline",
      value: `${money(pipeValue)} DT`,
      hint: `${open.length} open ${open.length === 1 ? "lead" : "leads"}`,
      to: "/pipeline",
      tone: "plain",
    },
    {
      key: "won",
      label: "Won this month",
      value: `${money(wonValue)} DT`,
      hint: `${wonThisMonth.length} ${wonThisMonth.length === 1 ? "deal" : "deals"}`,
      to: "/pipeline",
      tone: wonThisMonth.length ? "good" : "plain",
    },
    {
      key: "follow",
      label: "Follow-ups due",
      value: String(due),
      hint: due ? "Write to them today" : "Nobody waiting on you",
      to: "/pipeline?view=outreach",
      tone: due ? "alert" : "plain",
    },
    {
      key: "new",
      label: "New leads, 7 days",
      value: String(newThisWeek),
      hint: "From the site and outreach",
      to: "/pipeline",
      tone: "plain",
    },
    {
      key: "clients",
      label: "Active clients",
      value: String(activeClients),
      hint: `${week} ${week === 1 ? "shoot" : "shoots"} this week`,
      to: "/clients",
      tone: "plain",
    },
    {
      key: "tasks",
      label: "Team tasks",
      value: String(ours.length),
      hint: late ? `${late} late` : "None late",
      to: "/today#tasks",
      tone: late ? "alert" : "plain",
    },
  ];
}

/** "Good morning", "Good afternoon" or "Good evening" for an hour of the day. */
export function greeting(hour: number): string {
  if (hour < 5 || hour >= 18) return "Good evening";
  if (hour < 12) return "Good morning";
  return "Good afternoon";
}
