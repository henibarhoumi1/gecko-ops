// The growth tools (Heni, 24 Nov 2026: "more advanced, real, technical, aligned with how the platforms rank in
// 2026–27"). Pure functions, kept here so they can be tested; the screens are in GrowthTools.tsx.
//
// What they lean on, and how sure we are:
// - Meta ads (Andromeda retrieval, Advantage+): creative is the targeting now. Meta asks for creative that is
//   distinct in concept, persona, format and look, not near-copies; near-copies are grouped and share delivery.
// - Instagram Reels: Adam Mosseri names watch time, likes per reach and sends per reach as the signals that weigh
//   most; DM sends weigh most for reaching people who don't follow you. Originality is rewarded.
// - TikTok: watch time, completion and re-watches first, then shares and saves; captions, on-screen text and speech
//   are read for search.
// - The thresholds below (hook rate, hold rate, CTR, test spend) are working rules of thumb, not platform figures.
//   The screens say so.

export const RULE_OF_THUMB =
  "Rule of thumb, not a platform figure: check it against your own accounts.";

/* ---------------------------------------------------------------- creative plan (Andromeda-aligned) */

export type PlanGoal = "launch" | "sales" | "leads" | "brand";

export const ANGLES: { key: string; name: string; line: string; goals: PlanGoal[] }[] = [
  {
    key: "pain",
    name: "The pain",
    line: "Name the everyday problem in their words, then fix it.",
    goals: ["launch", "sales", "leads"],
  },
  {
    key: "proof",
    name: "Social proof",
    line: "Real customers, real results, reviews read out loud.",
    goals: ["sales", "leads", "brand"],
  },
  {
    key: "vs",
    name: "Us vs the usual way",
    line: "Side by side with what they use now.",
    goals: ["launch", "sales"],
  },
  {
    key: "founder",
    name: "Founder story",
    line: "Why it exists, told by the person who made it.",
    goals: ["launch", "brand"],
  },
  {
    key: "demo",
    name: "Demo",
    line: "How it works, in hands, in 3 steps.",
    goals: ["launch", "sales", "leads"],
  },
  {
    key: "offer",
    name: "Offer and urgency",
    line: "The deal, the deadline, the reason to act today.",
    goals: ["sales"],
  },
  {
    key: "objection",
    name: "Objection buster",
    line: "Price, quality, delivery: answer the doubt head on.",
    goals: ["sales", "leads"],
  },
  {
    key: "identity",
    name: "Identity",
    line: "Who they become with it; the life, not the product.",
    goals: ["brand", "launch"],
  },
  {
    key: "myth",
    name: "Myth vs fact",
    line: "Say the thing the category gets wrong.",
    goals: ["brand", "leads", "launch"],
  },
  {
    key: "transform",
    name: "Before / after",
    line: "The change, visible in seconds.",
    goals: ["sales", "launch"],
  },
  {
    key: "craft",
    name: "Behind the scenes",
    line: "How it's made, sourced or packed.",
    goals: ["brand", "launch"],
  },
  {
    key: "value",
    name: "Price breakdown",
    line: "What you get for the money, item by item.",
    goals: ["sales", "leads"],
  },
  {
    key: "relatable",
    name: "Send-to-a-friend",
    line: "A moment so true people DM it to someone.",
    goals: ["brand", "launch", "sales"],
  },
];

export const HOOK_TYPES = [
  "Result first",
  "Call-out",
  "Question",
  "Bold claim",
  "Contrarian",
  "POV",
  "Stop doing…",
  "Curiosity gap",
  "Number list",
  "Visual interrupt",
];

export const CREATORS = [
  "Founder",
  "UGC creator",
  "Real customer",
  "Actor",
  "Product only, no face",
  "Street interview",
];
export const SETTINGS = ["Home", "Shop or workshop", "Street", "Studio", "Car", "Office"];
export const PLAN_FORMATS = [
  "Talking head",
  "Demo in hands",
  "Skit",
  "Before / after",
  "Green screen",
  "Carousel or static",
  "Unboxing",
  "Interview",
];

