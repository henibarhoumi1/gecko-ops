// The studio's lists of talent and locations (supabase/migrations/202612040001_studio_roster.sql).

export type RosterKind = "talent" | "location";

export interface RosterEntry {
  id: string;
  workspace_id: string;
  kind: RosterKind;
  name: string;
  role: string;
  city: string;
  phone: string;
  instagram: string;
  link: string;
  photo_url: string;
  rate: number | null;
  rate_note: string;
  tags: string[];
  notes: string;
  rating: number | null;
  hidden: boolean;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export type RosterInput = Pick<
  RosterEntry,
  | "kind"
  | "name"
  | "role"
  | "city"
  | "phone"
  | "instagram"
  | "link"
  | "photo_url"
  | "rate"
  | "rate_note"
  | "tags"
  | "notes"
  | "rating"
>;

export const ROLES: Record<RosterKind, string[]> = {
  talent: ["Actor", "Model", "Creator", "Voice", "Extra", "Host"],
  location: ["Studio", "Home", "Shop", "Café", "Outdoor", "Office"],
};

export const KIND_LABEL: Record<RosterKind, { one: string; many: string }> = {
  talent: { one: "Talent", many: "Talent" },
  location: { one: "Location", many: "Locations" },
};

export function blank(kind: RosterKind): RosterInput {
  return {
    kind,
    name: "",
    role: "",
    city: "",
    phone: "",
    instagram: "",
    link: "",
    photo_url: "",
    rate: null,
    rate_note: "",
    tags: [],
    notes: "",
    rating: null,
  };
}

/** "summer, outdoor , Summer" -> ["summer", "outdoor"]: trimmed, lower case, no repeats, at most 12. */
export function parseTags(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const tag = raw.trim().toLowerCase().slice(0, 40);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 12);
}

export interface RosterFilter {
  q: string;
  role: string;
  tag: string;
  showHidden: boolean;
}

/** Entries that match the search (name, role, city, tags, notes), the role and the tag; hidden ones only on ask. */
export function filterRoster(list: readonly RosterEntry[], f: RosterFilter): RosterEntry[] {
  const q = f.q.trim().toLowerCase();
  return list
    .filter((e) => (f.showHidden ? true : !e.hidden))
    .filter((e) => !f.role || e.role.toLowerCase() === f.role.toLowerCase())
    .filter((e) => !f.tag || e.tags.includes(f.tag))
    .filter(
      (e) =>
        !q || [e.name, e.role, e.city, e.notes, ...e.tags].some((v) => v.toLowerCase().includes(q)),
    )
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
}

/** Every tag used in a list, most used first. */
export function allTags(list: readonly RosterEntry[]): string[] {
  const n = new Map<string, number>();
  for (const e of list) for (const t of e.tags) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** "@yasmine" or a pasted profile URL -> a link to the Instagram profile. */
export function instagramLink(handle: string): string | null {
  const h = handle
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0];
  return h && /^[\w.]{1,40}$/.test(h) ? `https://instagram.com/${h}` : null;
}

/** "Ya" for "Yasmine Ben Ali" -> "YB": two letters for the card when there's no photo. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
