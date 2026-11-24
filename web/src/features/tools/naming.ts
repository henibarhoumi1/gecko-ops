// Deliverable names (Heni, 24 Nov 2026): every file named the same way, so the name says what it is.
// DANY_LAUNCH_R03_HookB_9x16_v02.mp4

export interface NameParts {
  client: string;
  campaign: string;
  reel: number;
  hook: string;
  format: string;
  version: number;
  kind: string;
  date: string;
  ext: string;
}

/** "Dany Clean" → "DANY"; letters and digits only, upper case, at most 8. */
export function code(text: string, max = 8): string {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim();
  const first = clean.split(/\s+/)[0] ?? "";
  return first.toUpperCase().slice(0, max) || "X";
}

export function deliverableName(p: NameParts): string {
  const parts = [
    code(p.client),
    code(p.campaign, 10),
    `R${String(Math.max(1, Math.min(999, p.reel))).padStart(2, "0")}`,
    p.hook ? `Hook${p.hook.toUpperCase()}` : "",
    p.format,
    p.kind && p.kind !== "MASTER" ? p.kind : "",
    p.date ? p.date.replace(/-/g, "").slice(2) : "",
    `v${String(Math.max(1, Math.min(99, p.version))).padStart(2, "0")}`,
  ].filter(Boolean);
  return `${parts.join("_")}${p.ext ? `.${p.ext.replace(/^\./, "")}` : ""}`;
}

/** Every reel × hook × format at once, for a whole delivery. */
export function batch(
  base: Omit<NameParts, "reel" | "hook" | "format">,
  reels: number,
  hooks: string[],
  formats: string[],
): string[] {
  const out: string[] = [];
  for (let r = 1; r <= Math.min(reels, 99); r++)
    for (const h of hooks.length ? hooks : [""])
      for (const f of formats) out.push(deliverableName({ ...base, reel: r, hook: h, format: f }));
  return out;
}
