import { locale, t } from "@/lib/i18n";
import type { Template } from "@/lib/wording";

export type Platform = "instagram" | "tiktok" | "facebook" | "youtube" | "other";
export type Checkpoint = 7 | 30;
export const CHECKPOINTS: Checkpoint[] = [7, 30];

export type MetricKey =
  | "spend"
  | "impressions"
  | "views3s"
  | "views15s"
  | "clicks"
  | "purchases"
  | "revenue"
  | "reach"
  | "views"
  | "avgWatch"
  | "completion"
  | "saves"
  | "shares"
  | "comments"
  | "follows";

export type Metrics = Partial<Record<MetricKey, number>>;

export interface PostNumbers {
  day: Checkpoint;
  metrics: Metrics;
  shots: string[];
  note: string;
  enteredBy: string;
  enteredAt: string | null;
  updatedAt: string;
}

export interface Post {
  id: string;
  cutId: string | null;
  title: string;
  platform: Platform;
  paid: boolean;
  link: string;
  liveOn: string;
  press: string;
  fromClient: boolean;
  authorName: string;
  /** The script it came from and the hook it opened with, when someone said so. */
  scriptId?: string | null;
  hookIndex?: number | null;
  numbers: PostNumbers[];
}

/** A script a post can come from, with its hooks as plain words. */
export interface ResultScript {
  id: string;
  title: string;
  style: string;
  hook: number | null;
  hooks: string[];
}

export interface MonthlyRead {
  id: string;
  month: string;
  bestPost: string | null;
  worstPost: string | null;
  bestWhy: string;
  worstWhy: string;
  learned: string[];
  nextTests: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  authorName: string;
  updatedAt: string;
}

export interface ResultsPage {
  team: boolean;
  seesMoney: boolean;
  canAdd: boolean;
  posts: Post[];
  reads: MonthlyRead[];
  cuts: { id: string; title: string }[];
  scripts: ResultScript[];
}

export function normaliseResults(data: unknown): ResultsPage {
  const d = (data ?? {}) as Partial<ResultsPage>;
  return {
    team: Boolean(d.team),
    seesMoney: Boolean(d.seesMoney),
    canAdd: Boolean(d.canAdd),
    posts: (d.posts ?? []).map((p) => ({
      ...p,
      numbers: (p.numbers ?? []).map((n) => ({ ...n, metrics: toNumbers(n.metrics) })),
    })),
    reads: d.reads ?? [],
    cuts: d.cuts ?? [],
    scripts: d.scripts ?? [],
  };
}

function toNumbers(m: unknown): Metrics {
  const out: Metrics = {};
  for (const [k, v] of Object.entries((m ?? {}) as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k as MetricKey] = n;
  }
  return out;
}

/** What gets typed in, per template. `money` fields are only asked of people who see money. */
export interface MetricField {
  key: MetricKey;
  label: [string, string];
  hint?: [string, string];
  money?: boolean;
  /** Seconds, a percentage or a plain count. */
  unit?: "s" | "%";
}

export const FIELDS: Record<Template, MetricField[]> = {
  performance: [
    { key: "spend", label: ["Spend (DT)", "Dépense (DT)"], money: true },
    { key: "impressions", label: ["Impressions", "Impressions"] },
    {
      key: "views3s",
      label: ["3-second views", "Vues de 3 s"],
      hint: ["Meta calls them video plays at 3 s", "« Lectures de 3 s » chez Meta"],
    },
    {
      key: "views15s",
      label: ["Views to 15 s", "Vues jusqu'à 15 s"],
      hint: ["ThruPlays", "ThruPlays"],
    },
    { key: "clicks", label: ["Link clicks", "Clics sur le lien"] },
    { key: "purchases", label: ["Purchases", "Achats"] },
    { key: "revenue", label: ["Sales (DT)", "Ventes (DT)"], money: true },
  ],
  cinematic: [
    { key: "reach", label: ["Reach", "Couverture"] },
    { key: "views", label: ["Views", "Vues"] },
    { key: "avgWatch", label: ["Average watch time", "Durée moyenne de visionnage"], unit: "s" },
    { key: "completion", label: ["Watched to the end", "Vu jusqu'au bout"], unit: "%" },
    { key: "saves", label: ["Saves", "Enregistrements"] },
    { key: "shares", label: ["Shares", "Partages"] },
    { key: "comments", label: ["Comments", "Commentaires"] },
    {
      key: "follows",
      label: ["New followers", "Nouveaux abonnés"],
      hint: ["In the week after it went live", "Dans la semaine qui suit la mise en ligne"],
    },
  ],
};

/** The rates people actually judge a video by, worked out from what was typed in. Null when a part is missing. */
export interface Headline {
  key: string;
  label: string;
  value: number | null;
  /** How to print it. */
  as: "pct" | "money" | "x" | "count" | "s";
  /** Higher is better, except for cost per purchase. */
  lowerIsBetter?: boolean;
}

