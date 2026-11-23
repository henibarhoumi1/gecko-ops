import { useState } from "react";
import { ItemMenu } from "@/components/ItemMenu";
import { Notice } from "@/components/Notice";
import type { Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { lastTouchAt, sortLeads, type SortKey } from "./crm";
import { useDeleteLeads, usePatchLeads } from "./leadsApi";
import { CHANNELS, isOverdue, STAGE_LABEL, stepOf, type Lead } from "./model";
import { lastTouchText } from "./outreach";
import { instagramUrl, whatsappUrl } from "./session";

const COLS: { key: SortKey; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "stage", label: "Stage" },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value" },
  { key: "touch", label: "Last touch" },
  { key: "next", label: "Next" },
  { key: "created", label: "Added" },
];

const day = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** Every lead as one sortable table: the CRM view of the Pipeline. Click a row to open it beside the table. */
export function CrmTable({
  leads,
  members,
  today,
  canDelete,
  openId,
  onOpen,
}: {
  leads: Lead[];
  members: Member[];
  today: string;
  canDelete: boolean;
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  const [key, setKey] = useState<SortKey>("next");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const patch = usePatchLeads();
  const remove = useDeleteLeads();
  const ownerName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "";
  const rows = sortLeads(leads, key, dir, ownerName);
  const sortBy = (k: SortKey) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir(k === "value" || k === "touch" || k === "created" ? "desc" : "asc");
    }
  };
  const close = (l: Lead, stage: "won" | "lost") =>
    patch.mutate([
      {
        id: l.id,
        patch: {
          stage,
          history: [...(l.history ?? []), { at: today, stage }],
          next_date: stage === "won" ? l.next_date : null,
          lost_reason: stage === "lost" ? "other" : l.lost_reason,
        },
      },
    ]);

  return (
    <>
      {(patch.isError || remove.isError) && (
        <Notice tone="error">{friendlyError(patch.error ?? remove.error)}</Notice>
      )}
      <div className="crm-wrap">
        <table className="crm">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={key === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button type="button" onClick={() => sortBy(c.key)}>
                    {c.label}
                    <span aria-hidden="true">
                      {key === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col" className="crm-act">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const ig = instagramUrl(l.handle);
              const wa = whatsappUrl(l.whatsapp || l.phone, "");
              const late = isOverdue(l, today);
              const step = stepOf(l.stage);
              return (
                <tr
                  key={l.id}
                  className={openId === l.id ? "is-open" : undefined}
                  onClick={() => onOpen(l.id)}
                >
                  <td>
                    <strong>{l.brand}</strong>
                    <span className="crm-sub">
                      {[l.handle, l.channel ? (CHANNELS[l.channel] ?? l.channel) : "", l.sector]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td>
                    <span className={`crm-stage st-${step}`}>{STAGE_LABEL[step]}</span>
                  </td>
                  <td>
                    {ownerName(l.owner_member_id) || <span className="crm-none">Nobody</span>}
                  </td>
                  <td className="crm-num">
                    {l.value != null ? `${Number(l.value).toLocaleString("fr-FR")} DT` : ""}
                  </td>
                  <td>
                    {lastTouchAt(l) ? (
                      lastTouchText(l, today)
                    ) : (
                      <span className="crm-none">never</span>
                    )}
                  </td>
                  <td className={late ? "crm-late" : undefined}>
                    {l.next_date ? day(l.next_date) : ""}
                    {l.next_step && <span className="crm-sub">{l.next_step}</span>}
                  </td>
                  <td>{day(l.created_at)}</td>
                  <td className="crm-act" onClick={(e) => e.stopPropagation()}>
                    <ItemMenu
                      actions={[
                        { label: "Open", onSelect: () => onOpen(l.id) },
                        {
                          label: "Open Instagram in a new tab",
                          hidden: !ig,
                          onSelect: () => window.open(ig!, "_blank", "noopener"),
                        },
                        {
                          label: "Open WhatsApp",
                          hidden: !wa,
                          onSelect: () => window.open(wa!, "_blank", "noopener"),
                        },
                        {
                          label: "Open website in a new tab",
                          hidden: !l.url,
                          onSelect: () => window.open(l.url!, "_blank", "noopener"),
                        },
                        {
                          label: "Mark won",
                          hidden: step === "won",
                          onSelect: () => close(l, "won"),
                        },
                        {
                          label: "Mark lost",
                          hidden: step === "lost",
                          onSelect: () => close(l, "lost"),
                        },
                        {
                          label: "Move to trash",
                          danger: true,
                          hidden: !canDelete,
                          onSelect: () => remove.mutate([l.id]),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
