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
