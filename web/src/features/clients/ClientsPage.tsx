import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { countByStatus } from "@/features/concepts/model";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useAddClient, useClients, useConcepts } from "./clientsApi";

/** Every client, with what needs Gecko's attention in their portal. */
export function ClientsPage() {
  const { role } = useWorkspace();
  const clients = useClients();
  const concepts = useConcepts(null);
  const [adding, setAdding] = useState(false);

  if (clients.isPending) return <p className="loading">Loading clients…</p>;
  if (clients.isError) return <Notice tone="error">{friendlyError(clients.error)}</Notice>;

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="muted">
            Each client signs in to their own portal: overview, onboarding and concepts.
          </p>
        </div>
        {(role === "founder" || role === "sales") && !adding && (
          <Button onClick={() => setAdding(true)}>Add client</Button>
        )}
      </header>
      {adding && <AddClient onDone={() => setAdding(false)} />}
      {clients.data.length === 0 && !adding && <p className="muted">No clients yet.</p>}
      <ul className="list">
        {clients.data.map((client) => {
          const counts = countByStatus(
            (concepts.data ?? []).filter((c) => c.clientId === client.id),
          );
          const flags = [
            counts.changes && `${counts.changes} changes asked`,
            counts.idea && `${counts.idea} new ideas`,
            counts.review && `${counts.review} with the client`,
            counts.approved && `${counts.approved} approved`,
          ].filter(Boolean);
          return (
            <li key={client.id}>
              <Link to={`/clients/${client.id}`} className="card client-row">
                <strong>{client.brand}</strong>
                <span className="small muted">
                  {flags.length ? flags.join(" · ") : "No concepts yet"}
                </span>
              </Link>
            </li>
          );
        })}
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