const ratio = (a: number | undefined, b: number | undefined) =>
  a == null || b == null || b === 0 ? null : a / b;

export function headlines(template: Template, m: Metrics, money: boolean): Headline[] {
  if (template === "cinematic")
    return [
      { key: "reach", label: t("Reach", "Couverture"), value: m.reach ?? null, as: "count" },
      { key: "views", label: t("Views", "Vues"), value: m.views ?? null, as: "count" },
      {
        key: "avgWatch",
        label: t("Avg. watch", "Visionnage moyen"),
        value: m.avgWatch ?? null,
        as: "s",
      },
      {
        key: "completion",
        label: t("To the end", "Jusqu'au bout"),
        value: m.completion == null ? null : m.completion / 100,
        as: "pct",
      },
      {
        key: "keeps",
        label: t("Saves + shares", "Enregistr. + partages"),
        value: m.saves == null && m.shares == null ? null : (m.saves ?? 0) + (m.shares ?? 0),
        as: "count",
      },
      {
        key: "follows",
        label: t("New followers", "Abonnés"),
        value: m.follows ?? null,
        as: "count",
      },
    ];
  const rows: Headline[] = [
    {
      key: "hook",
      label: t("Hook rate", "Taux d'accroche"),
      value: ratio(m.views3s, m.impressions),
      as: "pct",
    },
    {
      key: "hold",
      label: t("Hold rate", "Taux de rétention"),
      value: ratio(m.views15s, m.views3s),
      as: "pct",
    },
    {
      key: "ctr",
      label: t("Click-through", "Taux de clic"),
      value: ratio(m.clicks, m.impressions),
      as: "pct",
    },
    { key: "purchases", label: t("Purchases", "Achats"), value: m.purchases ?? null, as: "count" },
  ];
  if (money)
    rows.push(
      {
        key: "cpp",
        label: t("Cost per purchase", "Coût par achat"),
        value: ratio(m.spend, m.purchases),
        as: "money",
        lowerIsBetter: true,
      },
      { key: "roas", label: "ROAS", value: ratio(m.revenue, m.spend), as: "x" },
    );
  return rows;
}

export function formatHeadline(h: Headline): string {
  if (h.value == null) return "–";
  const n = (v: number, digits = 0) =>
    v.toLocaleString(locale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  switch (h.as) {
    case "pct":
      return `${n(h.value * 100, 1)} %`;
    case "money":
      return `${n(h.value, 2)} DT`;
    case "x":
      return `${n(h.value, 2)}×`;
    case "s":
      return `${n(h.value, 1)} s`;
    default:
      return h.value >= 10_000 ? compact(h.value) : n(h.value);
  }
}

function compact(v: number): string {
  return v.toLocaleString(locale(), { notation: "compact", maximumFractionDigits: 1 });
}

/** The day a checkpoint can be read: 7 or 30 days after the video went live. */
export function dueOn(liveOn: string, day: Checkpoint): string {
  const d = new Date(`${liveOn.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

export type CheckState = "early" | "due" | "shots" | "done";

/** Where a checkpoint stands: too early, due and empty, screenshots waiting to be typed in, or done. */
export function checkState(post: Post, day: Checkpoint, today: string): CheckState {
  const n = post.numbers.find((x) => x.day === day);
  if (n && Object.keys(n.metrics).length > 0) return "done";
  if (n && n.shots.length > 0) return "shots";
  return dueOn(post.liveOn, day) <= today ? "due" : "early";
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const PLATFORMS: [Platform, string][] = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["other", "Other"],
];

export const platformName = (p: Platform) =>
  p === "other" ? t("Elsewhere", "Ailleurs") : (PLATFORMS.find(([k]) => k === p)?.[1] ?? p);

/** "Novembre 2026". */
export function monthName(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const s = d.toLocaleDateString(locale(), { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The first day of the month, as the database keeps it. */
export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

/** The month a read is about: in the first ten days, the month just ended; after that, the one under way. */
export function readMonth(today: string): string {
  const [y, m, d] = today.slice(0, 10).split("-").map(Number) as [number, number, number];
  if (d > 10) return monthStart(today);
  const prev = m === 1 ? [y - 1, 12] : [y, m - 1];
  return `${prev[0]}-${String(prev[1]).padStart(2, "0")}-01`;
}

/** Posts that went live in a month, for picking the best and weakest of it. */
export const postsIn = (posts: Post[], month: string) =>
  posts.filter((p) => p.liveOn.slice(0, 7) === month.slice(0, 7));

/** Things waiting: due checkpoints with nothing in them, and screenshots nobody has typed in. */
export function waiting(posts: Post[], today: string) {
  let due = 0;
  let shots = 0;
  for (const p of posts)
    for (const day of CHECKPOINTS) {
      const s = checkState(p, day, today);
      if (s === "due") due++;
      if (s === "shots") shots++;
    }
  return { due, shots };
}
