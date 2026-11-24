import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { whatsappLink } from "@/features/clients/messages";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";

interface LinkRow {
  id: string;
  canAccept: boolean;
  acceptedAt: string | null;
  acceptedName: string | null;
  views: number;
  lastViewedAt: string | null;
  createdAt: string;
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Share the page by link: make one (optionally "to accept"), copy or send it, see views and acceptance, revoke. */
export function SharePanel({
  pageId,
  title,
  acceptable,
}: {
  pageId: string;
  title: string;
  acceptable: boolean;
}) {
  const qc = useQueryClient();
  const key = ["page-links", pageId];
  const links = useQuery({
    queryKey: key,
    queryFn: async (): Promise<LinkRow[]> => {
      const { data, error } = await requireSupabase().rpc("get_page_links", { p_page_id: pageId });
      if (error) throw error;
      return (data ?? []) as LinkRow[];
    },
  });
  const [toAccept, setToAccept] = useState(acceptable);
  const [fresh, setFresh] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().rpc("create_page_link", {
        p_page_id: pageId,
        p_can_accept: toAccept,
      });
      if (error) throw error;
      return `${window.location.origin}/doc/${data as string}`;
    },
    onSuccess: (url) => {
      setFresh(url);
      void navigator.clipboard
        ?.writeText(url)
        .then(() => toast({ text: "Link copied", detail: url }));
    },
    onError: (e) => toast({ text: friendlyError(e), tone: "error" }),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().rpc("revoke_page_link", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => toast({ text: "Link turned off" }),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <section className="share-panel" aria-label="Share">
      <div className="share-new">
        <label className="check">
          <input
            type="checkbox"
            checked={toAccept}
            onChange={(e) => setToAccept(e.target.checked)}
          />{" "}
          They can accept it online
        </label>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          Create link
        </Button>
      </div>
      {fresh && (
        <div className="share-fresh">
          <code>{fresh}</code>
          <div className="share-fresh-actions">
            <a
              className="btn btn-secondary"
              href={whatsappLink(`${title || "Gecko"}: ${fresh}`)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Send on WhatsApp
            </a>
            <a className="btn btn-secondary" href={fresh} target="_blank" rel="noreferrer noopener">
              Open
            </a>
          </div>
          <p className="small">Copy it now: for safety, the full link is shown only once.</p>
        </div>
      )}
      {(links.data ?? []).length > 0 && (
        <ul className="share-list">
          {(links.data ?? []).map((l) => (
            <li key={l.id}>
              <span>
                <strong>
                  {l.acceptedAt
                    ? `Accepted by ${l.acceptedName}`
                    : l.canAccept
                      ? "To accept"
                      : "Read only"}
                </strong>
                <span className="small">
                  {" "}
                  · made {day(l.createdAt)} · {l.views} {l.views === 1 ? "view" : "views"}
                  {l.lastViewedAt ? `, last ${day(l.lastViewedAt)}` : ""}
                  {l.acceptedAt ? ` · accepted ${day(l.acceptedAt)}` : ""}
                </span>
              </span>
              <button type="button" className="name-copy" onClick={() => revoke.mutate(l.id)}>
                Turn off
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
