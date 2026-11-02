import { byClient } from "@/features/scripts/model";
import { useMemo, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Button } from "@/components/Button";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { countByStatus } from "@/features/concepts/model";
import { BoardRoute } from "@/features/board/BoardRoute";
import { WhiteboardRoute } from "@/features/whiteboard/WhiteboardRoute";
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
import { setTemplate, tw, words } from "@/lib/wording";
import { asRole, roleName, RoleContext } from "./role";
import { TeamTab } from "./TeamTab";
import { ProductionTab } from "./ProductionTab";
import { kindName } from "@/features/production/model";
import { useMyProduction } from "@/features/production/productionApi";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  /** Where the phone's bottom bar goes for this group. */
  to: string;
  items: NavItem[];
}

/** The portal by stage of the campaign: Home, Plan, Prep, Review, then the client's own team. */
function navGroups(badges: {
  ideas: number;
  scripts: number;
  cuts: number;
  talent: number;
  location: number;
  prop: number;
}): NavGroup[] {
  const groups: NavGroup[] = [
    {
      id: "home",
      label: t("Home", "Accueil"),
      to: "/",
      items: [{ to: "/", label: t("Home", "Accueil"), end: true }],
    },
    {
      id: "plan",
      label: t("Plan", "Plan"),
      to: "/concepts",
      items: [
        { to: "/concepts", label: words.ideas(), badge: badges.ideas },
        { to: "/scripts", label: words.scripts(), badge: badges.scripts },
        { to: "/whiteboard", label: words.board() },
      ],
    },
    {
      id: "prep",
      label: t("Prep", "Préparation"),
      to: "/onboarding",
      items: [
        { to: "/onboarding", label: t("Your brand", "Votre marque") },
        { to: "/talent", label: kindName("talent", true), badge: badges.talent },
        { to: "/locations", label: kindName("location", true), badge: badges.location },
        { to: "/budget", label: t("Budget", "Budget"), badge: badges.prop },
        { to: "/shared", label: t("Notes and links", "Notes et liens") },
      ],
    },
  ];
  if (videosOn)
    groups.push({
      id: "review",
      label: words.review(),
      to: "/videos",
      items: [{ to: "/videos", label: t("Videos", "Vidéos"), badge: badges.cuts }],
    });
  groups.push({
    id: "team",
    label: t("Team", "Équipe"),
    to: "/team",
    items: [{ to: "/team", label: t("Team", "Équipe") }],
  });
  return groups;
}

function inGroup(group: NavGroup, path: string): boolean {
  return group.items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}

const Badge = ({ n }: { n?: number }) => (n ? <span className="badge">{n}</span> : null);

