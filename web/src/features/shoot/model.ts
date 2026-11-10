import { locale, t } from "@/lib/i18n";

/**
 * Shoot Day: one live page per shoot day, the same for the team and the client
 * (supabase/migrations/202611210001_shoot_days.sql). The database decides what each person sees and may do.
 */

export type ReelStatus = "todo" | "shooting" | "done" | "pickup";
export type DayState = "planned" | "live" | "wrapped";
export type PersonSide = "gecko" | "crew" | "talent" | "client";

export const REEL_STATUSES: ReelStatus[] = ["todo", "shooting", "done", "pickup"];
export const PERSON_SIDES: PersonSide[] = ["gecko", "crew", "talent", "client"];

/** One line of a script as it is stored (scripts/model.ts ScriptLine). */
export interface StoredLine {
  see?: string;
  hear?: string;
  text?: string;
  part?: string;
}

export interface ShootReel {
  id: string;
  scriptId: string;
  title: string;
  style: string;
  seconds: number;
  scriptStatus: string;
  position: number;
  slot: string;
  status: ReelStatus;
  note: string;
  linesDone: string[];
  lineChanges: Record<string, string>;
  updatedBy: string;
  updatedAt: string;
  /** False when the client can't read the lines yet (a draft). */
  shared: boolean;
  hooks: StoredLine[];
  beats: StoredLine[];
  cta: string;
  /** The hook the client chose, if any. */
  hook: number | null;
  talent: string[];
  set: string | null;
  props: string[];
  extraProps: string;
}

export interface ShootPerson {
  id: string;
  name: string;
  role: string;
  side: PersonSide;
  callTime: string | null;
  /** Team only. */
  phone: string | null;
}

export interface ShootLogEntry {
  id: string;
  body: string;
  fromClient: boolean;
  authorName: string;
  createdAt: string;
}

export interface ShootDay {
  id: string;
  /** The project the day belongs to; missing on a database without projects yet. */
  projectId?: string | null;
  /** YYYY-MM-DD */
  day: string;
  title: string;
  callTime: string | null;
  wrapTime: string | null;
  place: string;
  address: string;
  mapLink: string;
  notes: string;
  state: DayState;
  /** Team only. */
  privateNotes: string | null;
  authorName: string;
  updatedAt: string;
  reels: ShootReel[];
  people: ShootPerson[];
  log: ShootLogEntry[];
}

export interface PlanScript {
  id: string;
  title: string;
  status: string;
  style: string;
}

export interface ShootPage {
  team: boolean;
  canPlan: boolean;
  canTick: boolean;
  days: ShootDay[];
  scripts: PlanScript[];
}

