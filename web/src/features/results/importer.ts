import type { MetricKey, Metrics, Platform, Post } from "./model";

/**
 * Numbers from the exports people already have, with no paid keys: Ads Manager, Instagram / Meta
 * Business Suite, TikTok Studio, and Shopify or WooCommerce orders. Paste or drop the CSV; each row
 * is matched to a post by its link, its Gecko tag, or its title, and shown before anything is saved.
 */

// ---------- CSV ----------

/** Reads CSV (commas, semicolons or tabs, quoted cells, a BOM) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const sep = counts.sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

/** Lower case, no accents, single spaces. */
export const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * A number as exports write it: "1,234", "1 234,5", "12.5%", "TND 120.00", "0:12" (minutes:seconds).
 * Null when it isn't one.
 */
export function readNumber(raw: string): number | null {
  const s = raw.replace(/[\s  ]/g, "");
  if (!s || s === "-" || s === "--") return null;
  const clock = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (clock) {
    const [a, b, c] = [Number(clock[1]), Number(clock[2]), clock[3] ? Number(clock[3]) : null];
    return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  }
  let n = s.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(n)) return null;
  const dot = n.lastIndexOf(".");
  const comma = n.lastIndexOf(",");
  if (dot >= 0 && comma >= 0) {
    // The last one is the decimal mark.
    n = dot > comma ? n.replace(/,/g, "") : n.replace(/\./g, "").replace(",", ".");
  } else if (comma >= 0) {
    // "1,234" is a thousand; "12,5" is twelve and a half.
    n =
      /,\d{3}$/.test(n) && n.split(",").length >= 2 && !/^-?0,/.test(n)
        ? n.replace(/,/g, "")
        : n.replace(",", ".");
  } else if ((n.match(/\./g) ?? []).length > 1) n = n.replace(/\./g, "");
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

// ---------- which column is what ----------

const METRIC_HEADERS: [MetricKey, RegExp][] = [
  [
    "revenue",
    /purchases? conversion value|valeur de conversion des achats|^revenue$|^sales$|chiffre d'affaires/,
  ],
  ["spend", /amount spent|montant depense|^spend|^depense|cost$/],
  [
    "views3s",
    /3.?sec(ond)?s? video plays|lectures de video de 3 s|3s (video )?views|video plays at 3/,
  ],
  ["views15s", /thruplays?|lectures thruplay|15.?sec(ond)?s? (video )?(plays|views)/],
  ["clicks", /link clicks|clics sur (un|le|les) liens?|^clicks$|^clics$/],
  ["purchases", /^(website )?purchases$|^achats( sur le site)?$|^conversions$/],
  ["impressions", /^impressions$/],
  ["reach", /^reach$|^couverture$|accounts reached|comptes touches/],
  ["avgWatch", /average (watch|view) time|duree moyenne|avg\.? watch|temps de visionnage moyen/],
  ["completion", /watched full video|full video (watch|view) rate|completion|vu en entier/],
  ["views", /^(total )?(video )?(views|vues|plays|lectures)$/],
  ["saves", /^(total )?(saves|enregistrements|favorites)$/],
  ["shares", /^(total )?(shares|partages)$/],
  ["comments", /^(total )?(comments|commentaires)$/],
  ["follows", /^follows$|new followers|followers gained|nouveaux abonnes|^abonnements$/],
];

const NAME_HEADER =
  /^(ad name|nom de la publicite|description|video title|title|titre|caption|legende|post|publication)$/;
