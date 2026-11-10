import { t } from "@/lib/i18n";

export interface Present {
  name: string;
  team: boolean;
}

/**
 * The page as both sides name it, so the team on /clients/<id>/scripts and the client on /scripts meet:
 * the first part after the client, nothing after it.
 */
export function pagePath(pathname: string, clientId?: string): string {
  let parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "preview") parts = parts.slice(3);
  if (clientId && parts[0] === "clients" && decodeURIComponent(parts[1] ?? "") === clientId)
    parts = parts.slice(2);
  return `/${parts[0] ?? ""}`;
}

export const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** "Sara is here too", "Sara and Omar are here too", "Sara and 2 others are here too". */
export function hereLine(people: readonly Present[], reader: "client" | "team"): string {
  const name = (p: Present) => (p.team && reader === "client" ? `${p.name} (Gecko)` : p.name);
  if (people.length === 0) return "";
  if (people.length === 1)
    return t(`${name(people[0]!)} is here too`, `${name(people[0]!)} est là aussi`);
  if (people.length === 2)
    return t(
      `${name(people[0]!)} and ${name(people[1]!)} are here too`,
      `${name(people[0]!)} et ${name(people[1]!)} sont là aussi`,
    );
  return t(
    `${name(people[0]!)} and ${people.length - 1} others are here too`,
    `${name(people[0]!)} et ${people.length - 1} autres sont là aussi`,
  );
}
