import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useMembers, type Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { todayIso } from "@/lib/dates";
import { LeadDialog, blankLead } from "./LeadDialog";
import type { LeadInput } from "./leadsApi";
import { useLeads } from "./leadsApi";
import {
  byNextDate,
  CHANNELS,
  GAP_LABEL,
  gaps,
  isOverdue,
  LOST_REASONS,
  OUTCOMES,
  STAGE_LABEL,
  STEPS,
  stepOf,
  type Lead,
  type Outcome,
} from "./model";

type Editing = { lead: LeadInput | Lead; isNew: boolean } | null;
type View = "board" | Outcome;

export function PipelinePage() {
  const leads = useLeads();
  const members = useMembers();
  const [editing, setEditing] = useState<Editing>(null);
  const [view, setView] = useState<View>("board");
  const today = todayIso();

  const memberIds = useMemo(() => new Set((members.data ?? []).map((m) => m.id)), [members.data]);
  const grouped = useMemo(() => {
    const groups = new Map<string, Lead[]>();
    for (const lead of leads.data ?? []) {
      const key = stepOf(lead.stage);
      groups.set(key, [...(groups.get(key) ?? []), lead]);
    }
    for (const list of groups.values()) list.sort(byNextDate);
    return groups;
  }, [leads.data]);

  if (leads.isPending || members.isPending) return <p className="loading">Loading the pipeline…</p>;
  if (leads.isError || members.isError)
    return <Notice tone="error">{friendlyError(leads.error ?? members.error)}</Notice>;

  const open = (leads.data ?? []).filter((l) => !(OUTCOMES as readonly string[]).includes(l.stage));
  const unsafe = open.filter((l) => gaps(l, memberIds).length).length;
  const late = open.filter((l) => isOverdue(l, today)).length;
  const firstOwner =
    members.data.find((m) => m.role === "sales")?.id ?? members.data[0]?.id ?? null;

  return (
    <section className="page wide">
      <header className="page-head">
        <div>
          <h1>Pipeline</h1>
          <p className="muted">
            {open.length} open {open.length === 1 ? "lead" : "leads"}
            {late > 0 && ` · ${late} follow-up${late === 1 ? "" : "s"} late`}
            {unsafe > 0 && ` · ${unsafe} missing an owner, next step or date`}
          </p>
        </div>
        <Button onClick={() => setEditing({ lead: blankLead(firstOwner, today), isNew: true })}>
          Add lead
        </Button>
      </header>

      <nav className="tabs" aria-label="Pipeline view">
        {(["board", ...OUTCOMES] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            className="tab"
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v === "board" ? "Open" : STAGE_LABEL[v]}{" "}
            <span className="count">
              {v === "board" ? open.length : (grouped.get(v)?.length ?? 0)}
            </span>
          </button>
        ))}
      </nav>

      {view === "board" ? (
        <div className="board">
          {STEPS.map((step) => (
            <section key={step} className="column" aria-label={STAGE_LABEL[step]}>
              <h2>
                {STAGE_LABEL[step]} <span className="count">{grouped.get(step)?.length ?? 0}</span>
              </h2>
              {(grouped.get(step) ?? []).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  members={members.data}
                  memberIds={memberIds}
                  today={today}
                  onOpen={() => setEditing({ lead, isNew: false })}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="list">
          {(grouped.get(view) ?? []).map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              members={members.data}
              memberIds={memberIds}
              today={today}
              onOpen={() => setEditing({ lead, isNew: false })}
            />
          ))}
          {!grouped.get(view)?.length && <p className="muted">Nothing here yet.</p>}
        </div>
      )}

      {editing && (
        <LeadDialog
          key={editing.lead.id}
          lead={editing.lead}
          isNew={editing.isNew}
          members={members.data}
          today={today}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

interface LeadCardProps {
  lead: Lead;
  members: Member[];
  memberIds: ReadonlySet<string>;
  today: string;
  onOpen: () => void;
}

function LeadCard({ lead, members, memberIds, today, onOpen }: LeadCardProps) {
  const missing = gaps(lead, memberIds);
  const owner = members.find((m) => m.id === lead.owner_member_id)?.name;
  const meta = [lead.handle, lead.channel ? (CHANNELS[lead.channel] ?? lead.channel) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      className={`lead${missing.length ? " lead-unsafe" : ""}`}
      onClick={onOpen}
    >
      <strong>{lead.brand}</strong>
      {meta && <span className="muted small">{meta}</span>}
      {lead.stage === "lost" && lead.lost_reason && (
        <span className="small">{LOST_REASONS[lead.lost_reason] ?? lead.lost_reason}</span>
      )}
      {lead.next_step && (
        <span className={`small${isOverdue(lead, today) ? " late" : ""}`}>
          {lead.next_step}
          {lead.next_date && ` · ${formatDay(lead.next_date)}`}
        </span>
      )}
      {owner && <span className="muted small">{owner}</span>}
      {missing.length > 0 && (
        <span className="tag">Needs: {missing.map((g) => GAP_LABEL[g]).join(", ")}</span>
      )}
    </button>
  );
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
