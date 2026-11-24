// Pages and documents: blocks, templates, and the text a page turns into (supabase/migrations/202612110001).

export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "text"
  | "todo"
  | "bullet"
  | "number"
  | "quote"
  | "callout"
  | "divider"
  | "field";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  /** "field" blocks: a label in front of the text, e.g. "Client", "Budget". */
  label?: string;
}

export const BLOCK_MENU: { type: BlockType; label: string; hint: string; keys: string }[] = [
  { type: "text", label: "Text", hint: "Plain writing", keys: "" },
  { type: "h1", label: "Title", hint: "Big section title", keys: "#" },
  { type: "h2", label: "Heading", hint: "Section heading", keys: "##" },
  { type: "h3", label: "Subheading", hint: "Small heading", keys: "###" },
  { type: "todo", label: "To-do", hint: "A box to tick", keys: "[]" },
  { type: "bullet", label: "Bullet list", hint: "• point", keys: "-" },
  { type: "number", label: "Numbered list", hint: "1. step", keys: "1." },
  { type: "quote", label: "Quote", hint: "What someone said", keys: '"' },
  { type: "callout", label: "Callout", hint: "A note that stands out", keys: "!" },
  { type: "field", label: "Field", hint: "Label: value", keys: "" },
  { type: "divider", label: "Divider", hint: "A line", keys: "---" },
];

let counter = 0;
export const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

export const block = (type: BlockType, text = "", extra: Partial<Block> = {}): Block => ({
  id: newId(),
  type,
  text,
  ...extra,
});

/** Markdown-ish shortcuts typed at the start of a block turn it into that block ("## " → heading). */
export function shortcut(text: string): { type: BlockType; rest: string } | null {
  const rules: [RegExp, BlockType][] = [
    [/^###\s/, "h3"],
    [/^##\s/, "h2"],
    [/^#\s/, "h1"],
    [/^\[\]\s|^\[ \]\s/, "todo"],
    [/^[-*•]\s/, "bullet"],
    [/^1[.)]\s/, "number"],
    [/^>\s|^"\s/, "quote"],
    [/^!\s/, "callout"],
  ];
  for (const [re, type] of rules) if (re.test(text)) return { type, rest: text.replace(re, "") };
  if (text === "---") return { type: "divider", rest: "" };
  return null;
}

/** Keeps only well-formed blocks from stored JSON. */
export function readBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  const types = new Set(BLOCK_MENU.map((m) => m.type));
  return v
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b) => ({
      id: typeof b.id === "string" ? b.id : newId(),
      type: (types.has(b.type as BlockType) ? b.type : "text") as BlockType,
      text: typeof b.text === "string" ? b.text : "",
      ...(b.checked === true ? { checked: true } : {}),
      ...(typeof b.label === "string" ? { label: b.label } : {}),
    }));
}

