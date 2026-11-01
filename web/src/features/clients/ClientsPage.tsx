import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { countByStatus, shortDate } from "@/features/concepts/model";
import { PLANS } from "@/features/plans/model";
import { useScripts } from "@/features/scripts/scriptsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useAddClient, useClients, useConcepts, useLogos, usePortalRows } from "./clientsApi";

/** Every client, with what needs Gecko's attention in their portal. */
export function ClientsPage() {
  const { role } = useWorkspace();
  const clients = useClients();
  const concepts = useConcepts(null);
  const scripts = useScripts(null);
  const portals = usePortalRows();
  const logos = useLogos();
  const [adding, setAdding] = useState(false);

  if (clients.isPending) return <p className="loading">Loading clients…</p>;
  if (clients.isError) return <Notice tone="error">{friendlyError(clients.error)}</Notice>;

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="muted">
            Each client has a private portal for their plan, ideas, scripts and onboarding. Clients
            with something waiting on Gecko come first.
          </p>
        </div>
        {(role === "founder" || role === "sales") && !adding && (
          <Button onClick={() => setAdding(true)}>Add client</Button>
        )}
      </header>
      {adding && <AddClient onDone={() => setAdding(false)} />}
      {clients.data.length === 0 && !adding && <p className="muted">No clients yet.</p>}
      <ul className="list">
        {clients.data
          .map((client) => {
            const counts = countByStatus(
              (concepts.data ?? []).filter((c) => c.clientId === client.id),
            );
            const mine = (scripts.data ?? []).filter((s) => s.clientId === client.id);
            const scriptCount = (status: string) => mine.filter((s) => s.status === status).length;
            const p = portals.data?.find((row) => row.client_id === client.id);
            const forGecko = [
              scriptCount("changes") && `${plural(scriptCount("changes"), "script")} to rework`,
              counts.changes && `${plural(counts.changes, "idea")} to rework`,
              counts.idea && `${plural(counts.idea, "new idea")} from the client`,
            ].filter((x): x is string => Boolean(x));
            const withClient = [
              scriptCount("review") && `${plural(scriptCount("review"), "script")}`,
              counts.review && `${plural(counts.review, "idea")}`,
            ].filter((x): x is string => Boolean(x));
            const plan = p
              ? [
                  p.plan !== "custom" && PLANS[p.plan].label,
                  p.reels && `${scriptCount("approved")} of ${p.reels} scripts approved`,
                  p.shoot_date && `shoot ${shortDate(p.shoot_date)}`,
                ].filter((x): x is string => Boolean(x))
              : [];
            return { client, forGecko, withClient, plan };
          })
          .sort((a, b) => b.forGecko.length - a.forGecko.length)
          .map(({ client, forGecko, withClient, plan }) => (
            <li key={client.id}>
              <Link to={`/clients/${client.id}`} className="card client-row">
                <span className="client-row-top">
                  {logos.data?.[client.id] && (
                    <img className="client-row-logo" src={logos.data[client.id]} alt="" />
                  )}
                  <strong>{client.brand}</strong>
                  {forGecko.length > 0 && <span className="tag tag-pink">Needs Gecko</span>}
                </span>
                {plan.length > 0 && <span className="small">{plan.join(" · ")}</span>}
                <span className="small muted">
                  {[
                    ...forGecko,
                    withClient.length > 0 && `${withClient.join(" and ")} with the client`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nothing waiting on anyone"}
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}

function AddClient({ onDone }: { onDone: () => void }) {
  const add = useAddClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const brand = String(new FormData(event.currentTarget).get("brand") ?? "").trim();
    if (!brand) return setError("Write the brand name.");
    try {
      const id = await add.mutateAsync(brand);
      onDone();
      navigate(`/clients/${id}`);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <Field label="Brand name" name="brand" maxLength={160} autoFocus required />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={add.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={add.isPending}>
          Add client
        </Button>
      </div>
    </form>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
