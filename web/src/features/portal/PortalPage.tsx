import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { loadPortal, type PortalSnapshot } from "./portalApi";

type Load =
  | { status: "loading" }
  | { status: "ready"; snapshot: PortalSnapshot | null }
  | { status: "error"; message: string };

/** What a client sees: only their own published page. No agency screens are reachable from here. */
export function PortalPage({ portal, email }: { portal: ClientPortal; email: string }) {
  const { signOut } = useAuth();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let live = true;
    loadPortal(requireSupabase(), portal).then(
      (snapshot) => live && setLoad({ status: "ready", snapshot }),
      (error) => live && setLoad({ status: "error", message: friendlyError(error) }),
    );
    return () => {
      live = false;
    };
  }, [portal]);

  return (
    <div className="portal">
      <header className="portal-bar">
        <span>Signed in as {email}</span>
        <Button variant="link" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>
      <main className="page">
        <p className="eyebrow">{portal.brand}</p>
        {load.status === "loading" && <p className="muted">Loading your page…</p>}
        {load.status === "error" && <Notice tone="error">{load.message}</Notice>}
        {load.status === "ready" && !load.snapshot && (
          <p className="muted">
            Your Gecko page isn't published yet. You'll see it here as soon as it is.
          </p>
        )}
        {load.status === "ready" && load.snapshot && <PortalContent snapshot={load.snapshot} />}
      </main>
    </div>
  );
}

function PortalContent({ snapshot }: { snapshot: PortalSnapshot }) {
  return (
    <>
      <h1>{snapshot.title || snapshot.brand?.name || "Your projects"}</h1>
      <ul className="list">
        {(snapshot.projects ?? []).map((project) => (
          <li key={project.id} className="card">
            <strong>{project.name}</strong>
            {project.stage && <span className="muted"> · {project.stage}</span>}
          </li>
        ))}
      </ul>
      {snapshot.company?.email && <p className="muted">Questions? {snapshot.company.email}</p>}
    </>
  );
}
