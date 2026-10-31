import { useMemo } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useActiveTabInView } from "@/components/useActiveTabInView";
import type { ClientPortal } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { countByStatus } from "@/features/concepts/model";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { friendlyError } from "@/lib/errors";
import { videosOn } from "@/lib/features";
import { ConceptsTab } from "./ConceptsTab";
import { OverviewTab } from "./OverviewTab";
import { useMyPortal, useMyVideos } from "./portalApi";
import { VideosTab } from "./VideosTab";

/** What a client sees: their campaign, onboarding, concepts and videos to approve. Nothing else. */
export function PortalPage({ portal, email }: { portal: ClientPortal; email: string }) {
  const { signOut } = useAuth();
  const page = useMyPortal(portal);
  const videos = useMyVideos(portal);
  useActiveTabInView();
  const target = useMemo(
    () => ({ workspaceId: portal.workspaceId, clientId: portal.clientId }),
    [portal.workspaceId, portal.clientId],
  );
  const waiting = page.data ? countByStatus(page.data.concepts).review : 0;
  const cuts = videos.data?.videos.filter((v) => v.status === "review").length ?? 0;
  const brand = page.data?.brand ?? portal.brand;

  return (
    <div className="portal">
      <header className="portal-bar">
        <span className="logo">gecko.]</span>
        <span className="portal-who small">
          <span className="muted">{email}</span>
          <Button variant="link" onClick={() => void signOut()}>
            Sign out
          </Button>
        </span>
      </header>
      <main className="page portal-page">
        <p className="eyebrow">Client portal</p>
        <h1>{brand}</h1>
        <nav className="portal-tabs" aria-label="Portal">
          <NavLink to="/" end className="portal-tab">
            Overview
          </NavLink>
          <NavLink to="/onboarding" className="portal-tab">
            Onboarding
          </NavLink>
          <NavLink to="/concepts" className="portal-tab">
            Concepts
            {waiting > 0 && <span className="badge">{waiting}</span>}
          </NavLink>
          {videosOn && (
            <NavLink to="/videos" className="portal-tab">
              Videos
              {cuts > 0 && <span className="badge">{cuts}</span>}
            </NavLink>
          )}
        </nav>
        {page.isPending && <p className="muted">Loading your portal…</p>}
        {page.isError && <Notice tone="error">{friendlyError(page.error)}</Notice>}
        {page.data && (
          <Routes>
            <Route index element={<OverviewTab data={page.data} target={target} />} />
            <Route
              path="onboarding"
              element={
                <section className="tab-body">
                  <p className="lede">
                    Everything we need before pre-production. It saves as you type, so you can stop
                    and come back. Skip anything you're not sure about.
                  </p>
                  <OnboardingForm target={target} brand={brand} mode="client" />
                </section>
              }
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
                    <p className="muted">Loading your videos…</p>
                  )
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="portal-foot small muted">
        Questions? Message Gecko on{" "}
        <a href="https://wa.me/21626191555" target="_blank" rel="noreferrer noopener">
          WhatsApp
        </a>
        .
      </footer>
    </div>
  );
}
