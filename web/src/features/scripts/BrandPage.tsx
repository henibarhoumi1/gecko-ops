import { Link } from "react-router-dom";
import type { ClientPortal } from "@/features/auth/account";
import { useMyShared, useTeamShared } from "@/features/shared/sharedApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { t } from "@/lib/i18n";
import { BrandSheetList, useBrand } from "./BrandDrawer";
import { sheetIsEmpty } from "./brand";

/**
 * The Brand sheet: what the brand is, sounds like and never says, on one page both sides read before
 * writing. Built from the onboarding answers and the brand notes, so there is nothing new to fill.
 */
export function BrandPage({
  workspaceId,
  clientId,
  notes,
  onboardingHref,
  notesHref,
}: {
  workspaceId: string;
  clientId: string;
  notes?: string;
  onboardingHref: string;
  notesHref: string;
}) {
  const { sheet, never } = useBrand(workspaceId, clientId, notes);
  return (
    <section className="tab-body brand-page">
      <p className="lede">
        {t(
          "The brand on one page: read it before writing anything. It comes from the onboarding answers and the brand notes.",
          "La marque sur une page : à lire avant d'écrire quoi que ce soit. Elle vient des réponses d'onboarding et des notes de marque.",
        )}
      </p>
      {sheetIsEmpty(sheet) ? (
        <div className="room-empty">
          <p>
            {t(
              "Nothing yet. Fill the quick onboarding (24 questions) and this page writes itself.",
              "Rien pour l'instant. Remplissez l'onboarding rapide (24 questions) et cette page se remplit toute seule.",
            )}
          </p>
          <Link className="btn" to={onboardingHref}>
            {t("Open the onboarding", "Ouvrir l'onboarding")}
          </Link>
        </div>
      ) : (
        <>
          {sheet.oneline && (
            <p className="brand-line" dir="auto">
              [ {sheet.oneline} ]
            </p>
          )}
          {never.length > 0 && (
            <div className="never-hits">
              <strong>{t("Never in a script", "Jamais dans un script")}</strong>
              <p className="small">{never.join(" · ")}</p>
            </div>
          )}
          <BrandSheetList sheet={sheet} />
          <p className="small">
            {t("Something wrong? Change it in ", "Quelque chose cloche ? Corrigez dans ")}
            <Link to={onboardingHref}>{t("the onboarding", "l'onboarding")}</Link>
            {t(" or the ", " ou les ")}
            <Link to={notesHref}>{t("brand notes", "notes de marque")}</Link>.
          </p>
        </>
      )}
    </section>
  );
}

/** The team's Brand page for one client. */
export function TeamBrandPage({ clientId }: { clientId: string }) {
  const { id: workspaceId } = useWorkspace();
  const space = useTeamShared(clientId);
  const base = `/clients/${encodeURIComponent(clientId)}`;
  return (
    <BrandPage
      workspaceId={workspaceId}
      clientId={clientId}
      notes={space.data?.brandNotes.body}
      onboardingHref={`${base}/onboarding`}
      notesHref={`${base}/shared`}
    />
  );
}

/** The client's Brand page in the portal. */
export function PortalBrandPage({ portal }: { portal: ClientPortal }) {
  const space = useMyShared(portal);
  return (
    <BrandPage
      workspaceId={portal.workspaceId}
      clientId={portal.clientId}
      notes={space.data?.brandNotes.body}
      onboardingHref="/onboarding"
      notesHref="/shared"
    />
  );
}
