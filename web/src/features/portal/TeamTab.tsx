import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import type { ClientPortal } from "@/features/auth/account";
import { shortDate } from "@/features/concepts/model";
import { teammateMessage, whatsappLink } from "@/features/clients/messages";
import { friendlyError } from "@/lib/errors";
import { getLang, t } from "@/lib/i18n";
import { useInviteTeammate, useMyTeam, useRemoveTeammate, useSetTeammateRole } from "./portalApi";
import { CLIENT_ROLES, roleHint, roleName, useClientRole, type ClientRole } from "./role";

/** Who from the brand's side is in this space. The owner invites, changes roles and removes people. */
export function TeamTab({
  portal,
  brand,
  me,
}: {
  portal: ClientPortal;
  brand: string;
  me: string;
}) {
  const role = useClientRole();
  const team = useMyTeam(portal);
  const owner = role === "owner";
  const [error, setError] = useState("");

  return (
    <section className="tab-body team-tab">
      <p className="lede">
        {t(
          `Everyone from ${brand} who can open this space. Up to 5 people, each with a role.`,
          `Toutes les personnes de ${brand} qui ont accès à cet espace. Jusqu'à 5 personnes, chacune avec un rôle.`,
        )}
      </p>

      {team.isPending && <p className="muted">{t("Loading…", "Chargement…")}</p>}
      {team.isError && <Notice tone="error">{friendlyError(team.error)}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {team.data && (
        <ul className="list team-list">
          {team.data.map((person) => (
            <TeammateRow
              key={person.id}
              portal={portal}
              person={person}
              canManage={owner && !person.me}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {owner && <InviteForm portal={portal} brand={brand} me={me} />}

      <h2>{t("What each role can do", "Ce que chaque rôle peut faire")}</h2>
      <dl className="roles">
        {CLIENT_ROLES.map((r) => (
          <div key={r}>
            <dt>{roleName(r)}</dt>
            <dd>{roleHint(r)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TeammateRow({
  portal,
  person,
  canManage,
  onError,
}: {
  portal: ClientPortal;
  person: NonNullable<ReturnType<typeof useMyTeam>["data"]>[number];
  canManage: boolean;
  onError: (message: string) => void;
}) {
  const setRole = useSetTeammateRole(portal);
  const remove = useRemoveTeammate(portal);
  return (
    <li className="card teammate">
      <div>
        <strong dir="auto">{person.name}</strong>
        {person.me && <span className="you"> {t("(you)", "(vous)")}</span>}
        {person.email && <span className="muted small"> · {person.email}</span>}
        <p className="small muted">
          {person.joined
            ? roleName(person.role)
            : person.expires
              ? t(
                  `${roleName(person.role)} · invited, link valid until ${shortDate(person.expires)}`,
                  `${roleName(person.role)} · invité, lien valable jusqu'au ${shortDate(person.expires)}`,
                )
              : t(`${roleName(person.role)} · invited`, `${roleName(person.role)} · invité`)}
        </p>
      </div>
      {canManage && (
        <div className="teammate-actions">
          <select
            className="role-select"
            aria-label={t(`Role for ${person.name}`, `Rôle de ${person.name}`)}
            value={person.role}
            disabled={setRole.isPending}
            onChange={(e) => {
              onError("");
              setRole
                .mutateAsync({ id: person.id, role: e.target.value as ClientRole })
                .catch((err: unknown) => onError(friendlyError(err)));
            }}
          >
            {CLIENT_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </select>
          <Button
            variant="link"
            disabled={remove.isPending}
            onClick={() => {
              onError("");
              remove.mutateAsync(person.id).catch((err: unknown) => onError(friendlyError(err)));
            }}
          >
            {person.joined ? t("Remove", "Retirer") : t("Cancel invite", "Annuler l'invitation")}
          </Button>
        </div>
      )}
    </li>
  );
}

function InviteForm({ portal, brand, me }: { portal: ClientPortal; brand: string; me: string }) {
  const invite = useInviteTeammate(portal);
  const [role, setRole] = useState<ClientRole>("approver");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const first = me.split(/\s+/)[0] || me;
  const message = link ? teammateMessage(getLang(), brand, first, link.url) : "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setError("");
    setCopied(false);
    try {
      setLink({ email, url: await invite.mutateAsync({ email, role }) });
      form.reset();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <div className="invite-teammate">
      <h2>{t("Invite someone from your team", "Inviter quelqu'un de votre équipe")}</h2>
      <form className="invite" onSubmit={onSubmit}>
        <Field
          label={t("Their email", "Son e-mail")}
          name="email"
          type="email"
          required
          maxLength={200}
        />
        <Select
          label={t("Role", "Rôle")}
          value={role}
          onChange={(e) => setRole(e.target.value as ClientRole)}
          options={CLIENT_ROLES.map((r) => [r, roleName(r)] as const)}
        />
        <Button type="submit" disabled={invite.isPending}>
          {t("Create invite link", "Créer le lien d'invitation")}
        </Button>
      </form>
      <p className="small muted">{roleHint(role)}</p>
      {error && <Notice tone="error">{error}</Notice>}
      {link && (
        <div className="card stack invite-link">
          <p className="small">
            {t(
              `Send this to ${link.email}. The link works once, for that email, for 14 days.`,
              `Envoyez-le à ${link.email}. Le lien marche une fois, pour cet e-mail, pendant 14 jours.`,
            )}
          </p>
          <p className="small pre message-preview">{message}</p>
          <div className="actions start">
            <Button
              onClick={() =>
                void navigator.clipboard.writeText(message).then(() => setCopied(true))
              }
            >
              {copied ? t("Copied", "Copié") : t("Copy message", "Copier le message")}
            </Button>
            <a
              className="btn btn-secondary"
              href={whatsappLink(message)}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("Send on WhatsApp", "Envoyer sur WhatsApp")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
