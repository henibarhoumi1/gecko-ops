import { Icon } from "@/components/Icon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Role } from "@/features/auth/account";
import { useClients } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { useFinanceAccess } from "@/features/finance/financeApi";
import { navFor } from "./nav";

const OPEN = "gecko:palette";

/** Opens the search from anywhere (the sidebar button). */
export const openPalette = () => window.dispatchEvent(new Event(OPEN));

interface Hit {
  key: string;
  label: string;
  hint: string;
  to: string;
}

/** The places in a client a person may open. */
function clientPlaces(lead: boolean): [string, string][] {
  return [
    ...(lead ? ([["", "Overview"]] as [string, string][]) : []),
    ["concepts", "Ideas"],
    ["scripts", "Scripts"],
    ["shoot", "Shoot days"],
    ["review", "Review"],
    ["results", "Results"],
    ...(lead
      ? ([
          ["production", "Production"],
          ["money", "Money"],
          ["onboarding", "Onboarding"],
        ] as [string, string][])
      : []),
  ];
}

/** True when every word typed appears in the text, in any order. */
export function matches(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/**
 * Cmd+K (or Ctrl+K): type a client, a lead or a page, press Enter, land there.
 * "dany scripts" opens Dany Clean's scripts.
 */
export function CommandPalette({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { id: workspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const lead = role === "founder" || role === "sales";
  const finance = useFinanceAccess();
  const clients = useClients();
  const leads = useQuery({
    queryKey: ["palette-leads", workspaceId],
    enabled: open && lead,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("leads")
        .select("id,brand,handle")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data as { id: string; brand: string; handle: string | null }[];
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      window.setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  const all = useMemo<Hit[]>(() => {
    // Actions first: the things people do most, one Enter away.
    const hits: Hit[] = [];
    if (lead) {
      hits.push(
        {
          key: "act-outreach",
          label: "Start outreach",
          hint: "Action",
          to: "/pipeline?view=outreach",
        },
        { key: "act-leads", label: "Add leads", hint: "Action", to: "/pipeline?add=1" },
      );
    }
    for (const c of clients.data ?? []) {
      const base = `/clients/${encodeURIComponent(c.id)}`;
      hits.push(
        {
          key: `act-idea-${c.id}`,
          label: `New idea for ${c.brand}`,
          hint: "Action",
          to: `${base}/concepts?new=1`,
        },
        {
          key: `act-script-${c.id}`,
          label: `New script for ${c.brand}`,
          hint: "Action",
          to: `${base}/scripts?new=1`,
        },
      );
      if (lead)
        hits.push({
          key: `act-approve-${c.id}`,
          label: `Approve shoot choices for ${c.brand}`,
          hint: "Action",
          to: `${base}/production`,
        });
    }
    hits.push(
      ...navFor(role, { finance: !!finance.data }).map((n) => ({
        key: `page-${n.path}`,
        label: n.label,
        hint: "Page",
        to: `/${n.path}`,
      })),
    );
    for (const c of clients.data ?? []) {
      const base = `/clients/${encodeURIComponent(c.id)}`;
      for (const [path, name] of clientPlaces(lead))
        hits.push({
          key: `client-${c.id}-${path}`,
          label: path === "" || (!lead && path === "concepts") ? c.brand : `${c.brand} · ${name}`,
          hint: path === "" ? "Client" : name,
          to: path ? `${base}/${path}` : base,
        });
    }
    for (const l of leads.data ?? [])
      hits.push({
        key: `lead-${l.id}`,
        label: l.handle ? `${l.brand} ${l.handle}` : l.brand,
        hint: "Lead",
        to: `/pipeline?lead=${encodeURIComponent(l.id)}`,
      });
    return hits;
  }, [role, lead, clients.data, leads.data, finance.data]);

  const shown = useMemo(() => {
    const q = query.trim();
    if (!q)
      return [
        ...all.filter((h) => h.hint === "Action").slice(0, 6),
        ...all.filter((h) => h.hint === "Page" || h.hint === "Client").slice(0, 8),
      ];
    return all.filter((h) => matches(`${h.label} ${h.hint}`, q)).slice(0, 14);
  }, [all, query]);

  if (!open) return null;
  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    navigate(hit.to);
  };

  return (
    <div className="palette-veil" onMouseDown={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search or jump"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          placeholder="Do or find anything… try “new script dany” or “outreach”"
          aria-label="Search"
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(shown[index]);
            }
          }}
        />
        <ul role="listbox">
          {shown.length === 0 && <li className="palette-empty">Nothing matches.</li>}
          {shown.map((h, i) => (
            <li key={h.key} role="option" aria-selected={i === index}>
              <button
                type="button"
                className={h.hint === "Action" ? "is-action" : ""}
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(h)}
              >
                <span className="palette-icon" aria-hidden="true">
                  <Icon
                    name={
                      h.hint === "Action"
                        ? "arrow"
                        : h.hint === "Lead"
                          ? "at"
                          : h.hint === "Page"
                            ? "hash"
                            : "diamond"
                    }
                    size={15}
                  />
                </span>
                <span dir="auto">{h.label}</span>
                <span className="small">{h.hint}</span>
                {i === index && (
                  <kbd className="palette-enter" aria-hidden="true">
                    ↵
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
