import { byClient } from "@/features/scripts/model";
import { WritingRoom } from "@/features/writing/WritingRoom";
import { HomeTasks, PortalTasks } from "@/features/tasks/TaskPanels";
import { Presence } from "@/features/presence/Presence";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import { SinceLastVisit } from "./SinceLastVisit";
import { ScriptsTab } from "./ScriptsTab";
import { SharedTab } from "./SharedTab";
import { useMyPortal, useMyVideos, useOnboardingStatus } from "./portalApi";
import { VideosTab } from "./VideosTab";
import { DeliveryTab, ReviewTab } from "./ReviewTab";
import { MoneyTab } from "./MoneyTab";
import { useMyInvoices } from "@/features/invoices/invoicesApi";
import { unpaid } from "@/features/invoices/model";
import { useMyCuts } from "@/features/review/reviewApi";
import { LibraryScreen } from "@/features/results/LibraryScreen";
import { todayIso, waiting } from "@/features/results/model";
import { ResultsScreen } from "@/features/results/ResultsScreen";
import { ProjectPicker } from "@/features/projects/ProjectPicker";
import { UndoBar } from "@/features/trash/UndoBar";
import { ShootScreen } from "@/features/shoot/ShootScreen";
import { useResults } from "@/features/results/resultsApi";
import { t } from "@/lib/i18n";
import { setTemplate, tw, words } from "@/lib/wording";
import { asRole, roleName, RoleContext, seesMoney } from "./role";
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
  /** A shorter name for the phone's bottom bar, where six sections share one row. */
  short?: string;
  /** Where the phone's bottom bar goes for this group. */
  to: string;
  items: NavItem[];
}

/** The portal by stage of the campaign: Home, Plan, Prep, Review, Results, then the client's own team. */
function navGroups(badges: {
  ideas: number;
  scripts: number;
  cuts: number;
  talent: number;
  location: number;
  prop: number;
  money: number | null;
  results: number;
  /** The brand questions aren't sent yet: they come first, above Home. */
  brandFirst: boolean;
}): NavGroup[] {
  const brandItem = { to: "/onboarding", label: t("Your brand", "Votre marque") };
  const groups: NavGroup[] = [
    badges.brandFirst
      ? {
          id: "home",
          label: t("Start here", "Commencez ici"),
          short: t("Start", "Début"),
          to: "/onboarding",
          items: [
            { ...brandItem, badge: 1 },
            { to: "/", label: t("Home", "Accueil"), end: true },
          ],
        }
      : {
          id: "home",
          label: t("Home", "Accueil"),
          to: "/",
          items: [{ to: "/", label: t("Home", "Accueil"), end: true }],
        },
    {
      id: "plan",
      label: t("Plan", "Plan"),
      to: "/room",
      items: [
        { to: "/room", label: t("Writing room", "Atelier d'écriture") },
        { to: "/concepts", label: words.ideas(), badge: badges.ideas },
        { to: "/scripts", label: words.scripts(), badge: badges.scripts },
        { to: "/whiteboard", label: words.board() },
      ],
    },
    {
      id: "prep",
      label: t("Prep", "Préparation"),
      short: t("Prep", "Prépa"),
      to: "/onboarding",
      items: [
        ...(badges.brandFirst ? [] : [brandItem]),
        { to: "/tasks", label: t("Tasks", "Tâches") },
        { to: "/talent", label: kindName("talent", true), badge: badges.talent },
        { to: "/locations", label: kindName("location", true), badge: badges.location },
        { to: "/budget", label: t("Budget", "Budget"), badge: badges.prop },
        { to: "/shoot", label: t("Shoot days", "Tournages") },
        { to: "/shared", label: t("Notes and links", "Notes et liens") },
      ],
    },
  ];
  groups.push({
    id: "review",
    label: words.review(),
    to: "/review",
    items: [
      { to: "/review", label: tw(["Reels", "Vidéos"], ["Films", "Films"]), badge: badges.cuts },
      { to: "/delivery", label: t("Delivery", "Livraison") },
      ...(videosOn ? [{ to: "/videos", label: t("Videos", "Vidéos") }] : []),
    ],
  });
  groups.push({
    id: "after",
    label: words.results(),
    to: "/results",
    items: [
      { to: "/results", label: t("Numbers", "Chiffres"), badge: badges.results },
      { to: "/library", label: tw(["Library", "Bibliothèque"], ["Selects", "Sélection"]) },
    ],
  });
  // Money only for the people who see it.
  const more: NavItem[] = [{ to: "/team", label: t("Team", "Équipe") }];
  if (badges.money !== null)
    more.push({ to: "/money", label: t("Invoices", "Factures"), badge: badges.money });
  groups.push({
    id: "team",
    label: more.length > 1 ? t("More", "Plus") : t("Team", "Équipe"),
    to: "/team",
    items: more,
  });
  return groups;
}

