import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { useClientAccounts, useInviteClient, useRevokeClientAccount } from "./clientsApi";
import { inviteMessage, whatsappLink, type MsgLang } from "./messages";

/** Who from the client can sign in to the portal, and the one-time links that let them. */
export function LoginsPanel({ clientId, brand }: { clientId: string; brand: string }) {
  const accounts = useClientAccounts(clientId);
  const invite = useInviteClient(clientId);
  const revoke = useRevokeClientAccount(clientId);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<MsgLang>("fr");

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setError("");
    setCopied(false);
    try {
      const url = await invite.mutateAsync(email);
      setLink({ email, url });
      form.reset();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const message = link ? inviteMessage(lang, brand, link.url) : "";

  return (
    <section className="tab-body">
      <p className="lede">
        Invite the people at {brand} who approve the work. Each link works once, for that email
        only, for 14 days.
      </p>
      <form className="invite" onSubmit={onInvite}>
        <Field label="Client's email" name="email" type="email" required maxLength={200} />
        <Button type="submit" disabled={invite.isPending}>
          Create invite link
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {link && (
        <div className="card stack invite-link">
          <p className="small">Send this to {link.email}. It only works once.</p>
          <code>{link.url}</code>
          <MessageLang lang={lang} onChange={(l) => (setLang(l), setCopied(false))} />
          <p className="small pre message-preview">{message}</p>
          <div className="actions start">
            <Button
              onClick={() =>
                void navigator.clipboard.writeText(message).then(() => setCopied(true))
              }
            >
              {copied ? "Copied" : "Copy message"}
            </Button>
            <a
              className="btn btn-secondary"
              href={whatsappLink(message)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Send on WhatsApp
            </a>
          </div>
        </div>
      )}
      <h2>People with access</h2>
      {accounts.isPending && <p className="muted">Loading…</p>}
      {accounts.isError && <Notice tone="error">{friendlyError(accounts.error)}</Notice>}
      {accounts.data?.length === 0 && <p className="muted">Nobody invited yet.</p>}
      <ul className="list">
        {accounts.data?.map((a) => (
          <li key={a.id} className="card account">
            <div>
              <strong>{a.name || a.email}</strong>
              {a.name && <span className="muted small"> · {a.email}</span>}
              <p className="small muted">
                {a.revoked
                  ? "Access removed"
                  : a.joined
                    ? "Signed in"
                    : a.expires && new Date(a.expires) < new Date()
                      ? "Invite expired. Create a new link."
                      : `Invited, link valid until ${shortDate(a.expires)}`}
              </p>
            </div>
            {!a.revoked && (
              <Button
                variant="link"
                disabled={revoke.isPending}
                onClick={() =>
                  revoke.mutateAsync(a.id).catch((e: unknown) => setError(friendlyError(e)))
                }
              >
                Remove access
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Which language the ready-made message is written in. */
export function MessageLang({ lang, onChange }: { lang: MsgLang; onChange: (l: MsgLang) => void }) {
  return (
    <div className="lang-switch msg-lang" role="group" aria-label="Message language">
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={lang === l ? "on" : ""}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
        >
          {l === "fr" ? "Français" : "English"}
        </button>
      ))}
    </div>
  );
}
