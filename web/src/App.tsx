import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { TeamPage } from "@/features/team/TeamPage";
import { AppShell } from "@/features/shell/AppShell";
import { navFor } from "@/features/shell/nav";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
  );
}

function SignedOutOnly({ page }: { page: ReactElement }) {
  const { state } = useAuth();
  if (state.status === "loading") return <Loading />;
  return state.status === "signed-out" ? page : <Navigate to="/" replace />;
}

/** Sends each person to the one part of the app their account can open. */
function Home() {
  const { state } = useAuth();
  switch (state.status) {
    case "loading":
      return <Loading />;
    case "signed-out":
      return <Navigate to="/sign-in" replace />;
    case "error":
      return <JoinPage problem={state.message} />;
  }
  const email = state.session.user.email ?? "";
  const { account } = state;
  if (account.kind === "none") return <JoinPage />;
  if (account.kind === "client") return <PortalPage portal={account.portals[0]!} email={email} />;
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

function Loading() {
  return <p className="loading">Loading…</p>;
}