function inGroup(group: NavGroup, path: string): boolean {
  return group.items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}

const Badge = ({ n }: { n?: number }) => (n ? <span className="badge">{n}</span> : null);

/** For someone who works with Gecko on more than one brand: pick which one this portal shows. */
function BrandSwitch({
  portals,
  current,
  onSwitch,
}: {
  portals: ClientPortal[];
  current: ClientPortal;
  onSwitch?: (next: ClientPortal) => void;
}) {
  if (portals.length < 2 || !onSwitch) return null;
  const keyOf = (p: ClientPortal) => `${p.workspaceId}/${p.clientId}`;
  return (
    <label className="brand-switch">
      <span className="muted">{t("Brand", "Marque")}</span>
      <select
        value={keyOf(current)}
        onChange={(event) => {
          const next = portals.find((p) => keyOf(p) === event.target.value);
          if (next) onSwitch(next);
        }}
      >
        {portals.map((p) => (
          <option key={keyOf(p)} value={keyOf(p)}>
            {p.brand}
          </option>
        ))}
      </select>
    </label>
  );
}

/** What a client sees: their campaign, by stage, in the words of their template. Nothing else. */
export function PortalPage({
  portal,
  email,
  portals = [portal],
  onSwitch,
  previewing = false,
}: {
  portal: ClientPortal;
  email: string;
  /** Every brand this person belongs to; with more than one, the portal shows a switcher. */
  portals?: ClientPortal[];
  onSwitch?: (next: ClientPortal) => void;
  /** View as client: the team is looking, so no sign-out button (it would sign the team member out). */
  previewing?: boolean;
}) {
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
  const myCuts = useMyCuts(target);
  const cuts = myCuts.data?.cuts.filter((c) => c.status === "review").length ?? 0;
  const invoices = useMyInvoices(target, Boolean(page.data) && seesMoney(role));
  const results = useResults(target, Boolean(page.data));
  const resultsDue = results.data?.canAdd ? waiting(results.data.posts, todayIso()).due : 0;
  const onboarding = useOnboardingStatus(target, Boolean(page.data));
  // Until the brand questions are sent, they're the first thing a client sees and does. Viewers can't answer them.
  const brandFirst = onboarding.isSuccess && !onboarding.data.sentAt && role !== "viewer";
  const [welcomed, setWelcomed] = useState(readWelcomed);

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
    money: seesMoney(role) ? unpaid(invoices.data ?? []).length : null,
    results: resultsDue,
    brandFirst,
  });
  const group = groups.find((g) => inGroup(g, path)) ?? groups[0];
  const me = page.data?.me ?? email;
  // The page's own name, for the wide layout where the section row is hidden. Home has the brand as its title.
  const current = group?.items.find((item) => item.to !== "/" && path === item.to);

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
            <BrandSwitch portals={portals} current={portal} onSwitch={onSwitch} />
            <LangSwitch />
            {!previewing && (
              <Button variant="link" onClick={() => void signOut()}>
                {t("Sign out", "Se déconnecter")}
              </Button>
            )}
          </div>
        </aside>

        <header className="portal-bar">
          <Logo />
          <span className="portal-who small">
            <BrandSwitch portals={portals} current={portal} onSwitch={onSwitch} />
            <LangSwitch />
            {!previewing && (
              <Button variant="link" onClick={() => void signOut()}>
                {t("Sign out", "Se déconnecter")}
              </Button>
            )}
          </span>
        </header>

        <main className={`page portal-page${onBoard ? " board-page" : ""}`}>
          <ProjectPicker target={target} />
          <Presence workspaceId={portal.workspaceId} clientId={portal.clientId} reader="client" />
          <UndoBar workspaceId={portal.workspaceId} />
          {current && !onBoard && <h1 className="page-title">{current.label}</h1>}
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
              <Route
                index
                element={
                  onboarding.isPending ? null : brandFirst && !welcomed ? (
                    <SendToBrand onSent={() => setWelcomed(markWelcomed())} />
                  ) : (
                    <>
                      <SinceLastVisit target={target} />
                      <HomeTasks portal={portal} />
                      <OverviewTab data={page.data} target={target} />
                    </>
                  )
                }
              />
              <Route
                path="onboarding"
                element={
                  <section className="tab-body">
                    {brandFirst ? (
                      <BrandWelcome name={firstName(me)} brand={brand} />
                    ) : (
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
                    )}
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
              <Route path="tasks" element={<PortalTasks portal={portal} />} />
              <Route
                path="room"
                element={
                  <section className="tab-body">
                    <WritingRoom
                      concepts={page.data.concepts}
                      scripts={page.data.scripts}
                      reader="client"
                      base=""
                    />
                  </section>
                }
              />
              <Route
                path="scripts"
                element={<ScriptsTab portal={portal} scripts={page.data.scripts} />}
              />
              <Route
                path="concepts"
                element={<ConceptsTab portal={portal} concepts={page.data.concepts} />}
              />
              <Route path="team" element={<TeamTab portal={portal} brand={brand} me={me} />} />
              {["review", "review/:cutId"].map((p) => (
                <Route key={p} path={p} element={<ReviewTab portal={portal} />} />
              ))}
              <Route path="delivery" element={<DeliveryTab portal={portal} />} />
              {["results", "results/:postId"].map((p) => (
                <Route
                  key={p}
                  path={p}
                  element={
                    <ResultsScreen
                      target={target}
                      base="/results"
                      template={page.data?.template === "cinematic" ? "cinematic" : "performance"}
                    />
                  }
                />
              ))}
              <Route path="library" element={<LibraryScreen target={target} />} />
              {["shoot", "shoot/:dayId"].map((p) => (
                <Route
                  key={p}
                  path={p}
                  element={<ShootScreen target={target} base="/shoot" brand={brand} />}
                />
              ))}
              {["money", "money/:invoiceId"].map((p) => (
                <Route key={p} path={p} element={<MoneyTab portal={portal} />} />
              ))}
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
                {g.short ?? g.label}
                <Badge n={total} />
              </NavLink>
            );
          })}
        </nav>
      </div>
    </RoleContext.Provider>
  );
}