/** One shoot in the team's list across clients. */
export interface TeamShoot {
  id: string;
  clientId: string;
  brand: string;
  day: string;
  title: string;
  callTime: string | null;
  place: string;
  state: DayState;
  reels: number;
  done: number;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

function normaliseLine(v: unknown): StoredLine {
  const o = obj(v);
  return { see: str(o.see), hear: str(o.hear), text: str(o.text), part: str(o.part) };
}

function normaliseReel(v: unknown): ShootReel {
  const o = obj(v);
  const changes: Record<string, string> = {};
  for (const [k, value] of Object.entries(obj(o.lineChanges)))
    if (typeof value === "string") changes[k] = value;
  return {
    id: str(o.id),
    scriptId: str(o.scriptId),
    title: str(o.title),
    style: str(o.style),
    seconds: num(o.seconds, 30),
    scriptStatus: str(o.scriptStatus),
    position: num(o.position),
    slot: str(o.slot),
    status: oneOf(o.status, REEL_STATUSES, "todo"),
    note: str(o.note),
    linesDone: arr(o.linesDone).filter((k): k is string => typeof k === "string"),
    lineChanges: changes,
    updatedBy: str(o.updatedBy),
    updatedAt: str(o.updatedAt),
    shared: o.shared !== false,
    hooks: arr(o.hooks).map(normaliseLine),
    beats: arr(o.beats).map(normaliseLine),
    cta: str(o.cta),
    hook: typeof o.hook === "number" ? o.hook : null,
    talent: arr(o.talent).filter((x): x is string => typeof x === "string"),
    set: strOrNull(o.set),
    props: arr(o.props).filter((x): x is string => typeof x === "string"),
    extraProps: str(o.extraProps),
  };
}

function normaliseDay(v: unknown): ShootDay {
  const o = obj(v);
  return {
    id: str(o.id),
    projectId: strOrNull(o.projectId),
    day: str(o.day),
    title: str(o.title),
    callTime: strOrNull(o.callTime),
    wrapTime: strOrNull(o.wrapTime),
    place: str(o.place),
    address: str(o.address),
    mapLink: str(o.mapLink),
    notes: str(o.notes),
    state: oneOf(o.state, ["planned", "live", "wrapped"] as const, "planned"),
    privateNotes: typeof o.privateNotes === "string" ? o.privateNotes : null,
    authorName: str(o.authorName),
    updatedAt: str(o.updatedAt),
    reels: arr(o.reels).map(normaliseReel),
    people: arr(o.people).map((p) => {
      const q = obj(p);
      return {
        id: str(q.id),
        name: str(q.name),
        role: str(q.role),
        side: oneOf(q.side, PERSON_SIDES, "crew"),
        callTime: strOrNull(q.callTime),
        phone: strOrNull(q.phone),
      };
    }),
    log: arr(o.log).map((l) => {
      const q = obj(l);
      return {
        id: str(q.id),
        body: str(q.body),
        fromClient: q.fromClient === true,
        authorName: str(q.authorName),
        createdAt: str(q.createdAt),
      };
    }),
  };
}

export function normaliseShootPage(data: unknown): ShootPage {
  const o = obj(data);
  return {
    team: o.team === true,
    canPlan: o.canPlan === true,
    canTick: o.canTick === true,
    days: arr(o.days).map(normaliseDay),
    scripts: arr(o.scripts).map((s) => {
      const q = obj(s);
      return { id: str(q.id), title: str(q.title), status: str(q.status), style: str(q.style) };
    }),
  };
}

export function normaliseTeamShoots(data: unknown): TeamShoot[] {
  return arr(data).map((v) => {
    const o = obj(v);
    return {
      id: str(o.id),
      clientId: str(o.clientId),
      brand: str(o.brand),
      day: str(o.day),
      title: str(o.title),
      callTime: strOrNull(o.callTime),
      place: str(o.place),
      state: oneOf(o.state, ["planned", "live", "wrapped"] as const, "planned"),
      reels: num(o.reels),
      done: num(o.done),
    };
  });
}

// ---------- the reader ----------

export type LineKind = "hook" | "beat" | "cta";

/** One line to read to the talent, in the order it gets shot. */
export interface ReaderLine {
  /** The key the script uses for this line: hook-0, beat-3, cta. */
  key: string;
  kind: LineKind;
  /** For hooks: 0 for A, 1 for B… */
  index: number;
  /** What the talent says, with any change made on set. */
  words: string;
  /** The words as written, when they were changed on set. */
  written: string | null;
  /** What we see: a direction for the talent and the camera. */
  see: string;
  /** Words on screen, added in the edit. */
  onScreen: string;
  /** The hook the client picked. */
  chosen: boolean;
}

/** A line's spoken words: what is heard, or else the words on screen. */
const spoken = (l: StoredLine) => (l.hear?.trim() || l.text?.trim() || "").trim();

/** Every line of a reel to read, hook options first (each gets shot), then the body, then the call to action. */
export function readerLines(reel: ShootReel): ReaderLine[] {
  const lines: ReaderLine[] = [];
  const add = (key: string, kind: LineKind, index: number, l: StoredLine, chosen = false) => {
    const written = spoken(l);
    const changed = reel.lineChanges[key];
    const words = changed ?? written;
    if (!words && !l.see?.trim()) return;
    lines.push({
      key,
      kind,
      index,
      words,
      written: changed !== undefined && changed !== written ? written : null,
      see: l.see?.trim() ?? "",
      onScreen: l.hear?.trim() ? (l.text?.trim() ?? "") : "",
      chosen,
    });
  };
  reel.hooks.slice(0, 3).forEach((h, i) => add(`hook-${i}`, "hook", i, h, reel.hook === i));
  reel.beats.slice(0, 100).forEach((b, i) => add(`beat-${i}`, "beat", i, b));
  if (reel.cta.trim() || reel.lineChanges.cta) add("cta", "cta", 0, { hear: reel.cta });
  return lines;
}

/** "Hook A", "Line 3", "Call to action". */
export function lineLabel(line: ReaderLine, beatNumber: number): string {
  if (line.kind === "hook")
    return `${t("Hook", "Accroche")} ${String.fromCharCode(65 + line.index)}`;
  if (line.kind === "cta") return t("Call to action", "Appel à l'action");
  return `${t("Line", "Ligne")} ${beatNumber}`;
}

/** Ticks a line read, or un-ticks it, keeping each key once and in a stable order. */
export function toggleLine(done: readonly string[], key: string, on: boolean): string[] {
  const set = new Set(done);
  if (on) set.add(key);
  else set.delete(key);
  return [...set].sort();
}

/** The words as said on set: a change only when they differ from what's written; an empty change goes away. */
export function changeLine(
  changes: Readonly<Record<string, string>>,
  key: string,
  words: string,
  written: string,
): Record<string, string> {
  const next = { ...changes };
  const said = words.trim();
  if (!said || said === written.trim()) delete next[key];
  else next[key] = said;
  return next;
}

/** About how long the lines take to say, at the pace of an ad (2.5 words a second). */
export function readSeconds(lines: readonly ReaderLine[]): number {
  const count = lines.reduce((n, l) => n + l.words.split(/\s+/).filter(Boolean).length, 0);
  return Math.round(count / 2.5);
}

// ---------- the day ----------

export interface Progress {
  total: number;
  done: number;
  shooting: number;
  pickup: number;
}

export function progress(reels: readonly Pick<ShootReel, "status">[]): Progress {
  return {
    total: reels.length,
    done: reels.filter((r) => r.status === "done").length,
    shooting: reels.filter((r) => r.status === "shooting").length,
    pickup: reels.filter((r) => r.status === "pickup").length,
  };
}

/** The reel to shoot next: the one being shot, or else the first not done. */
export function nextReel<T extends Pick<ShootReel, "status">>(reels: readonly T[]): T | null {
  return (
    reels.find((r) => r.status === "shooting") ?? reels.find((r) => r.status === "todo") ?? null
  );
}

export function statusName(status: ReelStatus): string {
  return {
    todo: t("To shoot", "À tourner"),
    shooting: t("Shooting", "En cours"),
    done: t("Done", "Fait"),
    pickup: t("Needs a pick-up", "À retourner"),
  }[status];
}

export function stateName(state: DayState): string {
  return {
    planned: t("Planned", "Prévu"),
    live: t("Shooting now", "Tournage en cours"),
    wrapped: t("Wrapped", "Terminé"),
  }[state];
}

export function sideName(side: PersonSide): string {
  return {
    gecko: "Gecko",
    crew: t("Crew", "Équipe"),
    talent: t("Talent", "Talents"),
    client: t("Client", "Client"),
  }[side];
}

/** "Wed 25 Nov" */
export function dayLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Today, tomorrow, in 3 days, 2 days ago. */
export function relativeDay(iso: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
  if (Number.isNaN(days)) return "";
  if (days === 0) return t("Today", "Aujourd'hui");
  if (days === 1) return t("Tomorrow", "Demain");
  if (days === -1) return t("Yesterday", "Hier");
  if (days > 1) return t(`In ${days} days`, `Dans ${days} jours`);
  return t(`${-days} days ago`, `Il y a ${-days} jours`);
}

/** Upcoming days first (soonest first), then past days (most recent first). */
export function splitDays<T extends { day: string }>(
  days: readonly T[],
  today: string,
): { upcoming: T[]; past: T[] } {
  const upcoming = days.filter((d) => d.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  const past = days.filter((d) => d.day < today).sort((a, b) => b.day.localeCompare(a.day));
  return { upcoming, past };
}

/** A map link for the day: the one given, or a search for the address. */
export function mapHref(day: Pick<ShootDay, "mapLink" | "address" | "place">): string | null {
  if (day.mapLink) return day.mapLink;
  const where = day.address.trim() || day.place.trim();
  return where
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`
    : null;
}

/** A WhatsApp link to a phone number, or null when there's no number to dial. */
export function whatsappTo(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  // Tunisian numbers are 8 digits; add the country code when it's missing.
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

/** The call sheet as a message for WhatsApp: everything people need to get there on time. */
export function callSheet(brand: string, day: ShootDay): string {
  const out: string[] = [];
  out.push(`*${brand}: ${day.title || t("Shoot day", "Tournage")}*`);
  out.push(dayLabel(day.day));
  if (day.callTime || day.wrapTime)
    out.push(
      [
        day.callTime ? `${t("Call", "Convocation")} ${day.callTime}` : "",
        day.wrapTime ? `${t("Wrap", "Fin")} ${day.wrapTime}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
  const where = [day.place, day.address].filter((s) => s.trim()).join(", ");
  if (where) out.push(`${t("Where", "Où")}: ${where}`);
  const map = mapHref(day);
  if (map) out.push(map);
  if (day.people.length) {
    out.push("");
    out.push(`*${t("People", "Équipe")}*`);
    for (const p of day.people)
      out.push(`- ${p.name}${p.role ? ` (${p.role})` : ""}${p.callTime ? `, ${p.callTime}` : ""}`);
  }
  if (day.reels.length) {
    out.push("");
    out.push(`*${t("Reels", "Vidéos")} (${day.reels.length})*`);
    day.reels.forEach((r, i) => {
      const who = r.talent.length ? `: ${r.talent.join(", ")}` : "";
      out.push(`${i + 1}. ${r.slot ? `${r.slot} ` : ""}${r.title}${who}`);
    });
  }
  if (day.notes.trim()) {
    out.push("");
    out.push(day.notes.trim());
  }
  return out.join("\n");
}
