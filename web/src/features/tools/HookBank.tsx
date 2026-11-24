// The hook bank (Heni, 24 Nov 2026): every hook Gecko has written, across clients, with the ones clients picked
// and approved first. Search it, copy one, reuse what worked.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { toBank, type HookRow } from "./hookBank";

export function useHookBank() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["hook-bank", workspaceId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("scripts")
        .select("id,client_id,title,style,status,hook,hooks,updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return toBank((data ?? []) as HookRow[]);
    },
  });
}

export function HookBank() {
  const bank = useHookBank();
  const clients = useClients();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "picked">("all");
  const brand = (id: string) => clients.data?.find((c) => c.id === id)?.brand ?? "";
  const list = (bank.data ?? []).filter(
    (h) =>
      (only === "all" || h.picked) &&
      (!q ||
        `${h.line} ${h.see} ${h.script} ${brand(h.clientId)}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  return (
    <>
      <div className="bank-bar">
        <input
          className="pages-search"
          placeholder="Search hooks, scripts, clients"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search hooks"
        />
        <div className="seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={only === "all"} onClick={() => setOnly("all")}>
            All
          </button>
          <button type="button" aria-pressed={only === "picked"} onClick={() => setOnly("picked")}>
            Picked by clients
          </button>
        </div>
        <span className="small">{list.length} hooks</span>
      </div>
      {bank.isPending ? (
        <p className="loading">Loading</p>
      ) : list.length === 0 ? (
        <p className="empty-state">
          {(bank.data ?? []).length === 0
            ? "No hooks yet. Every hook written in a script lands here."
            : "No hook matches."}
        </p>
      ) : (
        <ul className="bank-list">
          {list.slice(0, 200).map((h) => (
            <li key={h.key} className="bank-item">
              <div className="bank-line" dir="auto">
                <strong>“{h.line}”</strong>
                {h.see && <span className="small">Shows: {h.see}</span>}
              </div>
              <div className="bank-meta small">
                {h.picked && h.approved && (
                  <span className="bank-tag is-win">Picked and approved</span>
                )}
                {h.picked && !h.approved && <span className="bank-tag">Picked</span>}
                <span dir="auto">
                  {brand(h.clientId)} · {h.script}
                </span>
              </div>
              <button
                type="button"
                className="name-copy"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(h.line)
                    .then(() => toast({ text: "Hook copied", detail: h.line }))
                }
              >
                Copy
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
