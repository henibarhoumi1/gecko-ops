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
  { path: "today", label: "Today", roles: ["founder", "sales"], group: "home" },
  { path: "pipeline", label: "Pipeline", roles: ["founder", "sales"], group: "work" },
  { path: "clients", label: "Clients", roles: ["founder", "sales", "editor"], group: "work" },
  { path: "shoots", label: "Shoots", roles: ALL, group: "work" },
  { path: "team", label: "Team", roles: ALL, group: "studio" },
  { path: "alerts", label: "Alerts", roles: ["founder", "sales"], group: "studio" },
  { path: "trash", label: "Trash", roles: ["founder", "sales"], group: "studio" },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}
