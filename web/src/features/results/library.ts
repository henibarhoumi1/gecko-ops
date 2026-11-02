import { t } from "@/lib/i18n";

export type ItemKind = "clip" | "still";

export interface LibraryItem {
  id: string;
  kind: ItemKind;
  title: string;
  shoot: string;
  shotOn: string | null;
  tags: string[];
  seconds: number | string | null;
  thumb: string | null;
  /** The Drive file. Empty for the client. */
  link: string;
  talentId: string | null;
  talent: { name: string; usageTerms: string } | null;
  createdAt: string;
}

export interface LibraryPage {
  team: boolean;
  items: LibraryItem[];
  talent: { id: string; name: string }[];
}

export function normaliseLibrary(data: unknown): LibraryPage {
  const d = (data ?? {}) as Partial<LibraryPage>;
  return { team: Boolean(d.team), items: d.items ?? [], talent: d.talent ?? [] };
}

/** The tags every shoot gets, in this order; anything else typed in comes after. */
export const BASE_TAGS: [string, string, string][] = [
  ["product", "Product", "Produit"],
  ["hands", "Hands", "Mains"],
  ["texture", "Texture", "Texture"],
  ["lifestyle", "Lifestyle", "Lifestyle"],
  ["place", "Place", "Lieu"],
  ["person", "Person", "Personne"],
];

export function tagName(tag: string): string {
  const base = BASE_TAGS.find(([k]) => k === tag);
  return base ? t(base[1], base[2]) : tag.charAt(0).toUpperCase() + tag.slice(1);
}

/** Every tag in use, base tags first, then the rest by how often they come up. */
export function tagsInUse(items: LibraryItem[]): string[] {
  const count = new Map<string, number>();
  for (const i of items) for (const tag of i.tags) count.set(tag, (count.get(tag) ?? 0) + 1);
  const base = BASE_TAGS.map(([k]) => k).filter((k) => count.has(k));
  const rest = [...count.keys()]
    .filter((k) => !base.includes(k))
    .sort((a, b) => count.get(b)! - count.get(a)! || a.localeCompare(b));
  return [...base, ...rest];
}

export function shootsInUse(items: LibraryItem[]): string[] {
  return [...new Set(items.map((i) => i.shoot).filter(Boolean))];
}

/** Items with every chosen tag, from the chosen shoot. */
export function filterItems(
  items: LibraryItem[],
  f: { tags: string[]; shoot: string; kind: ItemKind | "" },
): LibraryItem[] {
  return items.filter(
    (i) =>
      (!f.shoot || i.shoot === f.shoot) &&
      (!f.kind || i.kind === f.kind) &&
      f.tags.every((tag) => i.tags.includes(tag)),
  );
}

/** "product, Hands , texture" → ["product", "hands", "texture"]. */
export const parseTags = (text: string) => [
  ...new Set(
    text
      .split(/[,#\n]/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  ),
];
