import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase";
import { brandSheet, neverTerms, sheetIsEmpty, type BrandSheet } from "./brand";

/** The client's onboarding answers, for the brand sheet. Quietly empty when they can't be read. */
export function useBrand(workspaceId: string, clientId: string, notes = "") {
  const answers = useQuery({
    queryKey: ["brand-sheet", workspaceId, clientId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_client_onboarding", {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
      });
      if (error) throw error;
      return ((data as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<
        string,
        unknown
      >;
    },
    enabled: Boolean(workspaceId && clientId),
    retry: false,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const sheet = brandSheet(answers.data ?? {}, notes);
    return { sheet, never: neverTerms(sheet.never, sheet.notes) };
  }, [answers.data, notes]);
}

/**
 * The brand, one tap away while writing: the promise, the feel, the tone and the words to never use.
 * Same drawer for the team and the client.
 */
export function BrandDrawer({ sheet, never }: { sheet: BrandSheet; never: string[] }) {
  const [open, setOpen] = useState(false);
  if (sheetIsEmpty(sheet)) return null;
  return (
    <div className={`brand-drawer${open ? " open" : ""}`}>
      <button
        type="button"
        className="brand-drawer-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>[ {t("Brand sheet", "Fiche marque")} ]</span>
        {never.length > 0 && (
          <span className="small muted">
            {t(`${never.length} words to avoid`, `${never.length} mots à éviter`)}
          </span>
        )}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <dl className="brand-sheet">
          <Row label={t("In one line", "En une phrase")} value={sheet.oneline} />
          <Row label={t("The promise", "La promesse")} value={sheet.promise} />
          <Row label={t("People should feel", "On doit ressentir")} value={sheet.feel} />
          <Row label={t("Tone", "Ton")} value={sheet.tone} />
          <Row label={t("Languages", "Langues")} value={sheet.languages} />
          <Row label={t("Reasons to buy", "Raisons d'acheter")} value={sheet.reasons} />
          <Row label={t("Proof we can show", "Preuves à montrer")} value={sheet.proof} />
          <Row label={t("The customer", "Le client type")} value={sheet.customer} />
          <Row label={t("Must show", "À montrer")} value={sheet.must} />
          <Row
            label={t("Never say or show", "À ne jamais dire ni montrer")}
            value={sheet.never}
            warn
          />
          <Row label={t("Don't look like", "Ne pas ressembler à")} value={sheet.avoid} />
          <Row label={t("Brand notes", "Notes de marque")} value={sheet.notes} />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string | string[]; warn?: boolean }) {
  const shown = Array.isArray(value) ? value.join(" · ") : value;
  if (!shown) return null;
  return (
    <>
      <dt className={warn ? "warn" : undefined}>{label}</dt>
      <dd dir="auto">{shown}</dd>
    </>
  );
}