/** What a client sees: their campaign, by stage, in the words of their template. Nothing else. */
export function PortalPage({ portal, email }: { portal: ClientPortal; email: string }) {
  const { signOut } = useAuth();
  const path = useLocation().pathname;
  const onBoard = path.startsWith("/board") || path.startsWith("/whiteboard");
  const page = useMyPortal(portal);
  const videos = useMyVideos(portal);
  const production = useMyProduction(portal);
  const target = useMemo(
    () => ({ workspaceId: portal.workspaceId, clientId: portal.clientId }),
    [portal.workspaceId, portal.clientId],
  );
  // Set before anything renders words, so every screen speaks this client's template.
  setTemplate(page.data?.template);
  const role = asRole(page.data?.role);
  const ideas = page.data ? countByStatus(page.data.concepts).review : 0;
  const scripts =
    page.data?.scripts.filter((s) => s.status === "review" && !byClient(s)).length ?? 0;
  const cuts = videos.data?.videos.filter((v) => v.status === "review").length ?? 0;
  const brand = page.data?.brand ?? portal.brand;
  // Only people who can say yes to a cost get a badge for it.
  const proposed = (kind: string) =>
    role === "viewer"
      ? 0
      : (production.data?.options.filter((o) => o.kind === kind && o.status === "proposed")
          .length ?? 0);
  const groups = navGroups({
    ideas,
    scripts,
    cuts,
    talent: proposed("talent"),
    location: proposed("location"),
    prop: proposed("prop"),
  });
  const group = groups.find((g) => inGroup(g, path)) ?? groups[0];
  const me = page.data?.me ?? email;

  const brandMark: ReactNode = page.data?.logo ? (
    <img src={page.data.logo} alt={brand} />
  ) : (
    <span>{brand}</span>
  );

  return (
    <RoleContext.Provider value={role}>
      <div
        className={`portal portal-v2 tpl-${page.data?.template === "cinematic" ? "cinematic" : "performance"}`}
      >
        <aside className="portal-rail">
          <Logo />
          <div className="rail-brand">{brandMark}</div>
          <nav aria-label={t("Your space", "Votre espace")}>
            {groups.map((g) =>
              g.items.length === 1 ? (
                <NavLink key={g.id} to={g.items[0]!.to} end={g.items[0]!.end} className="rail-link">
                  {g.label}
                  <Badge n={g.items[0]!.badge} />
                </NavLink>
              ) : (
                <div key={g.id} className="rail-group">
                  <span className="rail-group-name">{g.label}</span>
                  {g.items.map((item) => (
                    <NavLink key={item.to} to={item.to} className="rail-link">
                      {item.label}
                      <Badge n={item.badge} />
                    </NavLink>
                  ))}
                </div>
              ),
            )}
          </nav>
          <div className="rail-me small">
            <strong dir="auto">{me}</strong>
            <span className="muted">{roleName(role)}</span>
            <LangSwitch />
            <Button variant="link" onClick={() => void signOut()}>
              {t("Sign out", "Se déconnecter")}
            </Button>
          </div>
        </aside>

        <header className="portal-bar">
          <Logo />
          <span className="portal-who small">
            <LangSwitch />
            <Button variant="link" onClick={() => void signOut()}>
              {t("Sign out", "Se déconnecter")}
            </Button>
          </span>
        </header>

        <main className={`page portal-page${onBoard ? " board-page" : ""}`}>
          {group && group.items.length > 1 && (
            <nav className="sub-nav" aria-label={group.label}>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="sub-link">
                  {item.label}
                  <Badge n={item.badge} />
                </NavLink>
              ))}
            </nav>
          )}
          {page.isPending && (
            <p className="muted">{t("Loading your space…", "Chargement de votre espace…")}</p>
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
                      {tw(
                        [
                          "Everything we need before pre-production. It saves as you type, so you can stop and come back. Skip anything you're not sure about.",
                          "Tout ce qu'il nous faut avant la préproduction. C'est enregistré au fil de la saisie : vous pouvez vous arrêter et revenir. Passez ce dont vous n'êtes pas sûr.",
                        ],
                        [
                          "Everything we need to understand the brand before we write. It saves as you type, so you can stop and come back. Skip anything you're not sure about.",
                          "Tout ce qu'il nous faut pour comprendre la marque avant d'écrire. C'est enregistré au fil de la saisie : vous pouvez vous arrêter et revenir. Passez ce dont vous n'êtes pas sûr.",
                        ],
                      )}
                    </p>
                    <OnboardingForm target={target} brand={brand} mode="client" />
                  </section>
                }
              />
              <Route path="shared" element={<SharedTab portal={portal} />} />
              <Route path="talent" element={<ProductionTab portal={portal} kind="talent" />} />
              <Route path="locations" element={<ProductionTab portal={portal} kind="location" />} />
              <Route path="budget" element={<ProductionTab portal={portal} kind="budget" />} />
              {["whiteboard", "whiteboard/:boardId"].map((p) => (
                <Route
                  key={p}
                  path={p}
                  element={
                    <WhiteboardRoute
                      target={target}
                      base="/whiteboard"
                      reader="client"
                      template={page.data?.template === "cinematic" ? "cinematic" : "performance"}
                    />
                  }
                />
              ))}
              {["board", "board/:boardId"].map((p) => (
                <Route
                  key={p}
                  path={p}
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
              <Route path="team" element={<TeamTab portal={portal} brand={brand} me={me} />} />
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
          <footer className="portal-foot small muted">
            {t("Questions? Message Gecko on", "Une question ? Écrivez à Gecko sur")}{" "}
            <a href="https://wa.me/21626191555" target="_blank" rel="noreferrer noopener">
              WhatsApp
            </a>
            .
          </footer>
        </main>

        <nav className="portal-bottom" aria-label={t("Your space", "Votre espace")}>
          {groups.map((g) => {
            const total = g.items.reduce((n, item) => n + (item.badge ?? 0), 0);
            return (
              <NavLink
                key={g.id}
                to={g.to}
                end={g.id === "home"}
                className={() => `bottom-link${g === group ? " active" : ""}`}
              >
                {g.label}
                <Badge n={total} />
              </NavLink>
            );
          })}
        </nav>
      </div>
    </RoleContext.Provider>
  );
}
