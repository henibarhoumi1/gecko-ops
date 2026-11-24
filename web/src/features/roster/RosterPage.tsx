import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { ItemMenu } from "@/components/ItemMenu";
import { Notice } from "@/components/Notice";
import { useClients } from "@/features/clients/clientsApi";
import { useMembers } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import {
  allTags,
  blank,
  filterRoster,
  initials,
  instagramLink,
  KIND_LABEL,
  parseTags,
  ROLES,
  type GearItem,
  type RosterEntry,
  type RosterInput,
  type RosterKind,
} from "./model";
import { useRoster, useRosterActions } from "./rosterApi";

type Editing = { id?: string; input: RosterInput } | null;

const COPY: Record<RosterKind, { lead: string; empty: string; add: string; rate: string }> = {
  talent: {
    lead: "Everyone we cast: faces, voices and creators, with their rate and how to reach them.",
    empty:
      "No talent yet. Add the people you work with, and propose them to a client in one click.",
    add: "Add talent",
    rate: "Day rate (DT)",
  },
  location: {
    lead: "Every place we shoot: studios, homes, shops and outdoor spots, with what they cost.",
    empty:
      "No locations yet. Add the places you shoot in, and propose them to a client in one click.",
    add: "Add a location",
    rate: "Rate (DT)",
  },
  creator: {
    lead: "Gecko's bank of UGC creators: who films what, their rate, their audience and how to reach them.",
    empty:
      "No creators yet. Add the UGC creators you work with, and cast them for a client in one click.",
    add: "Add a creator",
    rate: "Rate per video (DT)",
  },
  studio: {
    lead: "Rental houses and studios: the gear each one rents, the rates, and who to call.",
    empty: "No studios yet. Add a rental house with its gear list and rates.",
    add: "Add a studio",
    rate: "Day rate for the space (DT)",
  },
};

