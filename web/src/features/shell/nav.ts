import type { Role } from "@/features/auth/account";

export interface NavItem {
  path: string;
  label: string;
  roles: readonly Role[];
}

const ALL: readonly Role[] = ["founder", "sales", "editor", "assistant"];

/** Top-level sections, in sidebar order. Who sees what matches the database's role rules. */
export const NAV: readonly NavItem[] = [
  { path: "today", label: "Today", roles: ALL },
  { path: "pipeline", label: "Pipeline", roles: ["founder", "sales"] },
  { path: "clients", label: "Clients", roles: ["founder", "sales"] },
  { path: "projects", label: "Projects", roles: ALL },
  { path: "calendar", label: "Calendar", roles: ALL },
  { path: "money", label: "Money", roles: ["founder"] },
  { path: "team", label: "Team", roles: ["founder", "sales", "assistant"] },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}