export interface PlanInput {
  goal: PlanGoal;
  /** Monthly ad budget in DT. */
  budget: number;
  /** What one result (order, message, booking) may cost, in DT. */
  targetCpa: number;
  /** Up to 4 kinds of buyer, in a few words each. */
  personas: string[];
}

export interface Concept {
  n: number;
  angle: string;
  angleLine: string;
  persona: string;
  format: string;
  hook: string;
  creator: string;
  setting: string;
}

export interface Plan {
  /** Spend each new ad needs before it's judged. */
  testSpend: number;
  /** Share of the budget kept for testing new ads; the rest goes to proven ones. */
  testShare: number;
  /** Distinct concepts to make this month. */
  concepts: number;
  /** How many to launch at a time in the single ad set. */
  liveAtOnce: number;
  /** Days between new batches. */
  refreshDays: number;
  matrix: Concept[];
  rules: string[];
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * A month of creative for Meta in the Andromeda era: enough distinct concepts for the budget to judge each one,
 * spread so that no two share angle, buyer and format (Meta groups look-alikes and lets one of them win).
 */
export function creativePlan(input: PlanInput): Plan {
  const budget = Math.max(0, input.budget || 0);
  const cpa = Math.max(1, input.targetCpa || 1);
  const testShare = input.goal === "brand" ? 0.4 : 0.3;
  const testSpend = Math.round(cpa * 2.5);
  const concepts = clamp(Math.floor((budget * testShare) / testSpend), 3, 30);
  const liveAtOnce = clamp(Math.round(concepts / 2), 3, 15);
  const refreshDays = concepts >= 16 ? 7 : concepts >= 8 ? 10 : 14;
  const personas = input.personas
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
  const who = personas.length ? personas : ["Main buyer"];
  const angles = ANGLES.filter((a) => a.goals.includes(input.goal));
  const matrix: Concept[] = Array.from({ length: concepts }, (_, i) => {
    const a = angles[i % angles.length]!;
    // Step each axis at a different pace so neighbours never share two axes.
    return {
      n: i + 1,
      angle: a.name,
      angleLine: a.line,
      persona: who[(i + Math.floor(i / angles.length)) % who.length]!,
      format: PLAN_FORMATS[(i * 3) % PLAN_FORMATS.length]!,
      hook: HOOK_TYPES[(i * 7) % HOOK_TYPES.length]!,
      creator: CREATORS[(i * 5) % CREATORS.length]!,
      setting: SETTINGS[(i * 2 + 1) % SETTINGS.length]!,
    };
  });
  const rules = [
    "One campaign, one broad ad set (Advantage+ audience): let the creative find the people.",
    `Launch ${liveAtOnce} new concepts at a time in that ad set, not one ad set per idea.`,
    `Judge a new ad after about ${testSpend} DT spent (2–3× the cost you want per result).`,
    "Variations of one ad (colour, caption, a cut) count as one concept for Meta: change the first frame, the person or the setting to make it new.",
    "Two hooks per concept, visually different in the first second.",
    `New batch every ${refreshDays} days; sooner if frequency passes 3 or the click rate drops by a fifth.`,
    "Winners move to the scaling budget; raise it by about 20% every 2–3 days, not all at once.",
  ];
  return { testSpend, testShare, concepts, liveAtOnce, refreshDays, matrix, rules };
}

/* ---------------------------------------------------------------- ad diagnosis */

export interface AdRow {
  name: string;
  spend: number;
  impressions: number;
  /** 3-second video plays. */
  plays: number;
  /** ThruPlays (15 s or to the end). */
  thruplays: number;
  clicks: number;
  results: number;
  revenue: number;
}

export type Grade = "low" | "ok" | "good" | null;

export interface Diagnosis {
  cpm: number | null;
  hookRate: number | null;
  holdRate: number | null;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  cpa: number | null;
  roas: number | null;
  grades: { hook: Grade; hold: Grade; ctr: Grade };
  verdict:
    | "early"
    | "scale"
    | "keep"
    | "fix-hook"
    | "fix-body"
    | "fix-cta"
    | "fix-after-click"
    | "kill";
  why: string;
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);
const grade = (v: number | null, low: number, good: number): Grade =>
  v === null ? null : v >= good ? "good" : v >= low ? "ok" : "low";

/** Benchmarks for Meta video ads (working rules of thumb). */
export const BENCH = { hook: [0.2, 0.3], hold: [0.25, 0.4], ctr: [0.008, 0.015] } as const;

export function diagnose(r: AdRow, targetCpa: number): Diagnosis {
  const cpm = r.impressions > 0 ? (r.spend / r.impressions) * 1000 : null;
  const hookRate = div(r.plays, r.impressions);
  const holdRate = div(r.thruplays, r.plays);
  const ctr = div(r.clicks, r.impressions);
  const cpc = div(r.spend, r.clicks);
  const cvr = div(r.results, r.clicks);
  const cpa = div(r.spend, r.results);
  const roas = r.revenue > 0 ? div(r.revenue, r.spend) : null;
  const grades = {
    hook: grade(hookRate, BENCH.hook[0], BENCH.hook[1]),
    hold: grade(holdRate, BENCH.hold[0], BENCH.hold[1]),
    ctr: grade(ctr, BENCH.ctr[0], BENCH.ctr[1]),
  };
  const target = Math.max(1, targetCpa || 1);
  const out = (verdict: Diagnosis["verdict"], why: string): Diagnosis => ({
    cpm,
    hookRate,
    holdRate,
    ctr,
    cpc,
    cvr,
    cpa,
    roas,
    grades,
    verdict,
    why,
  });
  if (r.spend < target * 1.5 && r.results < 3)
    return out(
      "early",
      `Not enough data yet: let it spend to about ${Math.round(target * 2.5)} DT before judging.`,
    );
  if (cpa !== null && cpa <= target)
    return out("scale", "Under your target cost per result: move it to the scaling budget.");
  if (cpa !== null && cpa <= target * 1.3)
    return out("keep", "Close to target: keep it running and give it a second hook.");
  if (grades.hook === "low")
    return out(
      "fix-hook",
      "People scroll past: change the first second (face, movement, the result on screen).",
    );
  if (grades.hold === "low")
    return out("fix-body", "They stop, then leave: cut the middle, show the payoff sooner.");
  if (grades.ctr === "low")
    return out("fix-cta", "They watch but don't act: a clearer offer and call to action.");
  if (r.clicks > 0 && (cvr ?? 0) < 0.02)
    return out(
      "fix-after-click",
      "Clicks don't turn into results: the page, the price or the DM follow-up.",
    );
  return out("kill", "Spent enough without results: stop it and test a new angle.");
}

export const VERDICT_LABEL: Record<Diagnosis["verdict"], string> = {
  early: "Too early",
  scale: "Scale",
  keep: "Keep",
  "fix-hook": "Fix the hook",
  "fix-body": "Fix the body",
  "fix-cta": "Fix the offer",
  "fix-after-click": "Fix after the click",
  kill: "Stop it",
};

/* ---------------------------------------------------------------- unit economics (cash on delivery aware) */

export interface Economics {
  price: number;
  productCost: number;
  /** Delivery the seller pays per parcel sent. */
  delivery: number;
  packaging: number;
  /** Parcels refused or returned, as a share (Tunisia: cash on delivery). */
  returnRate: number;
  /** Cost of a parcel coming back. */
  returnCost: number;
  /** Payment or platform fees, as a share of the price. */
  fees: number;
  /** Profit you want to keep per delivered order, as a share of the price. */
  margin: number;
  /** Orders wanted per month. */
  orders: number;
}

export interface EconomicsOut {
  /** Profit per order placed, before ads. */
  profitPerOrder: number;
  breakEvenCpa: number;
  breakEvenRoas: number | null;
  targetCpa: number;
  targetRoas: number | null;
  budget: number;
}

export function economics(e: Economics): EconomicsOut {
  const r = clamp(e.returnRate, 0, 0.95);
  const delivered = 1 - r;
  const profitPerOrder =
    delivered * (e.price - e.productCost - e.fees * e.price) -
    e.delivery -
    e.packaging -
    r * e.returnCost;
  const breakEvenCpa = Math.max(0, profitPerOrder);
  const revenuePerOrder = delivered * e.price;
  const targetCpa = Math.max(0, profitPerOrder - e.margin * revenuePerOrder);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    profitPerOrder: round(profitPerOrder),
    breakEvenCpa: round(breakEvenCpa),
    breakEvenRoas: breakEvenCpa > 0 ? round(revenuePerOrder / breakEvenCpa) : null,
    targetCpa: round(targetCpa),
    targetRoas: targetCpa > 0 ? round(revenuePerOrder / targetCpa) : null,
    budget: Math.round(targetCpa * Math.max(0, e.orders)),
  };
}

