import type { Role } from "@/features/auth/account";

export type NavGroup = "home" | "work" | "studio";

export interface NavItem {
  path: string;
  label: string;
  roles: readonly Role[];
  /** The sidebar section it sits in. */
  group: NavGroup;
}

export const GROUP_LABEL: Record<NavGroup, string> = { home: "", work: "Work", studio: "Studio" };

const ALL: readonly Role[] = ["founder", "sales", "editor", "assistant"];

/** Top-level sections, in sidebar order. Who sees what matches the database's role rules. */
export const NAV: readonly NavItem[] = [
  { path: "today", label: "Home", roles: ALL, group: "home" },
  { path: "ceo", label: "CEO", roles: ["founder"], group: "home" },
  { path: "calendar", label: "Calendar", roles: ALL, group: "home" },
  { path: "week", label: "This week", roles: ["founder", "sales"], group: "home" },
  { path: "finance", label: "Finance", roles: ["founder"], group: "home" },
  { path: "pipeline", label: "Pipeline", roles: ["founder", "sales"], group: "work" },
  { path: "clients", label: "Clients", roles: ["founder", "sales", "editor"], group: "work" },
  { path: "projects", label: "Projects", roles: ["founder", "sales", "editor"], group: "work" },
  { path: "edits", label: "Edit board", roles: ["founder", "sales", "editor"], group: "work" },
  { path: "shoots", label: "Shoots", roles: ALL, group: "work" },
  { path: "talent", label: "Talent", roles: ALL, group: "work" },
  { path: "locations", label: "Locations", roles: ALL, group: "work" },
  { path: "creators", label: "UGC creators", roles: ALL, group: "work" },
  { path: "studios", label: "Gear & studios", roles: ALL, group: "work" },
  { path: "content", label: "Creative Lab", roles: ALL, group: "studio" },
  { path: "pages", label: "Pages & docs", roles: ALL, group: "studio" },
  { path: "tools", label: "Studio tools", roles: ALL, group: "studio" },
  { path: "team", label: "Team", roles: ALL, group: "studio" },
  { path: "alerts", label: "Alerts", roles: ["founder", "sales"], group: "studio" },
  { path: "trash", label: "Trash", roles: ["founder", "sales"], group: "studio" },
];

/** `finance`: the founder let this person look at Finance (read-only). */
export function navFor(role: Role, opts: { finance?: boolean } = {}): NavItem[] {
  return NAV.filter(
    (item) => item.roles.includes(role) || (item.path === "finance" && opts.finance === true),
  );
}
