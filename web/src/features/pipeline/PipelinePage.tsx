import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useMembers, type Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { todayIso } from "@/lib/dates";
import { LeadDialog, blankLead } from "./LeadDialog";
import { LeadPanel } from "./LeadPanel";
import type { LeadInput, LeadPatch } from "./leadsApi";
import { newLeadId, useAddLeads, useLeads, usePatchLeads } from "./leadsApi";
import {
  byNextDate,
  CHANNELS,
  GAP_LABEL,
  gaps,
  isOpen,
  isOverdue,
  LOST_REASONS,
  OUTCOMES,
  STAGE_LABEL,
  STEPS,
  stepOf,
  type Lead,
  type Outcome,
  type Step,
} from "./model";
import { addDays, lastTouchText, parsePaste } from "./outreach";

type Editing = { lead: LeadInput | Lead; isNew: boolean } | null;
type Filter = "open" | "due" | Step | Outcome;

const FILTERS: Filter[] = ["open", "due", ...STEPS, ...OUTCOMES];
const filterName = (f: Filter) =>
  f === "open" ? "All open" : f === "due" ? "To touch today" : STAGE_LABEL[f];

export function PipelinePage() {
  const leads = useLeads();
  const members = useMembers();
  const patch = usePatchLeads();
  const [editing, setEditing] = useState<Editing>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  // Today links straight to a lead: /pipeline?lead=<id> opens its panel.
  const [params] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => params.get("lead"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const today = todayIso();
  const closePanel = useCallback(() => setOpenId(null), []);

  const memberIds = useMemo(() => new Set((members.data ?? []).map((m) => m.id)), [members.data]);
  const all = useMemo(() => leads.data ?? [], [leads.data]);

  if (leads.isPending || members.isPending) return <p className="loading">Loading the pipeline…</p>;
  if (leads.isError || members.isError)
    return <Notice tone="error">{friendlyError(leads.error ?? members.error)}</Notice>;

  const me = members.data.find((m) => m.userId)?.id ?? null;
  const open = all.filter((l) => isOpen(l.stage));
  const due = open.filter((l) => !l.next_date || l.next_date <= today);
  const unsafe = open.filter((l) => gaps(l, memberIds).length);
  const late = open.filter((l) => isOverdue(l, today)).length;

  const q = search.trim().toLowerCase();
  const matches = (l: Lead) =>
    !q ||
    [l.brand, l.handle, l.contact, l.sector]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  const inFilter = (l: Lead) =>
    filter === "open"
      ? isOpen(l.stage)
      : filter === "due"
        ? isOpen(l.stage) && (!l.next_date || l.next_date <= today)
        : stepOf(l.stage) === filter;
  const shown = all.filter((l) => inFilter(l) && matches(l)).sort(byNextDate);
  const count = (f: Filter) =>
    f === "open"
      ? open.length
      : f === "due"
        ? due.length
        : all.filter((l) => stepOf(l.stage) === f).length;

  const openLead = all.find((l) => l.id === openId) ?? null;
  const picked = shown.filter((l) => selected.has(l.id));

  const bulk = (make: (l: Lead) => LeadPatch) =>
    patch.mutate(
      picked.map((l) => ({ id: l.id, patch: make(l) })),
      { onSuccess: () => setSelected(new Set()) },
    );

  // The yellow warnings, fixed at the source: you own them, the next step is the first message, today.
  const fixAll = () =>
    patch.mutate(
      unsafe.map((l) => ({
        id: l.id,
        patch: {
          owner_member_id:
            l.owner_member_id && memberIds.has(l.owner_member_id) ? l.owner_member_id : me,
          next_step:
            l.next_step?.trim() || (stepOf(l.stage) === "prospect" ? "First message" : "Follow up"),
          next_date: l.next_date ?? today,
        },
      })),
    );

  return (
    <section className="page wide pipeline">
      <header className="page-head">
        <div>
          <h1>Pipeline</h1>
          <p>
            {open.length} open · <strong>{due.length} to touch today</strong>
            {late > 0 && ` · ${late} late`}
          </p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={() => setView(view === "list" ? "board" : "list")}>
            {view === "list" ? "Board view" : "List view"}
          </Button>
          <Button onClick={() => setAdding(!adding)}>{adding ? "Close" : "Add leads"}</Button>
        </div>
      </header>

      {adding && (
        <QuickAdd
          existing={all}
          me={me}
          today={today}
          onDone={() => setAdding(false)}
          onOneByOne={() => {
            setAdding(false);
            setEditing({ lead: blankLead(me, today), isNew: true });
          }}
        />
      )}

      {unsafe.length > 0 && me && (
        <Notice>
          {unsafe.length} open {unsafe.length === 1 ? "lead has" : "leads have"} no owner, next step
          or date.{" "}
          <Button variant="link" onClick={fixAll} disabled={patch.isPending}>
            Make them mine, next step &ldquo;First message&rdquo;, today
          </Button>
        </Notice>
      )}
      {patch.isError && <Notice tone="error">{friendlyError(patch.error)}</Notice>}

      {view === "board" ? (
        <Board
          leads={all}
          members={members.data}
          memberIds={memberIds}
          today={today}
          onOpen={(lead) => setOpenId(lead.id)}
        />
      ) : (
        <>
          <div className="pipe-tools">
            <input
              className="pipe-search"
              type="search"
              placeholder="Search brand, handle, contact, sector"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leads"
            />
            <div className="chips" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  aria-pressed={filter === f}
                  onClick={() => {
                    setFilter(f);
                    setSelected(new Set());
                  }}
                >
                  {filterName(f)} <span className="count">{count(f)}</span>
                </button>
              ))}
            </div>
          </div>

          {picked.length > 0 && (
            <div className="pipe-bulk" role="toolbar" aria-label="Change the selected leads">
              <strong>{picked.length} selected</strong>
              {me && (
                <Button variant="link" onClick={() => bulk(() => ({ owner_member_id: me }))}>
                  Make mine
                </Button>
              )}
              <Button variant="link" onClick={() => bulk(() => ({ next_date: today }))}>
                Today
              </Button>
              <Button variant="link" onClick={() => bulk(() => ({ next_date: addDays(today, 1) }))}>
                Tomorrow
              </Button>
              <Button variant="link" onClick={() => bulk(() => ({ next_date: addDays(today, 7) }))}>
                Next week
              </Button>
              <select
                aria-label="Move to stage"
                value=""
                onChange={(e) => {
                  const stage = e.target.value as Step | Outcome;
                  if (!stage) return;
                  bulk((l) => ({
                    stage,
                    history:
                      stepOf(l.stage) === stage ? l.history : [...l.history, { at: today, stage }],
                  }));
                }}
              >
                <option value="">Move to…</option>
                {[...STEPS, ...OUTCOMES].map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
              <Button variant="link" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {shown.length === 0 ? (
            <p className="empty-state">
              {all.length === 0
                ? "No leads yet. Paste a few Instagram handles to start."
                : filter === "due"
                  ? "Nobody to touch today. Good."
                  : "No lead matches."}
            </p>
          ) : (
            <ul className="pipe-list">
              {shown.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  members={members.data}
                  memberIds={memberIds}
                  today={today}
                  active={lead.id === openId}
                  checked={selected.has(lead.id)}
                  onCheck={(on) => {
                    const next = new Set(selected);
                    if (on) next.add(lead.id);
                    else next.delete(lead.id);
                    setSelected(next);
                  }}
                  onOpen={() => setOpenId(lead.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {openLead && (
        <LeadPanel
          key={openLead.id}
          lead={openLead}
          members={members.data}
          me={me}
          onClose={closePanel}
          onEditAll={() => setEditing({ lead: openLead, isNew: false })}
        />
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

function initials(name: string | undefined): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function LeadRow({
  lead,
  members,
  memberIds,
  today,
  active,
  checked,
  onCheck,
  onOpen,
}: {
  lead: Lead;
  members: Member[];
  memberIds: ReadonlySet<string>;
  today: string;
  active: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onOpen: () => void;
}) {
  const owner = members.find((m) => m.id === lead.owner_member_id)?.name;
  const missing = gaps(lead, memberIds);
  const lateDate = isOverdue(lead, today);
  return (
    <li className={`pipe-row${active ? " active" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        aria-label={`Select ${lead.brand}`}
      />
      <button type="button" className="pipe-open" onClick={onOpen}>
        <span className="pipe-who">
          <strong dir="auto">{lead.brand}</strong>
          <span className="small">
            {[lead.handle, lead.channel ? (CHANNELS[lead.channel] ?? lead.channel) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className={`pipe-stage stage-${stepOf(lead.stage)}`}>
          {STAGE_LABEL[stepOf(lead.stage)]}
        </span>
        <span className="pipe-next small">
          {lead.stage === "lost" && lead.lost_reason ? (
            (LOST_REASONS[lead.lost_reason] ?? lead.lost_reason)
          ) : missing.length ? (
            <span className="pipe-gap">Needs {missing.map((g) => GAP_LABEL[g]).join(", ")}</span>
          ) : (
            <>
              {lead.next_step}
              {lead.next_date && (
                <span className={lateDate ? "pipe-late" : ""}> · {formatDay(lead.next_date)}</span>
              )}
            </>
          )}
        </span>
        <span className="pipe-touch small">{lastTouchText(lead, today)}</span>
        <span className="pipe-owner" title={owner ?? "Nobody"}>
          {initials(owner) || "–"}
        </span>
      </button>
    </li>
  );
}

/** Paste handles, links or names, one per line: each becomes a lead, yours, first message today. */
function QuickAdd({
  existing,
  me,
  today,
  onDone,
  onOneByOne,
}: {
  existing: Lead[];
  me: string | null;
  today: string;
  onDone: () => void;
  onOneByOne: () => void;
}) {
  const add = useAddLeads();
  const [text, setText] = useState("");
  const { fresh, skipped } = parsePaste(text, existing);
  return (
    <form
      className="card pipe-add"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate(
          fresh.map((p) => ({
            ...blankLead(me, today),
            id: newLeadId(),
            brand: p.brand,
            handle: p.handle,
            url: p.url,
            channel: p.channel,
            next_step: "First message",
          })),
          { onSuccess: onDone },
        );
      }}
    >
      <label htmlFor="pipe-paste">
        <strong>Paste Instagram or TikTok handles, links or brand names, one per line.</strong>
      </label>
      <textarea
        id="pipe-paste"
        rows={4}
        value={text}
        placeholder={"@crush__cookies\nhttps://www.instagram.com/benma_tn\nHera Labs"}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      {fresh.length > 0 && (
        <p className="small">
          Adds {fresh.length}: {fresh.map((f) => f.brand).join(", ")}. Each is yours, with
          &ldquo;First message&rdquo; today.
        </p>
      )}
      {skipped.length > 0 && (
        <p className="small">Already in the pipeline, skipped: {skipped.join(", ")}.</p>
      )}
      {add.isError && <Notice tone="error">{friendlyError(add.error)}</Notice>}
      <div className="actions">
        <Button variant="link" onClick={onOneByOne}>
          Add one with all the details
        </Button>
        <Button type="submit" disabled={!fresh.length || add.isPending}>
          {add.isPending ? "Adding…" : `Add ${fresh.length || ""} leads`.replace("  ", " ")}
        </Button>
      </div>
    </form>
  );
}

/** The columns, for those who like a board. Empty columns fold to a thin strip. */
function Board({
  leads,
  members,
  memberIds,
  today,
  onOpen,
}: {
  leads: Lead[];
  members: Member[];
  memberIds: ReadonlySet<string>;
  today: string;
  onOpen: (lead: Lead) => void;
}) {
  const grouped = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = stepOf(lead.stage);
    grouped.set(key, [...(grouped.get(key) ?? []), lead]);
  }
  for (const list of grouped.values()) list.sort(byNextDate);
  return (
    <div className="board">
      {STEPS.map((step) => {
        const list = grouped.get(step) ?? [];
        return (
          <section
            key={step}
            className={`column${list.length ? "" : " column-empty"}`}
            aria-label={STAGE_LABEL[step]}
          >
            <h2>
              {STAGE_LABEL[step]} <span className="count">{list.length}</span>
            </h2>
            {list.map((lead) => {
              const missing = gaps(lead, memberIds);
              const owner = members.find((m) => m.id === lead.owner_member_id)?.name;
              return (
                <button
                  key={lead.id}
                  type="button"
                  className={`lead${missing.length ? " lead-unsafe" : ""}`}
                  onClick={() => onOpen(lead)}
                >
                  <strong>{lead.brand}</strong>
                  {lead.handle && <span className="small">{lead.handle}</span>}
                  {lead.next_step && (
                    <span className={`small${isOverdue(lead, today) ? " late" : ""}`}>
                      {lead.next_step}
                      {lead.next_date && ` · ${formatDay(lead.next_date)}`}
                    </span>
                  )}
                  {owner && <span className="small">{owner}</span>}
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