/* ---------------------------------------------------------------- reel score */

export type Surface = "reels" | "tiktok" | "ad";

export const SURFACE_LABEL: Record<Surface, string> = {
  reels: "Instagram Reels",
  tiktok: "TikTok",
  ad: "Meta ad",
};

export const REEL_CHECKS: {
  key: string;
  label: string;
  fix: string;
  signal: string;
  weight: Record<Surface, number>;
}[] = [
  {
    key: "hook",
    label: "Something happens in the first second: a face, movement or the result",
    fix: "Cut the intro. Open on the most surprising frame.",
    signal: "Watch time",
    weight: { reels: 15, tiktok: 15, ad: 16 },
  },
  {
    key: "text",
    label: "The hook is written on screen in the first 2 seconds",
    fix: "Add 5–8 words of hook text, big, inside the safe zone.",
    signal: "Watch time · muted viewing",
    weight: { reels: 8, tiktok: 8, ad: 10 },
  },
  {
    key: "payoff",
    label: "A payoff is promised early and paid at the end",
    fix: "Tease the result at 0:01, reveal it last.",
    signal: "Completion",
    weight: { reels: 10, tiktok: 12, ad: 8 },
  },
  {
    key: "tight",
    label: "No dead air: every pause and repeat is cut",
    fix: "Cut breaths, 'so', 'um'. Aim for a change every 2–3 s.",
    signal: "Watch time",
    weight: { reels: 8, tiktok: 9, ad: 8 },
  },
  {
    key: "loop",
    label: "The last frame leads back into the first",
    fix: "End on a line that makes the start make sense again.",
    signal: "Re-watches",
    weight: { reels: 6, tiktok: 10, ad: 2 },
  },
  {
    key: "send",
    label: "Someone would DM it to a friend",
    fix: "Add a 'that's so you' moment or something worth passing on.",
    signal: "Sends per reach",
    weight: { reels: 15, tiktok: 9, ad: 5 },
  },
  {
    key: "save",
    label: "Worth saving: steps, prices, a list, a how-to",
    fix: "Put the useful part on screen as a list.",
    signal: "Saves",
    weight: { reels: 6, tiktok: 7, ad: 3 },
  },
  {
    key: "captions",
    label: "Captions burned in, inside the safe zone",
    fix: "Captions in the middle band, not the bottom third.",
    signal: "Muted viewing",
    weight: { reels: 6, tiktok: 6, ad: 8 },
  },
  {
    key: "search",
    label: "The keyword is said, shown and in the caption",
    fix: "Say the search phrase out loud, write it on screen and in the caption.",
    signal: "Search",
    weight: { reels: 6, tiktok: 10, ad: 0 },
  },
  {
    key: "original",
    label: "Original: own footage and sound, no other app's watermark",
    fix: "Re-export from the editor; no reposts, no watermarks.",
    signal: "Originality",
    weight: { reels: 8, tiktok: 6, ad: 4 },
  },
  {
    key: "human",
    label: "A real person, a real voice",
    fix: "A face and a natural voice beat a polished montage.",
    signal: "Trust",
    weight: { reels: 5, tiktok: 5, ad: 8 },
  },
  {
    key: "one",
    label: "One idea, one message",
    fix: "If it needs 'and also', it's a second video.",
    signal: "Clarity",
    weight: { reels: 4, tiktok: 3, ad: 8 },
  },
  {
    key: "cta",
    label: "A clear next step",
    fix: "Ads: the offer and the button. Organic: 'comment X' or 'send this to…'.",
    signal: "Action",
    weight: { reels: 3, tiktok: 3, ad: 12 },
  },
  {
    key: "brand",
    label: "The product is seen in the first 3 seconds",
    fix: "Show it in hands early; no logo card at the start.",
    signal: "Ad recall",
    weight: { reels: 0, tiktok: 0, ad: 8 },
  },
];

