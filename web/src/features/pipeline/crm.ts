// The Pipeline as a CRM table: every lead with the columns that matter, sortable.
import { STAGES, type Lead } from "./model";
import { touches } from "./outreach";

export type SortKey = "brand" | "stage" | "owner" | "value" | "touch" | "next" | "created";

export function lastTouchAt(lead: Pick<Lead, "log">): string {
  return touches(lead)[0]?.at ?? "";
}

/** Sorts a copy of the leads by a column; empty values always go last. */
export function sortLeads(
  leads: readonly Lead[],
  key: SortKey,
  dir: "asc" | "desc",
  ownerName: (id: string | null) => string,
): Lead[] {
  const value = (l: Lead): string | number | null => {
    switch (key) {
      case "brand":
        return l.brand.toLowerCase();
      case "stage":
        return STAGES.indexOf(l.stage);
      case "owner":
        return ownerName(l.owner_member_id).toLowerCase() || null;
      case "value":
        return l.value;
      case "touch":
        return lastTouchAt(l) || null;
      case "next":
        return l.next_date;
      case "created":
        return l.created_at;
    }
  };
  const sign = dir === "asc" ? 1 : -1;
  return [...leads].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === y) return a.brand.localeCompare(b.brand);
    if (x === null || x === "") return 1;
    if (y === null || y === "") return -1;
    return (x < y ? -1 : 1) * sign;
  });
}
