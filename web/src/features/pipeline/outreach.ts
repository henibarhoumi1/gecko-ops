import { isOpen, STAGE_LABEL, stepOf, type Lead, type Stage } from "./model";

/** What the Pipeline knows about a lead beyond its columns: the log of touches and free notes. */
export interface Touch {
  at: string;
  moment: Moment | null;
  channel: string;
  text: string;
}

export type Moment = "first" | "follow" | "after_call" | "proposal" | "last";
export type Lang = "tn" | "fr" | "en";
export type Channel = "dm" | "whatsapp" | "email";

export const MOMENTS: Moment[] = ["first", "follow", "after_call", "proposal", "last"];
export const LANGS: Lang[] = ["tn", "fr", "en"];
export const CHANNELS_OUT: Channel[] = ["dm", "whatsapp", "email"];

export const MOMENT_LABEL: Record<Moment, string> = {
  first: "First message",
  follow: "Follow-up",
  after_call: "After the call",
  proposal: "Proposal",
  last: "Last try",
};
export const LANG_LABEL: Record<Lang, string> = { tn: "Tunisian", fr: "French", en: "English" };
export const CHANNEL_LABEL: Record<Channel, string> = {
  dm: "Instagram DM",
  whatsapp: "WhatsApp",
  email: "Email",
};

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** The touches logged on a lead, newest first. Older entries from the first app are read as they come. */
export function touches(lead: Pick<Lead, "log">): Touch[] {
  const list = Array.isArray(lead.log) ? lead.log : [];
  return list
    .map((v) => {
      const o = obj(v);
      const at = typeof o.at === "string" ? o.at : typeof o.date === "string" ? o.date : "";
      const text = typeof o.text === "string" ? o.text : typeof o.note === "string" ? o.note : "";
      return {
        at,
        moment: MOMENTS.includes(o.moment as Moment) ? (o.moment as Moment) : null,
        channel: typeof o.channel === "string" ? o.channel : "",
        text,
      };
    })
    .filter((t) => t.at || t.text)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** What you noticed about the brand: the hook of a first message. */
export function noticed(lead: Pick<Lead, "extra">): string {
  const v = obj(lead.extra).noticed;
  return typeof v === "string" ? v : "";
}

/** Whole days from one ISO date (or timestamp) to another. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b) ? 0 : Math.round((b - a) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "today", "yesterday", "5 days ago", or "never". */
export function lastTouchText(lead: Pick<Lead, "log">, today: string): string {
  const last = touches(lead)[0];
  if (!last?.at) return "never";
  const days = daysBetween(last.at, today);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// ---------- adding leads fast ----------

export interface ParsedLead {
  brand: string;
  handle: string | null;
  url: string | null;
  channel: string;
}

const titleCase = (s: string) =>
  s
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * One lead per line: an Instagram or TikTok handle or link, a website, or a brand name.
 * "@crush__cookies", "instagram.com/crush__cookies", "https://dany-clean.tn", "Dany Clean".
 */
export function parseLine(line: string): ParsedLead | null {
  const raw = line.trim().replace(/^[-•*\d.)\s]+(?=\S)/, "");
  if (!raw) return null;
  const social =
    /(?:https?:\/\/)?(?:www\.)?(instagram\.com|tiktok\.com)\/@?([A-Za-z0-9._]{1,30})/i.exec(raw);
  if (social) {
    const tiktok = social[1]!.toLowerCase().startsWith("tiktok");
    const handle = social[2]!;
    return {
      brand: titleCase(handle),
      handle: `@${handle}`,
      url: `https://www.${tiktok ? "tiktok.com/@" : "instagram.com/"}${handle}`,
      channel: tiktok ? "tiktok_organic" : "ig_organic",
    };
  }
  const at = /^@([A-Za-z0-9._]{1,30})$/.exec(raw);
  if (at)
    return {
      brand: titleCase(at[1]!),
      handle: `@${at[1]!}`,
      url: `https://www.instagram.com/${at[1]!}`,
      channel: "ig_organic",
    };
  const site = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(\/\S*)?$/i.exec(
    raw,
  );
  if (site) {
    const host = site[1]!.toLowerCase();
    return {
      brand: titleCase(host.split(".")[0]!),
      handle: null,
      url: /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
      channel: "outbound_dm",
    };
  }
  return { brand: raw.slice(0, 160), handle: null, url: null, channel: "outbound_dm" };
}

const sameHandle = (a: string | null, b: string | null) =>
  !!a && !!b && a.replace(/^@/, "").toLowerCase() === b.replace(/^@/, "").toLowerCase();

/** The pasted lines as new leads, skipping blanks, repeats and brands already in the pipeline. */
export function parsePaste(
  text: string,
  existing: readonly Pick<Lead, "brand" | "handle">[],
): { fresh: ParsedLead[]; skipped: string[] } {
  const fresh: ParsedLead[] = [];
  const skipped: string[] = [];
  for (const line of text.split(/[\n,;]+/)) {
    const p = parseLine(line);
    if (!p) continue;
    const dup = [...existing, ...fresh].some(
      (l) =>
        sameHandle(l.handle, p.handle) ||
        (!p.handle && l.brand.trim().toLowerCase() === p.brand.trim().toLowerCase()),
    );
    if (dup) skipped.push(p.handle ?? p.brand);
    else fresh.push(p);
  }
  return { fresh, skipped };
}

// ---------- the messages ----------

interface Words {
  name: string;
  brand: string;
  noticed: string;
}

const TEMPLATES: Record<Moment, Record<Lang, (w: Words) => string>> = {
  first: {
    en: (w) =>
      `Hi ${w.name}, Heni from Gecko here, a video ad studio in Tunis. ${w.noticed}We make short ads that sell, shot and edited for Reels and TikTok. Can I send you two video ideas for ${w.brand}?`,
    fr: (w) =>
      `Bonjour ${w.name}, c'est Heni de Gecko, un studio de pubs vidéo à Tunis. ${w.noticed}On fait des vidéos courtes qui vendent, pensées pour Reels et TikTok. Je peux vous envoyer deux idées de vidéos pour ${w.brand} ?`,
    tn: (w) =>
      `Aslema ${w.name}, ena Heni men Gecko, studio pub vidéo f Tounes. ${w.noticed}Na3mlou vidéos 9sar ybi3ou, lel Reels w TikTok. Tnajem nab3athlek zouz idées vidéos l ${w.brand}?`,
  },
  follow: {
    en: (w) =>
      `Hi ${w.name}, bringing this back up. I have two video ideas for ${w.brand} ready. Shall I send them here?`,
    fr: (w) =>
      `Bonjour ${w.name}, je me permets de revenir vers vous. J'ai deux idées de vidéos prêtes pour ${w.brand}. Je vous les envoie ici ?`,
    tn: (w) =>
      `Aslema ${w.name}, nraja3lek 3al message. 3andi zouz idées vidéos l ${w.brand} 7adhrin. Nab3athhomlek lehna?`,
  },
  after_call: {
    en: (w) =>
      `Thanks for your time today, ${w.name}. I'm putting the proposal for ${w.brand} together and will send it within two days. Anything you want me to include?`,
    fr: (w) =>
      `Merci pour l'échange, ${w.name}. Je prépare la proposition pour ${w.brand} et vous l'envoie sous deux jours. Quelque chose à ajouter d'ici là ?`,
    tn: (w) =>
      `Merci 3al wa9t, ${w.name}. Nhadher fel proposition l ${w.brand} w nab3athhalek fi zouz jours. Fama 7aja t7eb nzidha?`,
  },
  proposal: {
    en: (w) =>
      `Hi ${w.name}, the proposal for ${w.brand} is ready: the plan, the reels, the shoot day and the price. I'm sending it here now. Happy to go through it on a 10-minute call.`,
    fr: (w) =>
      `Bonjour ${w.name}, la proposition pour ${w.brand} est prête : le plan, les vidéos, le jour de tournage et le prix. Je vous l'envoie ici. On peut la parcourir en 10 minutes au téléphone si vous voulez.`,
    tn: (w) =>
      `Aslema ${w.name}, el proposition l ${w.brand} 7adhra: el plan, el vidéos, nhar el tournage w el prix. Nab3athhalek lehna. Ken t7eb nchoufouha m3a ba3dhna f 10 minutes 3al téléphone.`,
  },
  last: {
    en: (w) =>
      `Hi ${w.name}, last message on this, promise. If video ads for ${w.brand} become a priority later, I'm one message away.`,
    fr: (w) =>
      `Bonjour ${w.name}, dernier message, promis. Si les pubs vidéo pour ${w.brand} deviennent une priorité, je suis à un message.`,
    tn: (w) =>
      `Aslema ${w.name}, ekher message, promis. Ki twalli el pub vidéo l ${w.brand} priorité, ena 9rib, message bark.`,
  },
};

/** The first name to greet: the contact's, or else the brand. */
export function greetName(lead: Pick<Lead, "contact" | "brand">): string {
  const first = (lead.contact ?? "").trim().split(/\s+/)[0];
  return first || lead.brand.trim();
}

/** A ready message for this lead, this moment and this language. */
export function compose(
  lead: Pick<Lead, "contact" | "brand" | "extra">,
  moment: Moment,
  lang: Lang,
): string {
  const note = noticed(lead).trim();
  const sentence = note ? `${/[.!?]$/.test(note) ? note : `${note}.`} ` : "";
  return TEMPLATES[moment][lang]({
    name: greetName(lead),
    brand: lead.brand.trim(),
    noticed: moment === "first" ? sentence : "",
  });
}

/** The moment that fits where the lead is now. */
export function suggestedMoment(lead: Pick<Lead, "stage" | "log">): Moment {
  const step = stepOf(lead.stage);
  if (step === "prospect") return "first";
  if (step === "meeting_booked") return "after_call";
  if (step === "proposal_sent" || step === "signed") return "proposal";
  return touches(lead).length >= 3 ? "last" : "follow";
}

const STAGE_ORDER: Stage[] = ["prospect", "contacted", "meeting_booked", "proposal_sent", "signed"];
const atLeast = (stage: Stage, floor: Stage): Stage =>
  STAGE_ORDER.indexOf(stepOf(stage) as Stage) >= STAGE_ORDER.indexOf(floor) ? stage : floor;

/** What sending a message changes: the touch is logged, the stage moves on, the next follow-up is set. */
export function afterSend(
  lead: Pick<Lead, "stage" | "history" | "log" | "owner_member_id">,
  moment: Moment,
  channel: Channel,
  text: string,
  now: string,
  me: string | null,
): Pick<Lead, "stage" | "history" | "log" | "next_step" | "next_date" | "owner_member_id"> {
  const today = now.slice(0, 10);
  const plan: Record<Moment, { floor: Stage | "nurture"; next: string; days: number }> = {
    first: { floor: "contacted", next: "Follow up", days: 3 },
    follow: { floor: "contacted", next: "Follow up again", days: 4 },
    after_call: { floor: "meeting_booked", next: "Send the proposal", days: 2 },
    proposal: { floor: "proposal_sent", next: "Follow up on the proposal", days: 3 },
    last: { floor: "nurture", next: "Check in again", days: 60 },
  };
  const p = plan[moment];
  const stage: Stage =
    p.floor === "nurture"
      ? "nurture"
      : isOpen(lead.stage)
        ? atLeast(lead.stage, p.floor)
        : lead.stage;
  const history = Array.isArray(lead.history) ? lead.history : [];
  const log = Array.isArray(lead.log) ? lead.log : [];
  return {
    stage,
    history: stage !== lead.stage ? [...history, { at: today, stage }] : history,
    log: [...log, { at: now, moment, channel, text }],
    next_step: p.next,
    next_date: addDays(today, p.days),
    owner_member_id: lead.owner_member_id ?? me,
  };
}

/** A ready prompt for Claude with everything about the lead, to write the message in your voice. */
export function claudeBrief(lead: Lead, moment: Moment, lang: Lang, channel: Channel): string {
  const past = touches(lead).slice(0, 5);
  const lines = [
    `Write a ${MOMENT_LABEL[moment].toLowerCase()} message to send as an ${CHANNEL_LABEL[channel]}, in ${LANG_LABEL[lang]}${lang === "tn" ? " (Tunisian Derja in Latin letters, the way people text)" : ""}.`,
    "",
    "From: Heni, founder of Gecko, a video ad studio in Tunis. Gecko makes short ads that sell, shot and edited for Reels and TikTok, for brands in Tunisia.",
    `To: ${lead.contact || "the founder or marketing lead"} at ${lead.brand}${lead.handle ? ` (${lead.handle})` : ""}.`,
    lead.url ? `Their page: ${lead.url}` : "",
    lead.sector ? `Sector: ${lead.sector}` : "",
    `Where we are: ${STAGE_LABEL[stepOf(lead.stage)]}.`,
    noticed(lead) ? `What I noticed about them: ${noticed(lead)}` : "",
    past.length
      ? `Messages so far, newest first:\n${past.map((t) => `- ${t.at.slice(0, 10)}: ${t.text}`).join("\n")}`
      : "",
    "",
    "Keep it under 60 words, warm and direct, no emojis, no hype words. One specific detail about their brand. End with one easy question. Give me three versions.",
  ];
  return lines.filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== "")).join("\n");
}
