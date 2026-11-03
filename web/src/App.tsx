import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, useState, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ClientPortal } from "@/features/auth/account";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { ForgotPage } from "@/features/auth/ForgotPage";
import { InvitePage } from "@/features/auth/InvitePage";
import { JoinPage } from "@/features/auth/JoinPage";
import { ResetPage } from "@/features/auth/ResetPage";
import { SignInPage } from "@/features/auth/SignInPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { ClientPage } from "@/features/clients/ClientPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { PipelinePage } from "@/features/pipeline/PipelinePage";
import { PortalPage } from "@/features/portal/PortalPage";
import {
  pickPortal,
  portalKey,
  readRememberedPortal,
  rememberPortal,
} from "@/features/portal/portalChoice";
import { TeamPage } from "@/features/team/TeamPage";
import { AppShell } from "@/features/shell/AppShell";
import { navFor } from "@/features/shell/nav";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";
import { setTeamMode, t, useLang } from "@/lib/i18n";
import { saveReturnTo, takeReturnTo } from "@/lib/returnTo";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

/** One screen per section in the sidebar (see nav.ts). */
const SCREENS: Record<string, () => ReactElement> = {
  pipeline: () => <PipelinePage />,
  clients: () => (
    <Routes>
      <Route index element={<ClientsPage />} />
      <Route path=":clientId/*" element={<ClientPage />} />
    </Routes>
  ),
  team: () => <TeamPage />,
};

export function App() {
  // Switching language redraws the screens (the router remounts; the session and loaded data stay).
  const lang = useLang();
  if (!supabase) {
    return (
      <main className="page">
        <h1>Not connected</h1>
        <p className="muted">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for this deployment, then redeploy.
        </p>
      </main>
    );
  }
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TeamEnglish />
          <BrowserRouter key={lang}>
            <Routes>
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/sign-in" element={<SignedOutOnly page={<SignInPage />} />} />
              <Route path="/sign-up" element={<SignedOutOnly page={<SignUpPage />} />} />
              <Route path="/forgot" element={<SignedOutOnly page={<ForgotPage />} />} />
              <Route path="/reset" element={<ResetPage />} />
              <Route path="/*" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/** The team app is English only for now; clients and signed-out pages follow the language switch. */
function TeamEnglish() {
  const { state } = useAuth();
  setTeamMode(state.status === "ready" && state.account.kind === "member");
  return null;
}

function SignedOutOnly({ page }: { page: ReactElement }) {
  const { state } = useAuth();
  if (state.status === "loading") return <Loading />;
  return state.status === "signed-out" ? page : <Navigate to="/" replace />;
}

/** Sends each person to the one part of the app their account can open. */
function Home() {
  const { state } = useAuth();
  const location = useLocation();
  // After signing in, go back once to the link that brought the person here (saved below).
  const back = useRef<string | null | undefined>(undefined);
  if (state.status === "ready" && back.current === undefined) back.current = takeReturnTo();
  switch (state.status) {
    case "loading":
      return <Loading />;
    case "signed-out":
      saveReturnTo(location.pathname + location.search + location.hash);
      return <Navigate to="/sign-in" replace />;
    case "error":
      return <JoinPage problem={state.message} />;
  }
  const email = state.session.user.email ?? "";
  const { account } = state;
  if (account.kind === "none") return <JoinPage />;
  const returnTo = back.current;
  if (returnTo) {
    back.current = null;
    if (returnTo !== location.pathname + location.search + location.hash)
      return <Navigate to={returnTo} replace />;
  }
  if (account.kind === "client") return <ClientHome portals={account.portals} email={email} />;
  const items = navFor(account.workspace.role).filter((item) => SCREENS[item.path]);
  const home = `/${items[0]?.path ?? "team"}`;
  return (
    <WorkspaceProvider workspace={account.workspace}>
      <Routes>
        <Route element={<AppShell workspace={account.workspace} email={email} />}>
          <Route index element={<Navigate to={home} replace />} />
          {items.map((item) => (
            <Route key={item.path} path={`${item.path}/*`} element={SCREENS[item.path]!()} />
          ))}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Routes>
    </WorkspaceProvider>
  );
}

/** A client's portal; with several brands, the one they last chose, and a switcher to the others. */
function ClientHome({ portals, email }: { portals: ClientPortal[]; email: string }) {
  const navigate = useNavigate();
  const [chosen, setChosen] = useState(() =>
    portalKey(pickPortal(portals, readRememberedPortal())),
  );
  const portal = pickPortal(portals, chosen);
  return (
    <PortalPage
      key={portalKey(portal)}
      portal={portal}
      portals={portals}
      email={email}
      onSwitch={(next) => {
        rememberPortal(next);
        setChosen(portalKey(next));
        navigate("/", { replace: true });
      }}
    />
  );
}

function Loading() {
  return (
    <p className="loading" role="status">
      {t("Loading…", "Chargement…")}
    </p>
  );
}