const LINK_HEADER = /permalink|^(video |post )?link$|^(lien|url|video link|lien de la video)$/;
const ORDER_ID =
  /^(name|order|order id|order number|order #|commande|numero de commande|n° de commande|id)$/;
const ORDER_TOTAL = /^(total|order total|total \(.*\)|montant total|total de la commande)$/;

export type ExportKind = "metrics" | "orders" | "unknown";

export interface ExportColumns {
  kind: ExportKind;
  name: number;
  link: number;
  metrics: [MetricKey, number][];
  orderId: number;
  total: number;
}

export function readHeaders(headers: string[]): ExportColumns {
  const h = headers.map(fold);
  const used = new Set<number>();
  const metrics: [MetricKey, number][] = [];
  for (const [key, re] of METRIC_HEADERS) {
    const i = h.findIndex((x, n) => !used.has(n) && re.test(x));
    if (i >= 0) {
      used.add(i);
      metrics.push([key, i]);
    }
  }
  const name = h.findIndex((x) => NAME_HEADER.test(x));
  const link = h.findIndex((x) => LINK_HEADER.test(x));
  const total = h.findIndex((x) => ORDER_TOTAL.test(x));
  const orderId = h.findIndex((x) => ORDER_ID.test(x));
  const kind: ExportKind =
    metrics.length >= 2 && (name >= 0 || link >= 0)
      ? "metrics"
      : total >= 0 && orderId >= 0
        ? "orders"
        : "unknown";
  return { kind, name, link, metrics, orderId, total };
}

// ---------- matching rows to posts ----------

/** The short tag a post's links carry (utm_content), the same every time for the same post. */
export const tagCode = (postId: string) =>
  `gk${postId.replace(/-/g, "").slice(0, 6).toLowerCase()}`;

/**
 * The client's site with Gecko's tags, for the link in bio, the story or the ad, so orders can be
 * traced back to the post.
 */
export function taggedLink(
  site: string,
  post: Pick<Post, "id" | "platform" | "paid">,
): string | null {
  let raw = site.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!url.hostname.includes(".")) return null;
  url.searchParams.set("utm_source", post.platform as Platform);
  url.searchParams.set("utm_medium", post.paid ? "paid" : "social");
  url.searchParams.set("utm_campaign", "gecko");
  url.searchParams.set("utm_content", tagCode(post.id));
  return url.toString();
}

