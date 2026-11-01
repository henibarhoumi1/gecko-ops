import { useMemo } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Button } from "@/components/Button";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { useActiveTabInView } from "@/components/useActiveTabInView";
import type { ClientPortal } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { countByStatus } from "@/features/concepts/model";
import { BoardRoute } from "@/features/board/BoardRoute";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { friendlyError } from "@/lib/errors";
import { videosOn } from "@/lib/features";
import { ConceptsTab } from "./ConceptsTab";
import { OverviewTab } from "./OverviewTab";
import { ScriptsTab } from "./ScriptsTab";
import { SharedTab } from "./SharedTab";
import { useMyPortal, useMyVideos } from "./portalApi";
import { VideosTab } from "./VideosTab";
import { t } from "@/lib/i18n";

/** What a client sees: their campaign, onboarding, concepts and videos to approve. Nothing else. */
export function PortalPage({ portal, email }: { portal: ClientPortal; email: string }) {
  const { signOut } = useAuth();
  const onBoard = useLocation().pathname.startsWith("/board");
  const page = useMyPortal(portal);
  const videos = useMyVideos(portal);
  useActiveTabInView();
  const target = useMemo(
    () => ({ workspaceId: portal.workspaceId, clientId: portal.clientId }),
    [portal.workspaceId, portal.clientId],
  );
  const waiting = page.data ? countByStatus(page.data.concepts).review : 0;
  const scriptsWaiting = page.data?.scripts.filter((s) => s.status === "review").length ?? 0;
  const cuts = videos.data?.videos.filter((v) => v.status === "review").length ?? 0;
  const brand = page.data?.brand ?? portal.brand;

  return (
    <div className="portal">
      <header className="portal-bar">
        <Logo />
        <span className="portal-who small">
          <LangSwitch />
          <span className="muted">{email}</span>
          <Button variant="link" onClick={() => void signOut()}>
            {t("Sign out", "Se déconnecter")}
          </Button>
        </span>
      </header>
      <main className={`page portal-page${onBoard ? " board-page" : ""}`}>
        <p className="eyebrow">{t("Client portal", "Espace client")}</p>
        <h1>{brand}</h1>
        <nav className="portal-tabs" aria-label="Portal">
          <NavLink to="/" end className="portal-tab">
            {t("Home", "Accueil")}
          </NavLink>
          <NavLink to="/concepts" className="portal-tab">
            {t("Ideas", "Idées")}
            {waiting > 0 && <span className="badge">{waiting}</span>}
          </NavLink>
          <NavLink to="/scripts" className="portal-tab">
            Scripts
            {scriptsWaiting > 0 && <span className="badge">{scriptsWaiting}</span>}
          </NavLink>
          <NavLink to="/board" className="portal-tab">
            {t("Board", "Tableau")}
          </NavLink>
          <NavLink to="/shared" className="portal-tab">
            {t("Shared", "Partagé")}
          </NavLink>
          <NavLink to="/onboarding" className="portal-tab">
            {t("Your brand", "Votre marque")}
          </NavLink>
          {videosOn && (
            <NavLink to="/videos" className="portal-tab">
              {t("Videos", "Vidéos")}
              {cuts > 0 && <span className="badge">{cuts}</span>}
            </NavLink>
          )}
        </nav>
        {page.isPending && (
          <p className="muted">{t("Loading your portal…", "Chargement de votre espace…")}</p>
        )}
        {page.isError && <Notice tone="error">{friendlyError(page.error)}</Notice>}
        {page.data && (
          <Routes>
            <Route index element={<OverviewTab data={page.data} target={target} />} />
            <Route
              path="onboarding"
              element={
                <section className="tab-body">
                  <p className="lede">
                    {t(
                      "Everything we need before pre-production. It saves as you type, so you can stop and come back. Skip anything you're not sure about.",
                      "Tout ce qu'il nous faut avant la préproduction. C'est enregistré au fil de la saisie : vous pouvez vous arrêter et revenir. Passez ce dont vous n'êtes pas sûr.",
                    )}
                  </p>
                  <OnboardingForm target={target} brand={brand} mode="client" />
                </section>
              }
            />
            <Route path="shared" element={<SharedTab portal={portal} />} />
            {["board", "board/:boardId"].map((path) => (
              <Route
                key={path}
                path={path}
                element={<BoardRoute target={target} base="/board" reader="client" />}
              />
            ))}
            <Route
              path="scripts"
              element={<ScriptsTab portal={portal} scripts={page.data.scripts} />}
            />
            <Route
              path="concepts"
              element={<ConceptsTab portal={portal} concepts={page.data.concepts} />}
            />
            {videosOn && (
              <Route
                path="videos"
                element={
                  videos.data ? (
                    <VideosTab portal={portal} data={videos.data} />
                  ) : videos.isError ? (
                    <Notice tone="error">{friendlyError(videos.error)}</Notice>
                  ) : (
                    <p className="muted">
                      {t("Loading your videos…", "Chargement de vos vidéos…")}
                    </p>
                  )
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="portal-foot small muted">
        {t("Questions? Message Gecko on", "Une question ? Écrivez à Gecko sur")}{" "}
        <a href="https://wa.me/21626191555" target="_blank" rel="noreferrer noopener">
          WhatsApp
        </a>
        .
      </footer>
    </div>
  );
}
