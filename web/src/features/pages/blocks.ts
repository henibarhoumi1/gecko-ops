import type { IconName } from "@/components/Icon";
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
  | "field"
  | "table"
  | "calc"
  | "embed"
  | "image"
  | "toggle"
  | "code";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  /** "field" blocks: a label in front of the text, e.g. "Client", "Budget". */
  label?: string;
  /** "table" blocks: the cells, row by row; the first row is the header. */
  rows?: string[][];
  /** "embed" and "image" blocks: the link. */
  url?: string;
  /** "toggle" blocks: open or folded, and what's inside. */
  open?: boolean;
  body?: string;
}

export type BlockGroup = "Write" | "Lists" | "Data" | "Media";

export const BLOCK_MENU: {
  type: BlockType;
  label: string;
  hint: string;
  keys: string;
  group: BlockGroup;
  glyph: string;
}[] = [
  { type: "text", label: "Text", hint: "Plain writing", keys: "", group: "Write", glyph: "Aa" },
  { type: "h1", label: "Title", hint: "Big section title", keys: "#", group: "Write", glyph: "H1" },
  {
    type: "h2",
    label: "Heading",
    hint: "Section heading",
    keys: "##",
    group: "Write",
    glyph: "H2",
  },
  {
    type: "h3",
    label: "Subheading",
    hint: "Small heading",
    keys: "###",
    group: "Write",
    glyph: "H3",
  },
  {
    type: "quote",
    label: "Quote",
    hint: "What someone said",
    keys: '"',
    group: "Write",
    glyph: "“",
  },
  {
    type: "callout",
    label: "Callout",
    hint: "A note that stands out",
    keys: "!",
    group: "Write",
    glyph: "!",
  },
  {
    type: "toggle",
    label: "Toggle",
    hint: "A line that folds open",
    keys: ">>",
    group: "Write",
    glyph: "▸",
  },
  {
    type: "code",
    label: "Code or caption",
    hint: "Monospace, kept as typed",
    keys: "```",
    group: "Write",
    glyph: "</>",
  },
  { type: "divider", label: "Divider", hint: "A line", keys: "---", group: "Write", glyph: "—" },
  { type: "todo", label: "To-do", hint: "A box to tick", keys: "[]", group: "Lists", glyph: "☐" },
  { type: "bullet", label: "Bullet list", hint: "• point", keys: "-", group: "Lists", glyph: "•" },
  {
    type: "number",
    label: "Numbered list",
    hint: "1. step",
    keys: "1.",
    group: "Lists",
    glyph: "1.",
  },
  {
    type: "table",
    label: "Table",
    hint: "Rows and columns, totals add up",
    keys: "",
    group: "Data",
    glyph: "▦",
  },
  {
    type: "calc",
    label: "Calculator",
    hint: "Type a sum, see the result",
    keys: "=",
    group: "Data",
    glyph: "=",
  },
  { type: "field", label: "Field", hint: "Label: value", keys: "", group: "Data", glyph: "::" },
  {
    type: "embed",
    label: "Embed",
    hint: "YouTube, Drive, Figma, Maps, Instagram…",
    keys: "",
    group: "Media",
    glyph: "▶",
  },
  {
    type: "image",
    label: "Image",
    hint: "A picture from a link",
    keys: "",
    group: "Media",
    glyph: "◫",
  },
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
    [/^>>\s/, "toggle"],
    [/^=\s/, "calc"],
  ];
  for (const [re, type] of rules) if (re.test(text)) return { type, rest: text.replace(re, "") };
  if (text === "---") return { type: "divider", rest: "" };
  if (text === "```") return { type: "code", rest: "" };
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
      ...(Array.isArray(b.rows) ? { rows: readRows(b.rows) } : {}),
      ...(typeof b.url === "string" && /^https?:\/\//i.test(b.url) ? { url: b.url } : {}),
      ...(b.open === true ? { open: true } : {}),
      ...(typeof b.body === "string" ? { body: b.body } : {}),
    }));
}

/** A table's cells from stored JSON: strings only, at most 100 rows of 12 columns, every row as wide as the widest. */
function readRows(v: unknown[]): string[][] {
  const rows = v
    .filter(Array.isArray)
    .slice(0, 100)
    .map((r) => (r as unknown[]).slice(0, 12).map((c) => (typeof c === "string" ? c : "")));
  const w = Math.max(1, ...rows.map((r) => r.length));
  return rows.map((r) => [...r, ...Array<string>(w - r.length).fill("")]);
}