const WELCOMED = "gecko.welcomed";

/** Whether this browser has already been sent to the brand questions once. After that, Home opens normally. */
function readWelcomed(): boolean {
  try {
    return Boolean(sessionStorage.getItem(WELCOMED));
  } catch {
    return false;
  }
}

function markWelcomed(): true {
  try {
    sessionStorage.setItem(WELCOMED, "1");
  } catch {
    // No storage: the state below still remembers it until the page reloads.
  }
  return true;
}

/** Sends a new client from Home to the brand questions, once. */
function SendToBrand({ onSent }: { onSent: () => void }) {
  useEffect(() => onSent(), [onSent]);
  return <Navigate to="/onboarding" replace />;
}

const firstName = (me: string) => (me.includes("@") ? "" : (me.trim().split(/\s+/)[0] ?? ""));

/** What a new client reads first: why the questions come before anything else, and that they can look around. */
function BrandWelcome({ name, brand }: { name: string; brand: string }) {
  return (
    <div className="brand-welcome">
      <h2>
        {name
          ? t(
              `Welcome, ${name}. Let's start with ${brand}.`,
              `Bienvenue, ${name}. Commençons par ${brand}.`,
            )
          : t(`Welcome. Let's start with ${brand}.`, `Bienvenue. Commençons par ${brand}.`)}
      </h2>
      <p className="lede">
        {t(
          "Before we write a single idea, we need to know your brand: what you sell, who buys it, what you never want to see. About 15 minutes. It saves as you type, so you can stop and come back, and anything you're unsure about we'll cover on a call.",
          "Avant d'écrire la moindre idée, il nous faut connaître votre marque : ce que vous vendez, qui l'achète, ce que vous ne voulez jamais voir. Environ 15 minutes. C'est enregistré au fil de la saisie : vous pouvez faire une pause et revenir, et ce dont vous n'êtes pas sûr, on le voit ensemble par appel.",
        )}
      </p>
      <p className="small">
        <Link to="/">{t("Look around your space first", "Découvrir votre espace d'abord")}</Link>
      </p>
    </div>
  );
}
