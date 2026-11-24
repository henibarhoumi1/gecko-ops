// The Creative Lab's machine (Heni, 24 Nov 2026: "a real, not AI-slop creative generation machine"). Not a text
// generator: it crosses the brief's own words (the pain, the result, the proof, the buyers) with formats from the
// bank, so every concept is a real format with real beats, spread across families, signals and funnel stages.
// The team picks, edits and sends the good ones.
import { BANK, fillIn, type BankFormat, type Stage } from "./bank";

export interface Brief {
  brand: string;
  product: string;
  /** Who buys it, a few words. */
  audience: string;
  pain: string;
  result: string;
  /** A fact we can show: a number, a review, a test. */
  proof: string;
  offer: string;
  price: string;
  city: string;
  /** What they'd use instead. */
  rival: string;
}

export const EMPTY_BRIEF: Brief = {
  brand: "",
  product: "",
  audience: "",
  pain: "",
  result: "",
  proof: "",
  offer: "",
  price: "",
  city: "Tunis",
  rival: "",
};

export interface LabConcept {
  key: string;
  format: BankFormat;
  title: string;
  hook: string;
  /** The other hooks to cycle through. */
  hooks: string[];
  stage: Stage;
  beats: { at: string; what: string }[];
  angle: string;
}

export type Mix = "balanced" | "seen" | "trusted" | "bought";

const ANGLES: Record<Stage, string[]> = {
  seen: [
    "The relatable moment",
    "The surprising result",
    "The myth everyone believes",
    "The satisfying process",
  ],
  trusted: [
    "Real proof",
    "The founder's reason",
    "How it's made",
    "The honest answer to the doubt",
  ],
  bought: ["The offer and the deadline", "Side by side", "Price, explained", "The gift moment"],
};

/** A small seeded random, so "shuffle" gives new sets and the same seed gives the same set. */
function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export function words(b: Brief): Record<string, string> {
  const product = b.product || b.brand;
  return {
    product,
    brand: b.brand,
    pain: b.pain,
    problem: b.pain,
    result: b.result,
    city: b.city,
    price: b.price,
    person: b.audience,
    persona: b.audience,
    "who it's for": b.audience,
    customer: b.audience,
    thing: product,
    category: product,
    "cheap one": b.rival,
    ours: b.brand || product,
    myth: "",
    habit: b.pain,
    situation: b.pain,
    time: "",
  };
}

/** n concepts for a brief: different families next to each other, every stage covered as the mix asks. */
export function generate(
  b: Brief,
  opts: { n: number; seed: number; mix: Mix; rising?: boolean; maxEffort?: 1 | 2 | 3 },
): LabConcept[] {
  const r = rand(opts.seed);
  const w = words(b);
  const pool = BANK.filter(
    (f) =>
      (!opts.rising || f.trend === "rising") && (!opts.maxEffort || f.effort <= opts.maxEffort),
  );
  const stages: Stage[] = opts.mix === "balanced" ? ["seen", "trusted", "bought"] : [opts.mix];
  const out: LabConcept[] = [];
  const used = new Set<string>();
  for (let i = 0; i < opts.n; i++) {
    const stage = stages[i % stages.length]!;
    const last = out[out.length - 1]?.format.family;
    const fits = pool.filter(
      (f) => f.stages.includes(stage) && !used.has(f.key) && f.family !== last,
    );
    const from = fits.length ? fits : pool.filter((f) => !used.has(f.key));
    if (!from.length) break;
    const f = from[Math.floor(r() * from.length)]!;
    used.add(f.key);
    const hooks = f.hooks.map((h) => fillIn(h, w));
    const start = Math.floor(r() * hooks.length);
    const angles = ANGLES[stage];
    out.push({
      key: `${f.key}-${opts.seed}-${i}`,
      format: f,
      title: titleFor(f, b),
      hook: hooks[start]!,
      hooks,
      stage,
      beats: f.beats.map((x) => ({ at: x.at, what: fillIn(x.what, w) })),
      angle: angles[Math.floor(r() * angles.length)]!,
    });
  }
  return out;
}

function titleFor(f: BankFormat, b: Brief): string {
  const p = b.product || b.brand || "the product";
  switch (f.family) {
    case "demo":
      return b.pain ? `${p}: ${b.pain} → ${b.result || "fixed"}` : `${p}, shown working`;
    case "proof":
      return b.proof ? `${p}: ${b.proof}` : `${p}, proven on camera`;
    case "versus":
      return `${p} vs ${b.rival || "the usual way"}`;
    case "founder":
      return `${b.brand || p}: ${f.name.toLowerCase()}`;
    case "offer":
      return b.offer ? `${p}: ${b.offer}` : `${p}, ${f.name.toLowerCase()}`;
    case "street":
      return `${f.name} in ${b.city || "Tunis"} about ${p}`;
    default:
      return `${f.name}: ${p}`;
  }
}

/** The body of an idea sent from the Lab: angle, beats and what the shoot needs. */
export function conceptBody(c: LabConcept): string {
  return [
    `Format: ${c.format.name} (${c.format.length}) · ${c.angle}`,
    ...c.beats.map((b) => `${b.at}: ${b.what}`),
    `Needs: ${c.format.needs.people} · ${c.format.needs.place}${c.format.needs.props ? ` · ${c.format.needs.props}` : ""}`,
    `Why it works: ${c.format.why}`,
  ].join("\n");
}
