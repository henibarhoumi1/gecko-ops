const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "That email and password don't match."],
  [/email not confirmed/i, "Confirm your email first. Check your inbox for the link."],
  [/user already registered/i, "This email already has an account. Sign in instead."],
  [/password should be at least/i, "Use a password of at least 8 characters."],
  [/invalid api key/i, "The app's Supabase key is wrong. Check the anon key in Vercel."],
  [/workspace_exists/, "Gecko is already set up. Ask the founder for an invite link."],
  [
    /invalid_invite/,
    "This invite link is wrong, used or expired, or was sent to a different email.",
  ],
  [/verified_email_required/, "Confirm your email first, then try again."],
  [/forbidden/, "You don't have access to do that."],
  [/failed to fetch|network/i, "Can't reach the server. Check your connection."],
];

export function friendlyError(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  for (const [pattern, message] of MESSAGES) if (pattern.test(text)) return message;
  return "Something went wrong. Try again.";
}
