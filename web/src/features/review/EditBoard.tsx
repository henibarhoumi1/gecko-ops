// The edit board (Heni, 24 Nov 2026): every reel in the edit, across clients, by where it is — editing, with the
// client, revisions, approved (to deliver), delivered — with who edits it and by when.
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { useMembers } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { normaliseCuts, type Cut } from "./model";

type Lane = "editing" | "client" | "changes" | "deliver" | "delivered";

const LANES: [Lane, string][] = [
  ["editing", "Editing"],
  ["client", "With the client"],
  ["changes", "Revisions"],
  ["deliver", "Approved: deliver"],
  ["delivered", "Delivered"],
];

export function laneOf(c: Pick<Cut, "status" | "delivered">): Lane {
  if (c.delivered) return "delivered";
  if (c.status === "approved") return "deliver";
  if (c.status === "changes") return "changes";
  if (c.status === "review") return "client";
  return "editing";
}

interface Assignment {
  cut_id: string;
  editor: string;
  due_on: string | null;
}

export function EditBoard() {
  const { id: workspaceId } = useWorkspace();
  const clients = useClients();
  const members = useMembers();
  const qc = useQueryClient();
  const list = clients.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const qs = useQueries({
    queries: list.map((c) => ({
      queryKey: ["cuts", workspaceId, c.id],
      queryFn: async () => {
        const { data, error } = await requireSupabase().rpc("get_cuts", {
          p_workspace_id: workspaceId,
          p_client_id: c.id,
        });
        if (error) throw error;
        return normaliseCuts(data);
      },
    })),
  });
  const key = ["edit-assignments", workspaceId];
  const assignments = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await requireSupabase()
        .from("edit_assignments")
        .select("cut_id,editor,due_on")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });
  const assign = useMutation({
    mutationFn: async (a: Assignment) => {
      const { error } = await requireSupabase()
        .from("edit_assignments")
        .upsert({ workspace_id: workspaceId, ...a });
      if (error) throw error;
    },
    onError: (e) => toast({ text: friendlyError(e), tone: "error" }),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const loading = clients.isPending || qs.some((q) => q.isPending);
  const cards = list.flatMap((c, i) =>
    (qs[i]?.data?.cuts ?? []).map((cut) => ({
      cut,
      client: c,
      lane: laneOf(cut),
      a: assignments.data?.find((x) => x.cut_id === cut.id),
    })),
  );
  const people = (members.data ?? []).map((m) => m.name).filter(Boolean);

  return (
    <section className="page wide edit-board-page">
      <header className="page-head">
        <div>
          <h1>Edit board</h1>
          <p className="lede">
            {loading
              ? "Gathering every reel in the edit…"
              : `${cards.filter((c) => c.lane !== "delivered").length} reels in the edit, ${
                  cards.filter((c) => c.a?.due_on && c.a.due_on < today && c.lane !== "delivered")
                    .length
                } late.`}
          </p>
        </div>
      </header>
      {loading ? (
        <p className="loading">Loading</p>
      ) : cards.length === 0 ? (
        <p className="empty-state">
          No reels in the edit yet. Upload a first cut from a client&rsquo;s Review page.
        </p>
      ) : (
        <div className="eb">
          {LANES.map(([lane, label]) => {
            const lc = cards.filter((c) => c.lane === lane);
            return (
              <section key={lane} className={`eb-lane lane-${lane}`}>
                <h2 className="room-col-head">
                  {label} <span className="count">{lc.length}</span>
                </h2>
                {lc.map(({ cut, client, a }) => {
                  const late = a?.due_on && a.due_on < today && lane !== "delivered";
                  return (
                    <article key={cut.id} className={`eb-card${late ? " is-late" : ""}`}>
                      <Link
                        to={`/clients/${encodeURIComponent(client.id)}/review`}
                        className="eb-title"
                      >
                        <span className="small" dir="auto">
                          {client.brand}
                        </span>
                        <strong dir="auto">{cut.title}</strong>
                        <span className="small">
                          {cut.version ? `Version ${cut.version}` : "No cut yet"}
                          {cut.notes.length ? ` · ${cut.notes.length} notes` : ""}
                        </span>
                      </Link>
                      {lane !== "delivered" && (
                        <div className="eb-fields">
                          <select
                            aria-label="Editor"
                            value={a?.editor ?? ""}
                            onChange={(e) =>
                              assign.mutate({
                                cut_id: cut.id,
                                editor: e.target.value,
                                due_on: a?.due_on ?? null,
                              })
                            }
                          >
                            <option value="">Who edits?</option>
                            {people.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            aria-label="Due"
                            value={a?.due_on ?? ""}
                            onChange={(e) =>
                              assign.mutate({
                                cut_id: cut.id,
                                editor: a?.editor ?? "",
                                due_on: e.target.value || null,
                              })
                            }
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