export function reelScore(checked: ReadonlySet<string>, surface: Surface) {
  const items = REEL_CHECKS.filter((c) => c.weight[surface] > 0);
  const total = items.reduce((s, c) => s + c.weight[surface], 0);
  const got = items.filter((c) => checked.has(c.key)).reduce((s, c) => s + c.weight[surface], 0);
  const score = total ? Math.round((got / total) * 100) : 0;
  const missing = items
    .filter((c) => !checked.has(c.key))
    .sort((a, b) => b.weight[surface] - a.weight[surface]);
  const level = score >= 80 ? "ready" : score >= 60 ? "almost" : "rework";
  return { score, level, missing, items } as const;
}

/* ---------------------------------------------------------------- safe zones */

export const SAFE_ZONES: {
  key: string;
  name: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  source: string;
}[] = [
  {
    key: "meta",
    name: "Reels, Stories (Meta ads)",
    top: 0.14,
    bottom: 0.35,
    left: 0.06,
    right: 0.06,
    source: "Meta Ads Guide, Reels ad specs",
  },
  {
    key: "tiktok",
    name: "TikTok",
    top: 240 / 1920,
    bottom: 660 / 1920,
    left: 120 / 1080,
    right: 120 / 1080,
    source: "Measured by creators, not published by TikTok",
  },
  {
    key: "shorts",
    name: "YouTube Shorts",
    top: 288 / 1920,
    bottom: 672 / 1920,
    left: 48 / 1080,
    right: 192 / 1080,
    source: "Measured by creators",
  },
];

