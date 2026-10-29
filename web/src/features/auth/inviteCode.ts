const CODE = /[0-9a-f]{64}/i;
const STORAGE_KEY = "gecko-pending-invite";

/** Pulls the 64-character invite code out of a pasted link or code. */
export function parseInviteCode(input: string): string | null {
  const match = input.match(CODE);
  return match ? match[0].toLowerCase() : null;
}

export function savePendingInvite(code: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the code just isn't remembered across the sign-in step.
  }
}

export function readPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}
