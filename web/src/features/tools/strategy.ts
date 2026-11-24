// The strategy assistant (Heni, 24 Nov 2026): formats that work, when to use them, and a campaign mix built from
// the goal, for Gecko and its clients. Written as guidance, not numbers we can't stand behind.

export type Stage = "awareness" | "consideration" | "conversion" | "retention";

export const STAGE_LABEL: Record<Stage, string> = {
  awareness: "Get seen",
  consideration: "Get trusted",
  conversion: "Get bought",
  retention: "Get them back",
};

export interface Format {
  key: string;
  name: string;
  stage: Stage[];
  length: string;
  when: string;
  structure: string[];
  hooks: string[];
  tips: string[];
}

export const FORMATS: Format[] = [
  {
    key: "problem-solution",
    name: "Problem → solution",
    stage: ["awareness", "conversion"],
    length: "15–30 s",
    when: "A product that fixes a clear, everyday pain.",
    structure: [
      "Show the pain in 2 s",
      "Agitate: why it's annoying",
      "The product fixes it",
      "Proof + offer",
    ],
    hooks: ["Still doing [pain] like this?", "This is why your [thing] never [result]."],
    tips: ["Open on the problem, never the logo.", "One problem per video."],
  },
  {
    key: "ugc-testimonial",
    name: "UGC testimonial",
    stage: ["consideration", "conversion"],
    length: "20–45 s",
    when: "You need trust: a real person, a real result.",
    structure: [
      "The result first",
      "Who I am and my problem",
      "What I tried",
      "Why this worked",
      "Tell a friend",
    ],
    hooks: ["I didn't believe it until…", "3 weeks with [product], honestly:"],
    tips: ["Phone-shot looks more real than a studio.", "Let them use their own words, then trim."],
  },
  {
    key: "before-after",
    name: "Before / after",
    stage: ["awareness", "conversion"],
    length: "10–20 s",
    when: "The change is visible: cleaning, beauty, home, fitness.",
    structure: [
      "Before, ugly and honest",
      "The transition (snap, wipe, cut on beat)",
      "After, held 2 s",
      "Product + price",
    ],
    hooks: ["Wait for it…", "Same [room], 10 minutes later."],
    tips: ["Same angle and light for both shots.", "Put the after in the cover image."],
  },
  {
    key: "founder",
    name: "Founder story",
    stage: ["awareness", "consideration"],
    length: "30–60 s",
    when: "A local brand with a face; people buy from people.",
    structure: ["Why I started", "The hard moment", "What we make now", "Invite them in"],
    hooks: [
      "I started [brand] in my kitchen in [city].",
      "Nobody in Tunisia was making [thing], so…",
    ],
    tips: ["Shoot where the work happens.", "Subtitles: most watch without sound."],
  },
  {
    key: "street",
    name: "Street interview",
    stage: ["awareness"],
    length: "20–40 s",
    when: "Reach and fun; works for food, telecom, retail, events.",
    structure: [
      "A question anyone can answer",
      "3 fast answers",
      "The twist: the product",
      "Call to action",
    ],
    hooks: ["We asked people in [Lac 2]: …", "Can you guess the price of this?"],
    tips: ["The funniest answer goes first.", "Ask permission and get releases."],
  },
  {
    key: "pov",
    name: "POV / day in the life",
    stage: ["awareness", "retention"],
    length: "15–30 s",
    when: "Lifestyle brands; show the product in its real moment.",
    structure: [
      "POV: [situation]",
      "Fast cuts of the day",
      "The product in its moment",
      "Soft CTA",
    ],
    hooks: ["POV: you finally found a [thing] that…", "A day at [brand]:"],
    tips: ["On-screen text carries the story.", "Trending sound, low volume under voice."],
  },
  {
    key: "tutorial",
    name: "How-to / tutorial",
    stage: ["consideration", "retention"],
    length: "30–60 s",
    when: "The product needs showing; also great for saves and shares.",
    structure: ["The result first", "Step 1, 2, 3 on screen", "The tip nobody knows", "Save this"],
    hooks: ["3 ways to use [product] you didn't know.", "Do this before you [action]."],
    tips: ["Number the steps on screen.", "End with 'save it for later'."],
  },
  {
    key: "comparison",
    name: "Us vs them",
    stage: ["consideration", "conversion"],
    length: "15–30 s",
    when: "There's a clear difference you can show side by side.",
    structure: ["Split screen", "Same test, both", "The winner", "Offer"],
    hooks: ["[cheap one] vs [ours]: we tested.", "Why pay more? Watch."],
    tips: ["Don't name competitors; say 'the usual one'.", "Make the test fair, or it backfires."],
  },
  {
    key: "offer",
    name: "Offer / launch",
    stage: ["conversion"],
    length: "6–15 s",
    when: "A launch, a promo, a deadline. Retargeting people who already know you.",
    structure: [
      "The offer in the first second",
      "The product, beautiful",
      "Deadline",
      "Where to buy",
    ],
    hooks: ["-30% until Sunday.", "It's here."],
    tips: ["Price and date on screen.", "Make 3 versions: 6 s, 10 s, 15 s."],
  },
];

export type Goal = "launch" | "sales" | "brand" | "leads";

export const GOAL_LABEL: Record<Goal, string> = {
  launch: "Launch a product",
  sales: "Sell more now",
  brand: "Build the brand",
  leads: "Get leads / bookings",
};

/** The share of videos per stage for a goal; the formats that fit each stage. */
export function campaignMix(
  goal: Goal,
  videos: number,
): { stage: Stage; count: number; formats: Format[] }[] {
  const shares: Record<Goal, Record<Stage, number>> = {
    launch: { awareness: 0.5, consideration: 0.2, conversion: 0.3, retention: 0 },
    sales: { awareness: 0.2, consideration: 0.3, conversion: 0.5, retention: 0 },
    brand: { awareness: 0.6, consideration: 0.3, conversion: 0, retention: 0.1 },
    leads: { awareness: 0.3, consideration: 0.4, conversion: 0.3, retention: 0 },
  };
  const n = Math.max(1, Math.min(60, Math.round(videos)));
  const stages = (Object.keys(shares[goal]) as Stage[]).filter((s) => shares[goal][s] > 0);
  const counts = stages.map((s) => Math.floor(n * shares[goal][s]));
  let left = n - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % counts.length, left--) counts[i] = (counts[i] ?? 0) + 1;
  return stages.map((stage, i) => ({
    stage,
    count: counts[i] ?? 0,
    formats: FORMATS.filter((f) => f.stage.includes(stage)),
  }));
}

export const TIPS: { title: string; body: string }[] = [
  {
    title: "The first second decides",
    body: "Movement, a face or the result on screen before any logo.",
  },
  {
    title: "Make 3 hooks per script",
    body: "Same body, three openings. Let the numbers pick the winner.",
  },
  {
    title: "Subtitles always",
    body: "Most people watch muted. Big, high-contrast captions, inside the safe zone.",
  },
  { title: "One idea per video", body: "If you need 'and also', it's a second video." },
  {
    title: "Shoot vertical first",
    body: "9:16 master, then cut 4:5 and 1:1. Keep the action in the middle.",
  },
  {
    title: "Refresh every 2–3 weeks",
    body: "Ads tire. Plan new hooks before results drop, not after.",
  },
  {
    title: "Talk like the customer",
    body: "Use the words from reviews and DMs, in Derja when it fits the brand.",
  },
  {
    title: "Measure what matters",
    body: "Hold rate at 3 s, click rate, cost per result: not just views.",
  },
];