/* ---------------------------------------------------------------- hook lab */

export interface HookInput {
  product: string;
  audience: string;
  pain: string;
  result: string;
  objection: string;
}

/** Hooks of every type from five words about the product. Brackets stay where a word is missing. */
export function hookLab(h: HookInput): { type: string; line: string; first: string }[] {
  const v = (s: string, fallback: string) => s.trim() || `[${fallback}]`;
  const product = v(h.product, "product");
  const audience = v(h.audience, "who it's for");
  const pain = v(h.pain, "the problem");
  const result = v(h.result, "the result");
  const objection = v(h.objection, "the doubt");
  return [
    {
      type: "Result first",
      line: `${result}. Here's exactly how.`,
      first: "Open on the result, already done.",
    },
    {
      type: "Call-out",
      line: `If you're ${audience} and ${pain}, watch this.`,
      first: "Point at the camera, text on screen.",
    },
    {
      type: "Question",
      line: `Why does ${pain} keep happening?`,
      first: "The problem happening, mid-action.",
    },
    {
      type: "Stop doing…",
      line: `Stop doing this if ${pain}.`,
      first: "The wrong way, crossed out.",
    },
    {
      type: "Contrarian",
      line: `Everyone tells ${audience} the wrong thing about ${pain}.`,
      first: "Shake the head at a common tip.",
    },
    {
      type: "Curiosity gap",
      line: `Nobody tells ${audience} this about ${pain}.`,
      first: "Lean in, half-whisper.",
    },
    {
      type: "POV",
      line: `POV: you found ${product} and ${result}.`,
      first: "First-person shot, the moment it works.",
    },
    {
      type: "Objection",
      line: `"${objection}?" Fair. Watch this.`,
      first: "Read a real comment on screen.",
    },
    {
      type: "Before / after",
      line: `Before ${product}: ${pain}. After: ${result}.`,
      first: "Split screen, before on the left.",
    },
    {
      type: "Send-to-a-friend",
      line: `Send this to the ${audience} who still ${pain}.`,
      first: "The relatable moment, no product yet.",
    },
    {
      type: "Number list",
      line: `3 things I wish I knew before ${pain}.`,
      first: "Hold up 3 fingers, list on screen.",
    },
    {
      type: "Search",
      line: `How to ${result} (${audience} edition)`,
      first: "Say the phrase people type, word for word.",
    },
    {
      type: "Visual interrupt",
      line: `[No words: the most unexpected frame of ${product}]`,
      first: "Something odd, loud or beautiful in frame one.",
    },
  ];
}
