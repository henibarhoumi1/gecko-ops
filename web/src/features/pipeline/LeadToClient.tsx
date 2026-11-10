import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useAddClient } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import type { Lead } from "./model";
import { usePatchLeads } from "./leadsApi";

/**
 * Lead won → client: one button makes the client with a first project, marks the lead won and linked,
 * and opens the onboarding sheet to send. A lead that is already a client links to it.
 */
export function LeadToClient({ lead }: { lead: Lead }) {
  const { id: workspaceId, role } = useWorkspace();
  const addClient = useAddClient();
  const patch = usePatchLeads();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (lead.client_id)
    return (
      <p className="lead-client small">
        Client since it was won ·{" "}
        <Link to={`/clients/${encodeURIComponent(lead.client_id)}`}>Open the client →</Link>
      </p>
    );
  if (role !== "founder" && role !== "sales") return null;

  async function make() {
    setBusy(true);
    setError("");
    try {
      const clientId = await addClient.mutateAsync(lead.brand);
      // The first project: if this fails the client still works, it just has no project yet.
      await requireSupabase().rpc("save_project", {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
        p_project: { name: `${lead.brand} · first project`, kind: "performance" },
      });
      const today = new Date().toISOString().slice(0, 10);
      await patch.mutateAsync([
        {
          id: lead.id,
          patch: {
            stage: "won",
            client_id: clientId,
            history: [...(lead.history ?? []), { at: today, stage: "won" }],
          },
        },
      ]);
      navigate(`/clients/${encodeURIComponent(clientId)}/onboarding`);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  return (
    <div className="lead-client">
      {asking ? (
        <>
          <p className="small">
            Make <strong>{lead.brand}</strong> a client? It gets a first project, the lead is marked
            won, and you land on its onboarding sheet to send.
          </p>
          <div className="actions">
            <Button
              variant="secondary"
              className="btn-small"
              onClick={() => setAsking(false)}
              disabled={busy}
            >
              Not yet
            </Button>
            <Button className="btn-small" onClick={() => void make()} disabled={busy}>
              {busy ? "Making the client…" : "Make the client"}
            </Button>
          </div>
        </>
      ) : (
        <Button variant="secondary" className="btn-small" onClick={() => setAsking(true)}>
          Won → make it a client
        </Button>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
