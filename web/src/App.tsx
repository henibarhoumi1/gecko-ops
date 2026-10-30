import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { InvitePage } from "@/features/auth/InvitePage";
import { JoinPage } from "@/features/auth/JoinPage";
import { SignInPage } from "@/features/auth/SignInPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { PipelinePage } from "@/features/pipeline/PipelinePage";
import { PortalPage } from "@/features/portal/PortalPage";
import { AppShell } from "@/features/shell/AppShell";
import { ComingSoon } from "@/features/shell/ComingSoon";
import { navFor } from "@/features/shell/nav";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

/** Screens that have been rebuilt; every other section shows a placeholder for now. */
const SCREENS: Record<string, () => ReactElement> = {
  pipeline: () => <PipelinePage />,
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
  const items = navFor(account.workspace.role);
  return (
    <WorkspaceProvider workspace={account.workspace}>
      <Routes>
        <Route element={<AppShell workspace={account.workspace} email={email} />}>
          <Route index element={<Navigate to="/today" replace />} />
          {items.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={SCREENS[item.path]?.() ?? <ComingSoon title={item.label} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </WorkspaceProvider>
  );
}

function Loading() {
  return <p className="loading">Loading…</p>;
}
