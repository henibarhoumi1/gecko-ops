import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { originFor } from "@/lib/hosts";
import { useShootLinkActions, useShootLinks, type ShootTarget } from "./shootApi";

/** The link a crew member opens: the day only, no account. */
export const dayLink = (token: string) => `${originFor("team")}/day/${token}`;

/**
 * Links for crew without an account: a freelance DOP, an assistant for the day. Each opens this day only,
 * with the line reader and the ticks, until two days after the shoot.
 */
export function CrewLinks({
  target,
  dayId,
  dayTitle,
}: {
  target: ShootTarget;
  dayId: string;
  dayTitle: string;
}) {
  const links = useShootLinks(target, dayId, true);
  const actions = useShootLinkActions(target, dayId);
  const [label, setLabel] = useState("");
  const [made, setMade] = useState<{ label: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const message = made
    ? `Hi ${made.label.split(",")[0]}, here's the shoot day: ${dayTitle}. The plan, the reels in order and the lines to read: ${made.url}\nNo account needed. The link works until two days after the shoot.`
    : "";

  return (
    <section className="shoot-section">
      <h3>Crew links</h3>
      <p className="small">
        For crew without an account. They see this day only, read lines and tick reels; no money, no
        phone numbers, nothing else.
      </p>
      <form
        className="shoot-log-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          actions.create.mutate(label.trim(), {
            onSuccess: (token) => {
              setMade({ label: label.trim(), url: dayLink(token) });
              setLabel("");
              setCopied(false);
            },
          });
        }}
      >
        <input
          aria-label="Who the link is for"
          placeholder="Ali, DOP"
          value={label}
          maxLength={80}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button type="submit" className="btn-small" disabled={actions.create.isPending}>
          Make link
        </Button>
      </form>
      {made && (
        <div className="crew-link-made">
          <code>{made.url}</code>
          <span className="shoot-person-links small">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Send on WhatsApp
            </a>
            <Button
              variant="link"
              onClick={() =>
                void navigator.clipboard?.writeText(message).then(() => setCopied(true))
              }
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </span>
          <span className="small">The link is shown once. Make a new one if it gets lost.</span>
        </div>
      )}
      {(links.data ?? []).length > 0 && (
        <ul className="shoot-people">
          {(links.data ?? []).map((l) => (
            <li key={l.id}>
              <span dir="auto">{l.label}</span>
              <Button variant="link" onClick={() => actions.revoke.mutate(l.id)}>
                Close the link
              </Button>
            </li>
          ))}
        </ul>
      )}
      {(actions.create.isError || actions.revoke.isError) && (
        <Notice tone="error">{friendlyError(actions.create.error ?? actions.revoke.error)}</Notice>
      )}
    </section>
  );
}
