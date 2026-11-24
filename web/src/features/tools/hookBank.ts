// The hook bank's sorting, kept pure for tests (HookBank.tsx draws it).

export interface HookRow {
  id: string;
  client_id: string;
  title: string;
  style: string;
  status: string;
  hook: number | null;
  hooks: { see?: string; hear?: string; text?: string }[] | null;
  updated_at: string;
}

export interface BankHook {
  key: string;
  line: string;
  see: string;
  clientId: string;
  script: string;
  style: string;
  picked: boolean;
  approved: boolean;
  updatedAt: string;
}

/** Every hook from every script; picked-and-approved first, then approved, then newest. */
export function toBank(rows: readonly HookRow[]): BankHook[] {
  const out: BankHook[] = [];
  for (const r of rows)
    (r.hooks ?? []).forEach((h, i) => {
      const line = (h.hear || h.text || "").trim();
      if (!line) return;
      out.push({
        key: `${r.id}-${i}`,
        line,
        see: (h.see ?? "").trim(),
        clientId: r.client_id,
        script: r.title,
        style: r.style,
        picked: r.hook === i,
        approved: r.status === "approved",
        updatedAt: r.updated_at,
      });
    });
  const rank = (h: BankHook) => (h.picked && h.approved ? 0 : h.approved ? 1 : h.picked ? 2 : 3);
  return out.sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt));
}