/** A new table: a header row and two empty rows, three columns. */
export const newTable = (): string[][] => [
  ["Item", "Qty", "Price"],
  ["", "", ""],
  ["", "", ""],
];

/** A number from what someone typed in a cell: "1 200", "1,200.50", "350 TND", "12%" (as 12). Null if not a number. */
export function parseNum(v: string): number | null {
  const t = v
    .replace(/(tnd|dt|eur|€|\$|usd|%)/gi, "")
    .replace(/[\s\u00a0\u202f]/g, "")
    .trim();
  if (!t) return null;
  // "1,200.50" (comma for thousands) or "1200,5" (comma for decimals).
  const n = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : null;
}

/** The total of a column when every filled cell under the header is a number (and at least one is filled). */
export function columnTotal(rows: readonly string[][], c: number): number | null {
  const cells = rows
    .slice(1)
    .map((r) => (r[c] ?? "").trim())
    .filter(Boolean);
  if (!cells.length) return null;
  let sum = 0;
  for (const x of cells) {
    const n = parseNum(x);
    if (n === null) return null;
    sum += n;
  }
  return Math.round(sum * 100) / 100;
}

/**
 * The calculator: + - * / ( ) and "x" for times, "%" as hundredths ("1200 * 15%" = 180), spaces and thousands
 * commas allowed. Returns null for anything that isn't a sum. No eval: a small parser.
 */
