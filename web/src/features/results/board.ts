// The results board (Heni, 24 Nov 2026: "a real results page per brand: views, hooks that won, cost per
// result"). Worked out from the 7- and 30-day reads already typed in: totals for a period, a month-by-month
// series, the best videos, which hooks and which kinds of video did best, paid against organic. No new data,
// and nothing estimated: a figure whose parts are missing stays empty.
import type { Template } from "@/lib/wording";
import type { Metrics, Post, ResultsPage } from "./model";

export type Period = "30" | "90" | "365" | "all";

export function bestRead(post: Post) {
  const done = post.numbers.filter((n) => Object.keys(n.metrics).length > 0);
  return done.find((n) => n.day === 30) ?? done.find((n) => n.day === 7) ?? null;
}

export function inPeriod(posts: Post[], period: Period, today: string): Post[] {
  if (period === "all") return posts;
  const from = new Date(`${today}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - Number(period));
  const start = from.toISOString().slice(0, 10);
  return posts.filter((p) => p.liveOn.slice(0, 10) >= start);
}

const sum = (list: Metrics[], k: keyof Metrics) => {
  let total = 0;
  let any = false;
  for (const m of list) {
    const v = m[k];
    if (v != null) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
};
const div = (a: number | null, b: number | null) =>
  a == null || b == null || b === 0 ? null : a / b;

export interface Totals {
  posts: number;
  read: number;
  // Performance
  spend: number | null;
  impressions: number | null;
  views3s: number | null;
  clicks: number | null;
  purchases: number | null;
  revenue: number | null;
  hookRate: number | null;
  ctr: number | null;
  costPerPurchase: number | null;
  roas: number | null;
  cpm: number | null;
  // Cinematic
  reach: number | null;
  views: number | null;
  keeps: number | null;
  follows: number | null;
  /** Share watched to the end, weighted by views. */
  completion: number | null;
  keepsPer1000: number | null;
}

/** Totals over a set of posts, from each post's best read. Rates come from sums, never from averaging rates. */
export function totals(posts: Post[]): Totals {
  const reads = posts.map(bestRead).filter((r): r is NonNullable<typeof r> => r != null);
  const m = reads.map((r) => r.metrics);
  const spend = sum(m, "spend");
  const impressions = sum(m, "impressions");
  const views3s = sum(m, "views3s");
  const clicks = sum(m, "clicks");
  const purchases = sum(m, "purchases");
  const revenue = sum(m, "revenue");
  const views = sum(m, "views");
  const keeps =
    sum(m, "saves") == null && sum(m, "shares") == null
      ? null
      : (sum(m, "saves") ?? 0) + (sum(m, "shares") ?? 0);
  let wSum = 0;
  let w = 0;
  for (const x of m)
    if (x.completion != null && x.views) {
      wSum += x.completion * x.views;
      w += x.views;
    }
  return {
    posts: posts.length,
    read: reads.length,
    spend,
    impressions,
    views3s,
    clicks,
    purchases,
    revenue,
    hookRate: div(views3s, impressions),
    ctr: div(clicks, impressions),
    costPerPurchase: div(spend, purchases),
    roas: div(revenue, spend),
    cpm: spend == null || !impressions ? null : (spend / impressions) * 1000,
    reach: sum(m, "reach"),
    views,
    keeps,
    follows: sum(m, "follows"),
    completion: w ? wSum / w / 100 : null,
    keepsPer1000: keeps == null || !views ? null : (keeps / views) * 1000,
  };
}

export interface MonthPoint {
  month: string;
  value: number;
  posts: number;
}

/** The headline number per month the videos went live: purchases (or 3-second views) for ads, views for films. */
export function byMonth(
  posts: Post[],
  template: Template,
  months = 6,
  today: string,
): MonthPoint[] {
  const out: MonthPoint[] = [];
  const d = new Date(`${today.slice(0, 7)}-15T12:00:00Z`);
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCMonth(x.getUTCMonth() - i);
    const key = x.toISOString().slice(0, 7);
    const these = posts.filter((p) => p.liveOn.slice(0, 7) === key);
    const t = totals(these);
    const value = template === "cinematic" ? (t.views ?? 0) : (t.purchases ?? t.views3s ?? 0);
    out.push({ month: `${key}-01`, value, posts: these.length });
  }
  return out;
}

export interface Ranked {
  post: Post;
  /** The number it's ranked on. */
  score: number;
  /** What the score is, for the label. */
  as: "money" | "x" | "pct" | "count";
  hook: string | null;
  style: string | null;
}

function hookOf(
  post: Post,
  page: Pick<ResultsPage, "scripts">,
): { hook: string | null; style: string | null } {
  const s = post.scriptId ? page.scripts.find((x) => x.id === post.scriptId) : undefined;
  if (!s) return { hook: null, style: null };
  return { hook: s.hooks[post.hookIndex ?? s.hook ?? 0]?.trim() || null, style: s.style || null };
}

/**
 * The best videos. Ads with sales: lowest cost per purchase (needs money) or most purchases. Ads without sales:
 * highest hook rate. Films: most views.
 */
export function leaders(
  posts: Post[],
  page: Pick<ResultsPage, "scripts">,
  template: Template,
  money: boolean,
  max = 5,
): Ranked[] {
  const rows: Ranked[] = [];
  for (const post of posts) {
    const r = bestRead(post);
    if (!r) continue;
    const m = r.metrics;
    let score: number | null = null;
    let as: Ranked["as"] = "count";
    if (template === "cinematic") {
      score = m.views ?? null;
    } else if (money && m.spend && m.purchases) {
      score = m.spend / m.purchases;
      as = "money";
    } else if (m.purchases) {
      score = m.purchases;
    } else if (m.views3s != null && m.impressions) {
      score = m.views3s / m.impressions;
      as = "pct";
    }
    if (score == null) continue;
    rows.push({ post, score, as, ...hookOf(post, page) });
  }
  // Rank within the strongest kind of score there is: cost per purchase beats purchases beats hook rate.
  const order: Ranked["as"][] = template === "cinematic" ? ["count"] : ["money", "count", "pct"];
  const kind = order.find((k) => rows.some((r) => r.as === k));
  return rows
    .filter((r) => r.as === kind)
    .sort((a, b) => (a.as === "money" ? a.score - b.score : b.score - a.score))
    .slice(0, max);
}

export interface Split {
  key: string;
  posts: number;
  /** The rate that judges the group: hook rate for ads, completion for films. */
  rate: number | null;
  /** Cost per purchase for ads (when money is seen), views for films. */
  second: number | null;
}

/** Groups (paid vs organic, platform, kind of video) with the same rates as the totals, so they compare. */
export function splitBy(
  posts: Post[],
  keyOf: (p: Post) => string | null,
  template: Template,
): Split[] {
  const groups = new Map<string, Post[]>();
  for (const p of posts) {
    const k = keyOf(p);
    if (!k || !bestRead(p)) continue;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const t = totals(list);
      return template === "cinematic"
        ? { key, posts: list.length, rate: t.completion, second: t.views }
        : { key, posts: list.length, rate: t.hookRate, second: t.costPerPurchase };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

export const styleOf = (page: Pick<ResultsPage, "scripts">) => (p: Post) =>
  (p.scriptId && page.scripts.find((s) => s.id === p.scriptId)?.style) || null;
