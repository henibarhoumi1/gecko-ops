import type { Role } from "@/features/auth/account";

export interface NavItem {
  path: string;
  label: string;
  roles: readonly Role[];
}

const ALL: readonly Role[] = ["founder", "sales", "editor", "assistant"];

/** Top-level sections, in sidebar order. Who sees what matches the database's role rules. */
export const NAV: readonly NavItem[] = [
  { path: "today", label: "Today", roles: ["founder", "sales"] },
  { path: "pipeline", label: "Pipeline", roles: ["founder", "sales"] },
  { path: "clients", label: "Clients", roles: ["founder", "sales", "editor"] },
  { path: "team", label: "Team", roles: ALL },
  { path: "alerts", label: "Alerts", roles: ["founder", "sales"] },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}
