import type { ClientPortal } from "@/features/auth/account";

// Which brand a client sees when they belong to several (the RareRich owner with two brands, for
// example). The choice is remembered in this browser; without it, the first brand opens.

const KEY = "gecko.portal";

export function portalKey(portal: ClientPortal): string {
  return `${portal.workspaceId}/${portal.clientId}`;
}

export function pickPortal(portals: ClientPortal[], remembered: string | null): ClientPortal {
  return portals.find((p) => portalKey(p) === remembered) ?? portals[0]!;
}

export function readRememberedPortal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberPortal(portal: ClientPortal): void {
  try {
    localStorage.setItem(KEY, portalKey(portal));
  } catch {
    // Not remembered in a private window: the first brand opens next time.
  }
}