/** The studio's talent or locations, as a gallery: search, filter, add, propose to a client, hide, delete. */
export function RosterPage({ kind }: { kind: RosterKind }) {
  const { role } = useWorkspace();
  const roster = useRoster(kind);
  const act = useRosterActions(kind);
  const clients = useClients();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId)?.name ?? "";
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tag, setTag] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [proposing, setProposing] = useState<RosterEntry | null>(null);
  const [done, setDone] = useState("");
  const canDelete = role === "founder" || role === "sales";
  const C = COPY[kind];

  const list = useMemo(() => roster.data ?? [], [roster.data]);
  const shown = filterRoster(list, { q, role: roleFilter, tag, showHidden });
  const tags = allTags(list).slice(0, 12);
  const hiddenCount = list.filter((e) => e.hidden).length;

  const error =
    roster.error ?? act.save.error ?? act.remove.error ?? act.hide.error ?? act.propose.error;

  return (
    <section className="page wide roster">
      <header className="page-head">
        <div>
          <h1>{KIND_LABEL[kind].many}</h1>
          <p className="lede">{C.lead}</p>
        </div>
        <div className="actions">
          <Button onClick={() => setEditing({ input: blank(kind) })}>{C.add}</Button>
        </div>
      </header>

      {error && <Notice tone="error">{friendlyError(error)}</Notice>}
      {done && <Notice>{done}</Notice>}

      <div className="roster-tools">
        <input
          type="search"
          className="roster-search"
          placeholder={`Search ${KIND_LABEL[kind].many.toLowerCase()}: name, city, tag`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
        />
        <div className="seg" role="group" aria-label="Type">
          <button type="button" aria-pressed={!roleFilter} onClick={() => setRoleFilter("")}>
            All
          </button>
          {ROLES[kind].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={roleFilter === r}
              onClick={() => setRoleFilter(roleFilter === r ? "" : r)}
            >
              {r}
            </button>
          ))}
        </div>
        {hiddenCount > 0 && (
          <label className="roster-hidden-toggle">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            Show hidden ({hiddenCount})
          </label>
        )}
      </div>
      {tags.length > 0 && (
        <div className="roster-tags" role="group" aria-label="Tags">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? "" : t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {roster.isPending ? (
        <p className="loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="empty-state">{list.length === 0 ? C.empty : "Nothing matches."}</p>
      ) : (
        <ul className="roster-grid">
          {shown.map((e) => {
            const ig = instagramLink(e.instagram);
            return (
              <li key={e.id} className={`roster-card${e.hidden ? " is-hidden" : ""}`}>
                <button
                  type="button"
                  className="roster-photo"
                  onClick={() => setEditing({ id: e.id, input: pick(e) })}
                  aria-label={`Open ${e.name}`}
                >
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className={`roster-initials tone-${toneOf(e.name)}`}>
                      {initials(e.name)}
                    </span>
                  )}
                  {e.hidden && <span className="roster-flag">Hidden</span>}
                </button>
                <div className="roster-body">
                  <div className="roster-title">
                    <strong>{e.name}</strong>
                    <ItemMenu
                      actions={[
                        { label: "Open", onSelect: () => setEditing({ id: e.id, input: pick(e) }) },
                        { label: "Propose to a client", onSelect: () => setProposing(e) },
                        {
                          label: "Open Instagram in a new tab",
                          hidden: !ig,
                          onSelect: () => window.open(ig!, "_blank", "noopener"),
                        },
                        {
                          label: "Open link in a new tab",
                          hidden: !e.link,
                          onSelect: () => window.open(e.link, "_blank", "noopener"),
                        },
                        {
                          label: "Copy phone",
                          hidden: !e.phone,
                          onSelect: () => void navigator.clipboard?.writeText(e.phone),
                        },
                        {
                          label: e.hidden ? "Show again" : "Hide",
                          onSelect: () => act.hide.mutate({ id: e.id, hidden: !e.hidden }),
                        },
                        {
                          label: "Move to trash",
                          danger: true,
                          hidden: !canDelete,
                          onSelect: () => act.remove.mutate(e.id),
                        },
                      ]}
                    />
                  </div>
                  <span className="small">
                    {[e.role, e.city].filter(Boolean).join(" · ") || " "}
                  </span>
                  {(e.gear ?? []).length > 0 && (
                    <ul className="gear-list small">
                      {(e.gear ?? []).slice(0, 4).map((g, i) => (
                        <li key={i}>
                          <span dir="auto">{g.name}</span>
                          {g.rate != null && (
                            <strong>
                              {g.rate.toLocaleString("fr-FR")} DT{g.unit ? `/${g.unit}` : ""}
                            </strong>
                          )}
                        </li>
                      ))}
                      {(e.gear ?? []).length > 4 && <li>+{(e.gear ?? []).length - 4} more</li>}
                    </ul>
                  )}
                  <div className="roster-meta">
                    {e.rate != null && (
                      <span className="roster-rate">
                        {e.rate.toLocaleString("fr-FR")} DT{e.rate_note && ` · ${e.rate_note}`}
                      </span>
                    )}
                    {e.rating != null && (
                      <span className="roster-stars" aria-label={`${e.rating} out of 5`}>
                        {"★".repeat(e.rating)}
                      </span>
                    )}
                  </div>
                  {e.tags.length > 0 && (
                    <div className="roster-card-tags">
                      {e.tags.slice(0, 4).map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Editor
          kind={kind}
          editing={editing}
          rateLabel={C.rate}
          saving={act.save.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            act.save.mutate(
              { id: editing.id, input, author: me },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      )}

      {proposing && (
        <div className="peek-veil" onClick={() => setProposing(null)}>
          <div
            className="peek peek-small"
            role="dialog"
            aria-label="Propose to a client"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="peek-head">
              <h2>Propose {proposing.name}</h2>
              <Button variant="secondary" onClick={() => setProposing(null)}>
                Close
              </Button>
            </header>
            <p className="small">
              It goes to the client&rsquo;s{" "}
              {kind === "talent" || kind === "creator"
                ? "Talent"
                : kind === "studio"
                  ? "Costs and fees"
                  : "Locations"}{" "}
              as a proposal, with its cost against their budget. The phone number stays on the team
              side.
            </p>
            <ul className="propose-list">
              {(clients.data ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={act.propose.isPending}
                    onClick={() =>
                      act.propose.mutate(
                        { entry: proposing, clientId: c.id },
                        {
                          onSuccess: () => {
                            setDone(`${proposing.name} proposed to ${c.brand}.`);
                            setProposing(null);
                          },
                        },
                      )
                    }
                  >
                    {c.brand}
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

const pick = (e: RosterEntry): RosterInput => ({
  kind: e.kind,
  name: e.name,
  role: e.role,
  city: e.city,
  phone: e.phone,
  instagram: e.instagram,
  link: e.link,
  photo_url: e.photo_url,
  rate: e.rate,
  rate_note: e.rate_note,
  tags: e.tags,
  notes: e.notes,
  rating: e.rating,
  email: e.email ?? "",
  gear: e.gear ?? [],
});

/** A steady colour per name for cards without a photo. */
function toneOf(name: string): "pink" | "yellow" | "blue" {
  let n = 0;
  for (const ch of name) n = (n + ch.charCodeAt(0)) % 3;
  return (["pink", "yellow", "blue"] as const)[n]!;
}

/** The side panel: every field of an entry, saved together. */
function Editor({
  kind,
  editing,
  rateLabel,
  saving,
  onClose,
  onSave,
}: {
  kind: RosterKind;
  editing: NonNullable<Editing>;
  rateLabel: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: RosterInput) => void;
}) {
  const [v, setV] = useState<RosterInput>(editing.input);
  const [tagText, setTagText] = useState(editing.input.tags.join(", "));
  const set = <K extends keyof RosterInput>(k: K, value: RosterInput[K]) =>
    setV({ ...v, [k]: value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return;
    onSave({ ...v, name: v.name.trim(), tags: parseTags(tagText) });
  };
  return (
    <div className="peek-veil" onClick={onClose}>
      <form
        className="peek"
        role="dialog"
        aria-label={editing.id ? v.name : `New ${KIND_LABEL[kind].one.toLowerCase()}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <header className="peek-head">
          <h2>{editing.id ? v.name || "Untitled" : `New ${KIND_LABEL[kind].one.toLowerCase()}`}</h2>
          <div className="actions">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={saving || !v.name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </header>
        {v.photo_url && (
          <img className="peek-photo" src={v.photo_url} alt="" referrerPolicy="no-referrer" />
        )}
        <div className="peek-fields">
          <label className="field">
            <span>Name</span>
            <input
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={v.role} onChange={(e) => set("role", e.target.value)}>
              <option value="">—</option>
              {ROLES[kind].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>City or area</span>
            <input value={v.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={v.phone} onChange={(e) => set("phone", e.target.value)} maxLength={60} />
          </label>
          <label className="field">
            <span>Instagram</span>
            <input
              value={v.instagram}
              placeholder="@handle"
              onChange={(e) => set("instagram", e.target.value)}
              maxLength={160}
            />
          </label>
          <label className="field">
            <span>Link (portfolio, Maps, listing)</span>
            <input
              type="url"
              value={v.link}
              placeholder="https://"
              onChange={(e) => set("link", e.target.value)}
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>Photo link</span>
            <input
              type="url"
              value={v.photo_url}
              placeholder="https://"
              onChange={(e) => set("photo_url", e.target.value)}
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>{rateLabel}</span>
            <input
              type="number"
              min={0}
              value={v.rate ?? ""}
              onChange={(e) => set("rate", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Rate note</span>
            <input
              value={v.rate_note}
              placeholder="per day, half day, usage included…"
              onChange={(e) => set("rate_note", e.target.value)}
              maxLength={160}
            />
          </label>
          <label className="field">
            <span>Rating</span>
            <select
              value={v.rating ?? ""}
              onChange={(e) => set("rating", e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">—</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              maxLength={200}
            />
          </label>
          {kind === "studio" && <GearEditor value={v.gear} onChange={(g) => set("gear", g)} />}
          <label className="field peek-wide">
            <span>Tags, separated by commas</span>
            <input
              value={tagText}
              placeholder="skincare, warm, speaks derja"
              onChange={(e) => setTagText(e.target.value)}
            />
          </label>
          <label className="field peek-wide">
            <span>Notes</span>
            <textarea
              rows={5}
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={4000}
            />
          </label>
        </div>
      </form>
    </div>
  );
}

/** The gear a studio rents: one row per item, with its rate and unit (day, half day, hour). */
function GearEditor({ value, onChange }: { value: GearItem[]; onChange: (g: GearItem[]) => void }) {
  const rows = value.length ? value : [];
  const put = (i: number, patch: Partial<GearItem>) =>
    onChange(rows.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <fieldset className="field peek-wide gear-editor">
      <legend>Gear they rent</legend>
      {rows.map((g, i) => (
        <div key={i} className="gear-row">
          <input
            aria-label="Item"
            placeholder="Sony FX3 kit"
            value={g.name}
            maxLength={120}
            onChange={(e) => put(i, { name: e.target.value })}
          />
          <input
            aria-label="Rate (DT)"
            type="number"
            min={0}
            placeholder="DT"
            value={g.rate ?? ""}
            onChange={(e) =>
              put(i, { rate: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
          <select
            aria-label="Per"
            value={g.unit}
            onChange={(e) => put(i, { unit: e.target.value })}
          >
            <option value="day">per day</option>
            <option value="half day">per half day</option>
            <option value="hour">per hour</option>
            <option value="">flat</option>
          </select>
          <button
            type="button"
            className="gear-x"
            aria-label="Remove"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      {rows.length < 100 && (
        <Button
          variant="secondary"
          onClick={() => onChange([...rows, { name: "", rate: null, unit: "day" }])}
        >
          Add gear
        </Button>
      )}
    </fieldset>
  );
}
