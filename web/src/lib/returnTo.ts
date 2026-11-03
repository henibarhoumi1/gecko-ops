// Where a person was going when they had to sign in first, so a link from WhatsApp or an email lands on
// the right item after sign-in instead of Home. Kept for 30 minutes in this browser (a sign-in link often
// opens in a new tab). Only paths inside the app are kept.

const KEY = "gecko.returnTo";
const MAX_AGE_MS = 30 * 60 * 1000;
const NOT_A_DESTINATION = ["/sign-in", "/sign-up", "/forgot", "/reset", "/invite/"];

/** A path worth coming back to: inside this app, not the bare Home, not a sign-in page. */
export function isReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false;
  const bare = path.split(/[?#]/)[0] ?? "";
  if (bare === "/" || bare === "") return false;
  return !NOT_A_DESTINATION.some((p) => bare === p || bare.startsWith(p));
}

export function saveReturnTo(path: string, now = Date.now()): void {
  if (!isReturnPath(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Private windows can refuse storage; the person then lands on Home, as before.
  }
}

/** Reads and forgets the saved path. */
export function takeReturnTo(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof saved.path !== "string" || typeof saved.at !== "number") return null;
    if (now - saved.at > MAX_AGE_MS || !isReturnPath(saved.path)) return null;
    return saved.path;
  } catch {
    return null;
  }
}
