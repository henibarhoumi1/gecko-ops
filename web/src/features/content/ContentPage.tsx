// Gecko's own content and ads (Heni, 24 Nov 2026). A board for Gecko's posts from idea to posted, and ad
// campaigns with spend and results (entered from Meta / TikTok) so cost per lead and per click are always there.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { CountUp } from "@/features/today/HomeMore";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";

const STATUSES = ["idea", "script", "shoot", "edit", "scheduled", "posted"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABEL: Record<Status, string> = {
  idea: "Ideas",
  script: "Script",
  shoot: "Shoot",
  edit: "Edit",
  scheduled: "Scheduled",
  posted: "Posted",
};

interface Post {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: Status;
  publish_on: string | null;
  hook: string;
  link: string;
  views: number | null;
}

interface Ad {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: "draft" | "live" | "paused" | "done";
  starts_on: string | null;
  ends_on: string | null;
  budget: number | string | null;
  spend: number | string;
  impressions: number;
  clicks: number;
  leads: number;
}

const n = (v: number | string | null | undefined) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const dt = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} DT`;

/** Click rate, cost per click and cost per lead; null when there's nothing to divide by. */
export function adNumbers(a: Pick<Ad, "spend" | "impressions" | "clicks" | "leads">) {
  const spend = n(a.spend);
  return {
    ctr: a.impressions ? (a.clicks / a.impressions) * 100 : null,
    cpc: a.clicks ? spend / a.clicks : null,
    cpl: a.leads ? spend / a.leads : null,
  };
}

function useTable<T>(table: string, order: string) {
  const { id: workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const key = [table, workspaceId];
  const list = useQuery({
    queryKey: key,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await requireSupabase()
        .from(table)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order(order);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
  const done = () => qc.invalidateQueries({ queryKey: key });
  const add = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await requireSupabase()
        .from(table)
        .insert({ workspace_id: workspaceId, ...row });
      if (error) throw error;
    },
    onSettled: done,
  });
  const patch = useMutation({
    mutationFn: async ({ id, ...row }: { id: string } & Record<string, unknown>) => {
      const { error } = await requireSupabase().from(table).update(row).eq("id", id);
      if (error) throw error;
    },
    onSettled: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase().from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: done,
  });
  return { list, add, patch, remove };
}

export function ContentPage() {
  const { role } = useWorkspace();
  const lead = role === "founder" || role === "sales";
  const [tab, setTab] = useState<"board" | "ads">("board");
  return (
    <section className="page wide content-page">
      <header className="page-head">
        <div>
          <h1>Gecko content</h1>
          <p className="lede">
            Plan, make and post Gecko&rsquo;s content, and track what our ads bring in.
          </p>
        </div>
      </header>
      {lead && (
        <div className="wtabs-row tools-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="wtab"
            aria-selected={tab === "board"}
            onClick={() => setTab("board")}
          >
            Content board
          </button>
          <button
            type="button"
            role="tab"
            className="wtab"
            aria-selected={tab === "ads"}
            onClick={() => setTab("ads")}
          >
            Ad campaigns
          </button>
        </div>
      )}
      {tab === "board" || !lead ? <Board canEdit={lead} /> : <Ads />}
    </section>
  );
}

function Board({ canEdit }: { canEdit: boolean }) {
  const t = useTable<Post>("gecko_posts", "position");
  const posts = t.list.data ?? [];
  const [title, setTitle] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await t.add.mutateAsync({ title: title.trim(), position: posts.length });
      setTitle("");
    } catch (err) {
      toast({ text: friendlyError(err), tone: "error" });
    }
  }
  const move = (p: Post, d: -1 | 1) => {
    const i = STATUSES.indexOf(p.status) + d;
    const next = STATUSES[i];
    if (!next) return;
    t.patch.mutate({ id: p.id, status: next });
    if (next === "posted") toast({ text: "Posted", detail: p.title, celebrate: true });
  };

  return (
    <>
      {canEdit && (
        <form className="content-add" onSubmit={add}>
          <input
            value={title}
            maxLength={160}
            placeholder="A post idea for Gecko: behind the scenes, a before/after, a client result…"
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" disabled={t.add.isPending}>
            Add idea
          </Button>
        </form>
      )}
      <div className="content-board">
        {STATUSES.map((s) => {
          const col = posts.filter((p) => p.status === s);
          return (
            <section key={s} className="content-col">
              <h2 className="room-col-head">
                {STATUS_LABEL[s]} <span className="count">{col.length}</span>
              </h2>
              {col.map((p) => (
                <article key={p.id} className="content-card">
                  <strong dir="auto">{p.title}</strong>
                  {canEdit ? (
                    <div className="content-meta">
                      <select
                        aria-label="Platform"
                        value={p.platform}
                        onChange={(e) => t.patch.mutate({ id: p.id, platform: e.target.value })}
                      >
                        {["instagram", "tiktok", "facebook", "linkedin", "youtube"].map((x) => (
                          <option key={x} value={x}>
                            {x[0]!.toUpperCase() + x.slice(1)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        aria-label="Publish on"
                        value={p.publish_on ?? ""}
                        onChange={(e) =>
                          t.patch.mutate({ id: p.id, publish_on: e.target.value || null })
                        }
                      />
                    </div>
                  ) : (
                    <span className="small">
                      {p.platform}
                      {p.publish_on ? ` · ${p.publish_on}` : ""}
                    </span>
                  )}
                  {canEdit && (
                    <input
                      className="content-hook"
                      defaultValue={p.hook}
                      placeholder="Hook…"
                      maxLength={300}
                      onBlur={(e) => {
                        if (e.target.value !== p.hook)
                          t.patch.mutate({ id: p.id, hook: e.target.value });
                      }}
                    />
                  )}
                  {s === "posted" && canEdit && (
                    <div className="content-meta">
                      <input
                        defaultValue={p.link}
                        placeholder="Link to the post"
                        onBlur={(e) => {
                          if (e.target.value !== p.link)
                            t.patch.mutate({ id: p.id, link: e.target.value });
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        defaultValue={p.views ?? ""}
                        placeholder="Views"
                        onBlur={(e) =>
                          t.patch.mutate({
                            id: p.id,
                            views: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  {canEdit && (
                    <div className="content-move">
                      <button
                        type="button"
                        disabled={s === "idea"}
                        onClick={() => move(p, -1)}
                        aria-label="Back a step"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="content-del"
                        onClick={() =>
                          void t.remove
                            .mutateAsync(p.id)
                            .then(() => toast({ text: "Moved to the trash" }))
                        }
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        disabled={s === "posted"}
                        onClick={() => move(p, 1)}
                        aria-label="Next step"
                      >
                        →
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Ads() {
  const t = useTable<Ad>("gecko_ads", "created_at");
  const ads = t.list.data ?? [];
  const [name, setName] = useState("");
  const totals = ads.reduce(
    (s, a) => ({
      spend: s.spend + n(a.spend),
      impressions: s.impressions + a.impressions,
      clicks: s.clicks + a.clicks,
      leads: s.leads + a.leads,
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 },
  );
  const all = adNumbers(totals);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await t.add.mutateAsync({ name: name.trim() });
      setName("");
    } catch (err) {
      toast({ text: friendlyError(err), tone: "error" });
    }
  }
  const num = (a: Ad, k: "spend" | "impressions" | "clicks" | "leads" | "budget") => (
    <input
      type="number"
      min={0}
      className="ad-num"
      aria-label={k}
      defaultValue={a[k] == null ? "" : String(a[k])}
      onBlur={(e) => {
        const v = e.target.value === "" ? (k === "budget" ? null : 0) : Number(e.target.value);
        if (String(v ?? "") !== String(a[k] ?? "")) t.patch.mutate({ id: a.id, [k]: v });
      }}
    />
  );

  return (
    <>
      <div className="ceo-tiles">
        {(
          [
            ["Spent", dt(totals.spend)],
            ["Leads", String(totals.leads)],
            ["Cost per lead", all.cpl == null ? "—" : dt(all.cpl)],
            ["Clicks", String(totals.clicks)],
            ["Click rate", all.ctr == null ? "—" : `${all.ctr.toFixed(2)}%`],
            ["Cost per click", all.cpc == null ? "—" : dt(all.cpc)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="pulse-tile">
            <span className="pulse-label">{label}</span>
            <strong className="pulse-value">
              <CountUp value={value} />
            </strong>
          </div>
        ))}
      </div>
      <form className="content-add" onSubmit={add}>
        <input
          value={name}
          maxLength={160}
          placeholder="New campaign: “Studio leads, November”"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={t.add.isPending}>
          Add campaign
        </Button>
      </form>
      <p className="small muted">
        Copy the numbers from Ads Manager when you check them; the costs work themselves out.
      </p>
      {ads.length > 0 && (
        <div className="fin-table-wrap">
          <table className="fin-table ads-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>Leads</th>
                <th className="num">Per lead</th>
                <th className="num">Click rate</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => {
                const k = adNumbers(a);
                return (
                  <tr key={a.id}>
                    <td>
                      <strong dir="auto">{a.name}</strong>
                      <div className="small">
                        <select
                          aria-label="Platform"
                          value={a.platform}
                          onChange={(e) => t.patch.mutate({ id: a.id, platform: e.target.value })}
                        >
                          {["meta", "tiktok", "google", "linkedin", "other"].map((x) => (
                            <option key={x} value={x}>
                              {x === "meta" ? "Meta" : x[0]!.toUpperCase() + x.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <select
                        aria-label="Status"
                        value={a.status}
                        onChange={(e) => t.patch.mutate({ id: a.id, status: e.target.value })}
                      >
                        {["draft", "live", "paused", "done"].map((x) => (
                          <option key={x} value={x}>
                            {x[0]!.toUpperCase() + x.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{num(a, "budget")}</td>
                    <td>{num(a, "spend")}</td>
                    <td>{num(a, "impressions")}</td>
                    <td>{num(a, "clicks")}</td>
                    <td>{num(a, "leads")}</td>
                    <td className="num">{k.cpl == null ? "—" : dt(k.cpl)}</td>
                    <td className="num">{k.ctr == null ? "—" : `${k.ctr.toFixed(2)}%`}</td>
                    <td>
                      <button
                        type="button"
                        className="name-copy"
                        onClick={() =>
                          void t.remove
                            .mutateAsync(a.id)
                            .then(() => toast({ text: "Moved to the trash" }))
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