/** The page as plain text, for WhatsApp, email or a paste anywhere. */
export function toText(title: string, blocks: readonly Block[]): string {
  let n = 0;
  const lines = blocks.map((b) => {
    if (b.type !== "number") n = 0;
    switch (b.type) {
      case "h1":
        return `\n${b.text.toUpperCase()}`;
      case "h2":
      case "h3":
        return `\n${b.text}`;
      case "todo":
        return `${b.checked ? "☑" : "☐"} ${b.text}`;
      case "bullet":
        return `• ${b.text}`;
      case "number":
        n += 1;
        return `${n}. ${b.text}`;
      case "quote":
        return `“${b.text}”`;
      case "callout":
        return `→ ${b.text}`;
      case "field":
        return `${b.label ?? ""}: ${b.text}`;
      case "divider":
        return "———";
      default:
        return b.text;
    }
  });
  return [title, ...lines]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface Template {
  key: string;
  name: string;
  icon: string;
  kind: "page" | "doc";
  blurb: string;
  blocks: () => Block[];
}

const f = (label: string, text = "") => block("field", text, { label });

export const TEMPLATES: Template[] = [
  {
    key: "blank",
    name: "Blank page",
    icon: "◻",
    kind: "page",
    blurb: "Start from nothing. Type / for blocks.",
    blocks: () => [block("text")],
  },
  {
    key: "brief",
    name: "Creative brief",
    icon: "✎",
    kind: "doc",
    blurb: "What the client wants, for who, and how we'll know it worked.",
    blocks: () => [
      f("Client"),
      f("Campaign"),
      f("Deadline"),
      f("Budget"),
      block("h2", "The goal"),
      block("text", "What should change after people see these ads?"),
      block("h2", "Who we talk to"),
      block("bullet", "Age, city, habits"),
      block("bullet", "What they care about"),
      block("h2", "The one message"),
      block("callout", "If they remember one thing, it's…"),
      block("h2", "Deliverables"),
      block("todo", "[n] reels 9:16"),
      block("todo", "[n] UGC videos"),
      block("todo", "Cutdowns 1:1 / 16:9"),
      block("h2", "Must have / never"),
      block("bullet", "Must: logo in the last 2 seconds"),
      block("bullet", "Never: [words the brand never uses]"),
      block("h2", "References"),
      block("text", "Links to ads we like"),
    ],
  },
  {
    key: "proposal",
    name: "Proposal",
    icon: "❖",
    kind: "doc",
    blurb: "A clear offer: what we'll make, when, and what it costs.",
    blocks: () => [
      f("For"),
      f("Date"),
      f("Valid until"),
      block("h1", "What we heard"),
      block("text", "In your words: where the brand is, and where it wants to go."),
      block("h1", "What we'll make"),
      block("number", "Ideas and scripts, approved by you"),
      block("number", "Casting, locations and the shoot"),
      block("number", "Edits, versions and delivery, ready to post"),
      block("h1", "Timeline"),
      f("Week 1", "Ideas and scripts"),
      f("Week 2", "Prep and shoot"),
      f("Week 3", "Edit and delivery"),
      block("h1", "Investment"),
      f("Package", "[n] videos"),
      f("Price", "[amount] DT"),
      f("Payment", "50% to book the shoot, 50% on delivery"),
      block(
        "callout",
        "Production costs (talent, locations, gear) are approved by you first, at cost.",
      ),
      block("h1", "Next step"),
      block("text", "Reply “yes” and we book the shoot date."),
    ],
  },
  {
    key: "callsheet",
    name: "Call sheet",
    icon: "☎",
    kind: "doc",
    blurb: "Who, where, when, and what to bring on shoot day.",
    blocks: () => [
      f("Project"),
      f("Date"),
      f("Call time"),
      f("Location"),
      f("Maps link"),
      block("h2", "Schedule"),
      f("08:00", "Call, coffee, setup"),
      f("09:00", "Reel 1"),
      f("12:30", "Lunch"),
      f("13:30", "Reel 2"),
      f("17:00", "Wrap"),
      block("h2", "Crew"),
      f("Director"),
      f("DOP"),
      f("Sound"),
      block("h2", "Talent"),
      f("Name", "role · phone"),
      block("h2", "Bring"),
      block("todo", "Camera kit"),
      block("todo", "Lights"),
      block("todo", "Props"),
      block("todo", "Release forms"),
      block("callout", "Emergency: [phone]"),
    ],
  },
  {
    key: "quote",
    name: "Quote",
    icon: "₸",
    kind: "doc",
    blurb: "Line-by-line price for a package, ready to accept.",
    blocks: () => [
      f("Quote no.", "Q-[year]-[n]"),
      f("For"),
      f("Valid until"),
      block("h1", "The package"),
      f("[n] reels 9:16", "[amount] DT"),
      f("Ideas and scripts", "Included"),
      f("Casting", "Included"),
      f("Shoot day", "Included"),
      f("Edit, subtitles, 3 formats", "Included"),
      block("divider"),
      f("Total (excl. tax)", "[amount] DT"),
      f("VAT", "[amount] DT"),
      f("Total", "[amount] DT"),
      block("h1", "Paid at cost, approved first"),
      block("bullet", "Talent and creators"),
      block("bullet", "Locations and studios"),
      block("bullet", "Gear rental and props"),
      block("h1", "Terms"),
      block("number", "50% to book the shoot date, 50% on delivery."),
      block("number", "Two rounds of changes per video are included."),
      block("number", "You own the final videos for paid and organic use."),
      block("callout", "To accept: reply “yes” or sign below."),
      f("Accepted by"),
      f("Date"),
    ],
  },
  {
    key: "ugc-brief",
    name: "Creator brief",
    icon: "◎",
    kind: "doc",
    blurb: "What a UGC creator films, says and never says.",
    blocks: () => [
      f("Brand"),
      f("Creator"),
      f("Deliver by"),
      f("Fee"),
      block("h1", "The video"),
      f("Format", "9:16, 20–30 s, filmed on your phone"),
      f("Hook", "First line, word for word"),
      f("Story", "Problem → you try it → result"),
      block("h1", "Shots we need"),
      block("todo", "You saying the hook to camera"),
      block("todo", "The product in your hand, close up"),
      block("todo", "You using it (2–3 angles)"),
      block("todo", "The result"),
      block("h1", "Say / never say"),
      block("bullet", "Say: …"),
      block("bullet", "Never: prices, competitors' names, medical promises"),
      block("h1", "Rules"),
      block("bullet", "Daylight, quiet room, no music (we add it)."),
      block("bullet", "Send raw files, not edited."),
      block("callout", "Questions: WhatsApp Gecko before filming, not after."),
    ],
  },
  {
    key: "treatment",
    name: "Treatment & moodboard",
    icon: "◐",
    kind: "doc",
    blurb: "The look and feel of the film before the shoot.",
    blocks: () => [
      f("Project"),
      f("Director"),
      block("h1", "The film in one line"),
      block("quote", "…"),
      block("h1", "Look"),
      f("Light", "Soft morning daylight"),
      f("Colour", "Warm whites, one accent colour"),
      f("Camera", "Handheld, close, real"),
      f("References", "Links"),
      block("h1", "Sound"),
      f("Music", "…"),
      f("Voice", "…"),
      block("h1", "Cast"),
      block("bullet", "…"),
      block("h1", "Scenes"),
      block("number", "…"),
      block("number", "…"),
    ],
  },
  {
    key: "shot-list",
    name: "Shot list",
    icon: "▤",
    kind: "doc",
    blurb: "Every shot to get, ticked on set.",
    blocks: () => [
      f("Reel"),
      f("Date"),
      block("h2", "Scene 1"),
      block("todo", "Wide · establishing"),
      block("todo", "Medium · action"),
      block("todo", "Close · product"),
      block("h2", "Scene 2"),
      block("todo", "…"),
      block("h2", "Pickups"),
      block("todo", "Hands, details, logo"),
      block("todo", "Room tone 30 s"),
    ],
  },
  {
    key: "report",
    name: "Monthly report",
    icon: "↗",
    kind: "doc",
    blurb: "What we made, how it did, what's next.",
    blocks: () => [
      f("Client"),
      f("Month"),
      block("h1", "In short"),
      block("callout", "The one thing to remember this month."),
      block("h1", "What we delivered"),
      block("bullet", "[n] reels"),
      block("h1", "How it did"),
      f("Best video", "…"),
      f("Views", "…"),
      f("Hold rate at 3 s", "…"),
      f("Clicks / messages", "…"),
      block("h1", "What we learned"),
      block("bullet", "…"),
      block("h1", "Next month"),
      block("todo", "…"),
    ],
  },
  {
    key: "onboarding",
    name: "Client onboarding",
    icon: "✓",
    kind: "doc",
    blurb: "Everything we need from a new client to start.",
    blocks: () => [
      f("Client"),
      f("Start date"),
      block("h1", "Send us"),
      block("todo", "Logo files (SVG/PNG) and brand colours"),
      block("todo", "Product photos and the products for the shoot"),
      block("todo", "Prices and the offer to push"),
      block("todo", "Words you always / never use"),
      block("todo", "Access to Instagram / Meta Business (if we post or run ads)"),
      block("h1", "We set up"),
      block("todo", "Your space in the Gecko portal"),
      block("todo", "The first ideas within [n] days"),
      block("todo", "The shoot date"),
      block("callout", "Your space: client.gecko-creative.com"),
    ],
  },
  {
    key: "message",
    name: "Message",
    icon: "✉",
    kind: "doc",
    blurb: "A WhatsApp or email to send, written once and kept.",
    blocks: () => [
      f("To"),
      f("Subject"),
      block("text", "Hi [name],"),
      block("text", ""),
      block("text", "Best,\nHeni, Gecko"),
    ],
  },
  {
    key: "meeting",
    name: "Meeting notes",
    icon: "◷",
    kind: "page",
    blurb: "Who was there, what we decided, who does what.",
    blocks: () => [
      f("Date"),
      f("With"),
      block("h2", "Notes"),
      block("bullet"),
      block("h2", "Decided"),
      block("bullet"),
      block("h2", "Next"),
      block("todo", "[who] does [what] by [when]"),
    ],
  },
  {
    key: "content-plan",
    name: "Content plan",
    icon: "▦",
    kind: "page",
    blurb: "A month of posts: pillars, formats and dates.",
    blocks: () => [
      f("Month"),
      f("Goal"),
      block("h2", "Pillars"),
      block("bullet", "Educate: tips and how-tos"),
      block("bullet", "Prove: reviews, before/after"),
      block("bullet", "Sell: offers and launches"),
      block("h2", "Week 1"),
      block("todo", "Mon · Reel · hook: …"),
      block("todo", "Thu · UGC · hook: …"),
      block("h2", "Week 2"),
      block("todo", "Mon · Reel · hook: …"),
      block("todo", "Thu · Carousel · …"),
    ],
  },
  {
    key: "list",
    name: "Checklist",
    icon: "☑",
    kind: "page",
    blurb: "Anything to tick off.",
    blocks: () => [block("todo"), block("todo"), block("todo")],
  },
];
