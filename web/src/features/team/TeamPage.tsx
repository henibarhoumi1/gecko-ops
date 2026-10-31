import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { useClients, type ClientRow } from "@/features/clients/clientsApi";
import { ROLE_LABEL, useMembers, type Member } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import {
  INVITE_ROLES,
  useAssignClient,
  useClientAssignments,
  useInviteMember,
  useRemoveMember,
} from "./teamApi";

/** Who is on the team. The founder invites people, removes them and picks the clients editors see. */
export function TeamPage() {
  const { role } = useWorkspace();
  const founder = role === "founder";
  const members = useMembers();
  const clients = useClients();
  const assignments = useClientAssignments(founder);

  if (members.isPending) return <p className="loading">Loading the team…</p>;
  if (members.isError) return <Notice tone="error">{friendlyError(members.error)}</Notice>;

  return (
    <section className="page team-page">
      <header className="page-head">
        <div>
          <h1>Team</h1>
          <p className="muted">
            {members.data.length} {members.data.length === 1 ? "person" : "people"}
            {founder && ". Editors only see the clients you tick for them."}
          </p>
        </div>
      </header>
      {founder && <InviteForm />}
      <h2>People</h2>
      <ul className="list">
        {members.data.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            founder={founder}
            clients={clients.data ?? []}
            assigned={assignments.data?.get(member.id) ?? new Set()}
          />
        ))}
      </ul>
      {(assignments.isError || clients.isError) && (
        <Notice tone="error">{friendlyError(assignments.error ?? clients.error)}</Notice>
      )}
    </section>
  );
}

function InviteForm() {
  const invite = useInviteMember();
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    setError("");
    setCopied(false);
    try {
      const url = await invite.mutateAsync({ email, role: String(data.get("role")) });
      setLink({ email, url });
      form.reset();
    } catch (e) {
      // From this call, invalid_invite means the email (or role) was refused, not a bad link.
      const raw = typeof e === "object" && e && "message" in e ? String(e.message) : "";
      setError(/invalid_invite/.test(raw) ? "Check the email address." : friendlyError(e));
    }
  }

  const message = link
    ? `Hi! Here is your invite to the Gecko team app: ${link.url}\nCreate your account with ${link.email}. The link works once, for 7 days.`
    : "";

  return (
    <div className="team-invite">
      <form className="invite invite-role" onSubmit={onSubmit}>
        <Field label="Email" name="email" type="email" required maxLength={200} />
        <Select label="Role" name="role" options={INVITE_ROLES} defaultValue="editor" />
        <Button type="submit" disabled={invite.isPending}>
          Create invite link
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {link && (
        <div className="card stack invite-link">
          <p className="small">
            Send this to {link.email}. It works once, for that email only, for 7 days. They show up
            here once they've joined.
          </p>
          <code>{link.url}</code>
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
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Send on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  founder,
  clients,
  assigned,
}: {
  member: Member;
  founder: boolean;
  clients: ClientRow[];
  assigned: Set<string>;
}) {
  const remove = useRemoveMember();
  const assign = useAssignClient();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const scoped = member.role === "editor" || member.role === "assistant";

  function toggle(clientId: string, on: boolean) {
    setError("");
    assign
      .mutateAsync({ memberId: member.id, clientId, assigned: on })
      .catch((e: unknown) => setError(friendlyError(e)));
  }

  return (
    <li className="card member">
      <div className="account">
        <div>
          <strong>{member.name}</strong>
          <p className="small muted">
            {ROLE_LABEL[member.role]}
            {member.userId ? " · you" : ""}
          </p>
        </div>
        {founder &&
          member.role !== "founder" &&
          (confirming ? (
            <div className="actions">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep
              </Button>
              <Button
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutateAsync(member.id).catch((e: unknown) => setError(friendlyError(e)))
                }
              >
                Remove {member.name.split(" ")[0]}
              </Button>
            </div>
          ) : (
            <Button variant="link" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          ))}
      </div>
      {founder && scoped && (
        <fieldset className="client-access">
          <legend className="small muted">Clients they can open</legend>
          {clients.length === 0 && <p className="small muted">No clients yet.</p>}
          {clients.map((client) => (
            <label key={client.id} className="check">
              <input
                type="checkbox"
                checked={assigned.has(client.id)}
                disabled={assign.isPending}
                onChange={(event) => toggle(client.id, event.target.checked)}
              />
              {client.brand}
            </label>
          ))}
        </fieldset>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </li>
  );
}