/** The part of a post link that names it: the Instagram code, the TikTok video id, or the clean URL. */
export function linkKey(link: string): string {
  const s = link.trim().toLowerCase();
  if (!s) return "";
  const ig = /instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([^/?#]+)/.exec(s);
  if (ig) return `ig:${ig[1]}`;
  const tt = /tiktok\.com\/.*video\/(\d+)/.exec(s);
  if (tt) return `tt:${tt[1]}`;
  const fb = /facebook\.com\/.*(?:videos|reel|posts)\/([^/?#]+)/.exec(s);
  if (fb) return `fb:${fb[1]}`;
  const yt = /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=))([\w-]+)/.exec(s);
  if (yt) return `yt:${yt[1]}`;
  return s
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

const words = (s: string) =>
  new Set(
    fold(s)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3),
  );

/** How much two titles share, 0 to 1, against the shorter one. */
export function likeness(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size);
}

export type MatchedBy = "link" | "tag" | "title" | null;

export function matchPost(
  row: { label: string; link: string },
  posts: readonly Pick<Post, "id" | "title" | "link">[],
): { postId: string | null; by: MatchedBy } {
  const key = linkKey(row.link);
  if (key) {
    const hit = posts.find((p) => p.link && linkKey(p.link) === key);
    if (hit) return { postId: hit.id, by: "link" };
  }
  const hay = fold(`${row.label} ${row.link}`);
  const tagged = posts.find((p) => hay.includes(tagCode(p.id)));
  if (tagged) return { postId: tagged.id, by: "tag" };
  let best: { id: string; score: number } | null = null;
  for (const p of posts) {
    const score = likeness(row.label, p.title);
    if (score >= 0.5 && (!best || score > best.score)) best = { id: p.id, score };
  }
  return best ? { postId: best.id, by: "title" } : { postId: null, by: null };
}

// ---------- reading a whole export ----------

export interface ImportRow {
  label: string;
  link: string;
  metrics: Metrics;
  postId: string | null;
  by: MatchedBy;
}

export interface ImportResult {
  kind: ExportKind;
  rows: ImportRow[];
  /** Orders: how many were read and how many carried no Gecko tag. */
  orders?: { read: number; untagged: number };
}

// Averages, not totals, when the same ad comes in several rows (one per day).
const AVERAGED: MetricKey[] = ["avgWatch", "completion"];

export function readExport(
  text: string,
  posts: readonly Pick<Post, "id" | "title" | "link">[],
): ImportResult {
  const table = parseCsv(text);
  // Some exports put a title line or two above the headers: start at the first line that reads as one.
  let start = 0;
  let cols = readHeaders(table[0] ?? []);
  for (let i = 1; i < Math.min(table.length, 6) && cols.kind === "unknown"; i++) {
    const next = readHeaders(table[i]!);
    if (next.kind !== "unknown") {
      start = i;
      cols = next;
    }
  }
  const body = table.slice(start + 1);
  if (cols.kind === "orders") return readOrders(body, cols, posts);
  if (cols.kind === "unknown") return { kind: "unknown", rows: [] };

  const byName = new Map<string, { label: string; link: string; metrics: Metrics; n: number }>();
  for (const r of body) {
    const label = cols.name >= 0 ? (r[cols.name] ?? "") : "";
    const link = cols.link >= 0 ? (r[cols.link] ?? "") : "";
    if (!label && !link) continue;
    // Totals and notes at the bottom of Ads Manager exports.
    if (/^(total|results from|resultats de)\b/i.test(fold(label)) && !link) continue;
    const id = link ? linkKey(link) : fold(label);
    const entry = byName.get(id) ?? { label, link, metrics: {}, n: 0 };
    entry.n++;
    for (const [key, i] of cols.metrics) {
      const v = readNumber(r[i] ?? "");
      if (v === null || v < 0) continue;
      entry.metrics[key] = (entry.metrics[key] ?? 0) + v;
    }
    byName.set(id, entry);
  }
  const rows: ImportRow[] = [...byName.values()].map((e) => {
    const metrics: Metrics = {};
    for (const [k, v] of Object.entries(e.metrics) as [MetricKey, number][]) {
      const value = AVERAGED.includes(k) ? v / e.n : v;
      metrics[k] = Math.round(value * 100) / 100;
    }
    return { label: e.label || e.link, link: e.link, metrics, ...matchPost(e, posts) };
  });
  return { kind: "metrics", rows: rows.filter((r) => Object.keys(r.metrics).length > 0) };
}

/** Orders: count the ones whose row carries a post's Gecko tag (in its landing page, source or code). */
function readOrders(
  body: string[][],
  cols: ExportColumns,
  posts: readonly Pick<Post, "id" | "title" | "link">[],
): ImportResult {
  const seen = new Set<string>();
  const per = new Map<string, Metrics>();
  let read = 0;
  let untagged = 0;
  for (const r of body) {
    const id = r[cols.orderId] ?? "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    read++;
    const hay = fold(r.join(" "));
    const post = posts.find((p) => hay.includes(tagCode(p.id)));
    if (!post) {
      untagged++;
      continue;
    }
    const m = per.get(post.id) ?? { purchases: 0, revenue: 0 };
    m.purchases = (m.purchases ?? 0) + 1;
    m.revenue = Math.round(((m.revenue ?? 0) + (readNumber(r[cols.total] ?? "") ?? 0)) * 100) / 100;
    per.set(post.id, m);
  }
  const rows: ImportRow[] = [...per.entries()].map(([postId, metrics]) => ({
    label: posts.find((p) => p.id === postId)!.title,
    link: "",
    metrics,
    postId,
    by: "tag",
  }));
  return { kind: "orders", rows, orders: { read, untagged } };
}

/** What gets saved: the imported numbers over what was already there for that checkpoint. */
export const mergeMetrics = (before: Metrics, imported: Metrics): Metrics => ({
  ...before,
  ...imported,
});