export function calculate(expr: string): number | null {
  const src = expr
    .toLowerCase()
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");
  if (!src || /[^0-9.+\-*/()%]/.test(src)) return null;
  let i = 0;
  const peek = () => src[i];
  const num = (): number | null => {
    if (peek() === "(") {
      i++;
      const v = add();
      if (peek() !== ")") return null;
      i++;
      return v;
    }
    if (peek() === "-") {
      i++;
      const v = num();
      return v === null ? null : -v;
    }
    const m = /^\d*\.?\d+/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    let v = Number(m[0]);
    if (peek() === "%") {
      i++;
      v /= 100;
    }
    return v;
  };
  const mul = (): number | null => {
    let v = num();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = src[i++];
      const r = num();
      if (r === null) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const add = (): number | null => {
    let v = mul();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = src[i++];
      const r = mul();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const v = add();
  if (v === null || i !== src.length || !Number.isFinite(v)) return null;
  return Math.round(v * 10000) / 10000;
}

/** A number written for people: 1,234.5 */
export const fmtNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

export type Embed =
  | { kind: "frame"; src: string; ratio: string; host: string }
  | { kind: "link"; host: string };

/** What a pasted link becomes: a player or a live preview for the sites that allow it, otherwise a link card. */
export function embedOf(url: string): Embed | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const frame = (src: string, ratio = "16 / 9") => ({
    kind: "frame" as const,
    src,
    ratio,
    host: h,
  });
  const yt =
    h === "youtu.be"
      ? u.pathname.slice(1)
      : h.endsWith("youtube.com")
        ? (u.searchParams.get("v") ??
          /^\/(?:shorts|embed|live)\/([\w-]+)/.exec(u.pathname)?.[1] ??
          "")
        : "";
  if (yt)
    return frame(
      `https://www.youtube-nocookie.com/embed/${yt}`,
      u.pathname.startsWith("/shorts") ? "9 / 16" : "16 / 9",
    );
  const vimeo = h.endsWith("vimeo.com") && /\/(\d+)/.exec(u.pathname)?.[1];
  if (vimeo) return frame(`https://player.vimeo.com/video/${vimeo}`);
  const loom = h.endsWith("loom.com") && /\/share\/([\w-]+)/.exec(u.pathname)?.[1];
  if (loom) return frame(`https://www.loom.com/embed/${loom}`);
  if (h.endsWith("figma.com"))
    return frame(`https://www.figma.com/embed?embed_host=gecko&url=${encodeURIComponent(u.href)}`);
  if (h === "docs.google.com") {
    const m = /^\/(document|spreadsheets|presentation|forms)\/d\/([\w-]+)/.exec(u.pathname);
    if (m)
      return frame(
        `https://docs.google.com/${m[1]}/d/${m[2]}/preview`,
        m[1] === "presentation" ? "16 / 9" : "4 / 3",
      );
  }
  if (h === "drive.google.com") {
    const id = /\/file\/d\/([\w-]+)/.exec(u.pathname)?.[1] ?? u.searchParams.get("id");
    if (id) return frame(`https://drive.google.com/file/d/${id}/preview`);
  }
  if ((h === "google.com" || h.endsWith(".google.com")) && u.pathname.startsWith("/maps"))
    return frame(
      `https://maps.google.com/maps?q=${encodeURIComponent(decodeURIComponent((u.pathname.split("/")[3] ?? u.searchParams.get("q") ?? "").replace(/\+/g, " ")))}&output=embed`,
      "16 / 9",
    );
  const ig = h === "instagram.com" && /^\/(p|reel)\/([\w-]+)/.exec(u.pathname);
  if (ig) return frame(`https://www.instagram.com/${ig[1]}/${ig[2]}/embed`, "4 / 5");
  const tt = h.endsWith("tiktok.com") && /\/video\/(\d+)/.exec(u.pathname)?.[1];
  if (tt) return frame(`https://www.tiktok.com/embed/v2/${tt}`, "9 / 16");
  if (h === "open.spotify.com")
    return frame(`https://open.spotify.com/embed${u.pathname}`, "5 / 2");
  if (h.endsWith("canva.com") && u.pathname.includes("/design/"))
    return frame(`${u.origin}${u.pathname.replace(/\/(edit|view).*$/, "")}/view?embed`);
  return { kind: "link", host: h };
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
      case "table":
        return (b.rows ?? []).map((r) => r.join(" | ")).join("\n");
      case "calc": {
        const v = calculate(b.text);
        return v === null ? b.text : `${b.text} = ${fmtNum(v)}`;
      }
      case "embed":
      case "image":
        return b.url ?? "";
      case "toggle":
        return `▸ ${b.text}${b.body ? `\n${b.body}` : ""}`;
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
  icon: IconName;
  kind: "page" | "doc";
  blurb: string;
  blocks: () => Block[];
}

const f = (label: string, text = "") => block("field", text, { label });

export const TEMPLATES: Template[] = [
  {
    key: "blank",
    name: "Blank page",
    icon: "page",
    kind: "page",
    blurb: "Start from nothing. Type / for blocks.",
    blocks: () => [block("text")],
  },
  {
    key: "brief",
    name: "Creative brief",
    icon: "pen",
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
    icon: "spark",
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
    icon: "phone",
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
    icon: "receipt",
    kind: "doc",
    blurb: "Line-by-line price for a package, ready to accept.",
    blocks: () => [
      f("Quote no.", "Q-[year]-[n]"),
      f("For"),
      f("Valid until"),
      block("h1", "The package"),
      block("table", "", {
        rows: [
          ["What", "Qty", "Price (DT)"],
          ["Reels 9:16", "", ""],
          ["Shoot day", "1", ""],
          ["Edit, subtitles, 3 formats", "", ""],
        ],
      }),
      block("text", "Ideas, scripts and casting are included."),
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
    key: "budget",
    name: "Budget",
    icon: "chart",
    kind: "page",
    blurb: "Costs in a table that adds itself up, and a calculator.",
    blocks: () => [
      f("Project"),
      f("Cap", "[amount] DT"),
      block("h2", "Costs"),
      block("table", "", {
        rows: [
          ["What", "Who", "Cost (DT)"],
          ["Studio", "", ""],
          ["Talent", "", ""],
          ["Props", "", ""],
        ],
      }),
      block("h2", "Quick maths"),
      block("calc", "2900 * 15%"),
      block("callout", "Approve the total with the client before booking anything."),
    ],
  },
  {
    key: "ugc-brief",
    name: "Creator brief",
    icon: "user",
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
    icon: "image",
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
    icon: "list",
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
    icon: "chart",
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
    icon: "flag",
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
    icon: "mail",
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
    icon: "clock",
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
    icon: "grid",
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
    icon: "check",
    kind: "page",
    blurb: "Anything to tick off.",
    blocks: () => [block("todo"), block("todo"), block("todo")],
  },
];
