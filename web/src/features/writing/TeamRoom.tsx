import { Notice } from "@/components/Notice";
import { useConcepts } from "@/features/clients/clientsApi";
import { useScripts } from "@/features/scripts/scriptsApi";
import { friendlyError } from "@/lib/errors";
import { WritingRoom } from "./WritingRoom";

/** The team's Writing Room for one client. */
export function TeamRoom({ clientId }: { clientId: string }) {
  const concepts = useConcepts(clientId);
  const scripts = useScripts(clientId);
  if (concepts.isPending || scripts.isPending) return <p className="muted">Loading…</p>;
  const error = concepts.error ?? scripts.error;
  if (error) return <Notice tone="error">{friendlyError(error)}</Notice>;
  return (
    <section className="tab-body">
      <WritingRoom
        concepts={concepts.data ?? []}
        scripts={scripts.data ?? []}
        reader="team"
        base={`/clients/${clientId}`}
      />
    </section>
  );
}
