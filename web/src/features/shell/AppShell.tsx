import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import type { Workspace } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABEL } from "@/features/workspace/members";
import { navFor } from "./nav";

export function AppShell({ workspace, email }: { workspace: Workspace; email: string }) {
  const { signOut } = useAuth();
  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <nav aria-label="Main">
          {navFor(workspace.role).map((item) => (
            <NavLink key={item.path} to={`/${item.path}`} className="nav-item">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <span className="me-email">{email}</span>
          <span className="muted">{ROLE_LABEL[workspace.role]}</span>
          <Button variant="link" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
