const CODE = /[0-9a-f]{64}/i;
const STORAGE_KEY = "gecko-pending-invite";

/** Pulls the 64-character invite code out of a pasted link or code. */
export function parseInviteCode(input: string): string | null {
  const match = input.match(CODE);
  return match ? match[0].toLowerCase() : null;
}

export function savePendingInvite(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the code just isn't remembered across the sign-in step.
    // localStorage (not sessionStorage) so the code survives the email confirmation opening a new tab.
  }
}

export function readPendingInvite(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}
