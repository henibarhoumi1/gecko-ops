/**
 * The team works on app.<domain> and clients on client.<domain>; both serve this same app.
 * Invite links point at the right one. Anywhere else (local, previews) links stay on this host.
 */
export function originFor(who: "team" | "client", origin = window.location.origin): string {
  return who === "client"
    ? origin.replace("://app.", "://client.")
    : origin.replace("://client.", "://app.");
}

export function inviteLink(who: "team" | "client", code: string): string {
  return `${originFor(who)}/invite/${code}`;
}
