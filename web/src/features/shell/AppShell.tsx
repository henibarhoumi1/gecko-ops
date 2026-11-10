import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import type { Workspace } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { UndoBar } from "@/features/trash/UndoBar";
import { memberLabel, ROLE_LABEL, useMembers } from "@/features/workspace/members";
import { CommandPalette, openPalette } from "./CommandPalette";
import { GROUP_LABEL, navFor, type NavGroup } from "./nav";

const GROUPS: NavGroup[] = ["home", "work", "studio"];

/** The team app: a black sidebar like the website's dark sections, the work on white. */
export function AppShell({ workspace, email }: { workspace: Workspace; email: string }) {
  const { signOut } = useAuth();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId);
  const items = navFor(workspace.role);
  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <button type="button" className="side-search" onClick={openPalette}>
          <span>Search or jump</span>
          <kbd>⌘K</kbd>
        </button>
        <nav aria-label="Main">
          {GROUPS.map((g) => {
            const list = items.filter((i) => i.group === g);
            if (!list.length) return null;
            return (
              <div key={g} className="side-group">
                {GROUP_LABEL[g] && <span className="side-group-name">{GROUP_LABEL[g]}</span>}
                {list.map((item) => (
                  <NavLink key={item.path} to={`/${item.path}`} className="nav-item">
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="me">
          <strong className="me-name">{me?.name || email}</strong>
          <span>{me ? memberLabel(me) : ROLE_LABEL[workspace.role]}</span>
          <Button variant="link" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <CommandPalette role={workspace.role} />
      <UndoBar workspaceId={workspace.id} />
    </div>
  );
}
