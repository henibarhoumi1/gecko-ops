const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "That email and password don't match."],
  [/email not confirmed/i, "Confirm your email first. Check your inbox for the link."],
  [/user already registered/i, "This email already has an account. Sign in instead."],
  [/password should be at least/i, "Use a password of at least 8 characters."],
  [/invalid api key/i, "The app's Supabase key is wrong. Check the anon key in Cloudflare."],
  [/workspace_exists/, "Gecko is already set up. Ask the founder for an invite link."],
  [
    /invalid_invite/,
    "This invite link is wrong, used or expired, or was sent to a different email.",
  ],
  [/verified_email_required/, "Confirm your email first, then try again."],
  [
    /concept_changed/,
    "This concept changed while you were reading it. The new version is shown now; have a look and decide again.",
  ],
  [/client_only/, "Only the client can approve a concept or ask for changes."],
  [/invalid_note/, "That message couldn't be sent. Check it isn't empty and try again."],
  [/invalid_idea/, "Give the idea a title, and keep it under 10,000 characters."],
  [/too_many_ideas/, "That's 200 ideas already. Remove some before adding more."],
  [/feedback_rate_limited/, "That's a lot of messages in an hour. Try again a little later."],
  [
    /violates check constraint/,
    "Something in this form is too long or not valid. Check it and try again.",
  ],
  [/member_not_found/, "That person isn't on the team anymore. Refresh the page."],
  [/invalid_assignee/, "Only editors can be given clients."],
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
