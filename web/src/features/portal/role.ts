import { createContext, useContext } from "react";
import { t } from "@/lib/i18n";

/** What someone on the client's side can do in their portal. Gecko gives the first person "owner". */
export type ClientRole = "owner" | "approver" | "finance" | "viewer";

export const CLIENT_ROLES: ClientRole[] = ["owner", "approver", "finance", "viewer"];

export const RoleContext = createContext<ClientRole>("owner");

export const useClientRole = () => useContext(RoleContext);

/** Owners and approvers approve ideas, scripts and cuts, or ask for changes. */
export const canApprove = (role: ClientRole) => role === "owner" || role === "approver";

/** Owners and finance see prices, payments and invoices. */
export const seesMoney = (role: ClientRole) => role === "owner" || role === "finance";

export function roleName(role: ClientRole): string {
  return {
    owner: t("Owner", "Responsable"),
    approver: t("Approver", "Valideur"),
    finance: t("Finance", "Finances"),
    viewer: t("Viewer", "Lecture seule"),
  }[role];
}

export function roleHint(role: ClientRole): string {
  return {
    owner: t(
      "Approves, sees payments, invites and removes people.",
      "Valide, voit les paiements, invite et retire des personnes.",
    ),
    approver: t(
      "Approves ideas, scripts and cuts, or asks for changes.",
      "Valide les idées, les scripts et les montages, ou demande des changements.",
    ),
    finance: t(
      "Sees prices and payments, comments, doesn't approve creative.",
      "Voit les prix et les paiements, commente, ne valide pas la création.",
    ),
    viewer: t(
      "Sees everything creative and comments. No approvals, no payments.",
      "Voit toute la partie création et commente. Ni validation, ni paiements.",
    ),
  }[role];
}

export function asRole(value: unknown): ClientRole {
  return CLIENT_ROLES.includes(value as ClientRole) ? (value as ClientRole) : "owner";
}
