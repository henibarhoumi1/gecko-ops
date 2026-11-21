import { SideToggle } from "@/components/SideToggle";
import { useSideFolded } from "@/lib/sideMode";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import type { Workspace } from "@/features/auth/account";
import { useAuth } from "@/features/auth/AuthProvider";
import { Tour, startTour } from "@/features/tour/Tour";
import { teamSteps } from "@/features/tour/steps";
import { UndoBar } from "@/features/trash/UndoBar";
import { memberLabel, ROLE_LABEL, useMembers } from "@/features/workspace/members";
import { CommandPalette, openPalette } from "./CommandPalette";
import { GROUP_LABEL, navFor, type NavGroup } from "./nav";

const GROUPS: NavGroup[] = ["home", "work", "studio"];

/** One line icon per section (24 px grid, drawn with the stroke of the text). */
const ICONS: Record<string, string> = {
  today: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  pipeline: "M4 6h16M7 12h10M10 18h4",
  clients:
    "M4 20a6 6 0 0 1 12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11a3.2 3.2 0 1 0 0-6.4M20 20a5 5 0 0 0-3-4.6",
  shoots:
    "M4 8h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM16 11l5-3v10l-5-3",
  talent: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0",
  locations:
    "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  team: "M3 19a5 5 0 0 1 10 0M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM14 19a5 5 0 0 1 7-4.6M17 10a3 3 0 1 0 0-6",
  alerts: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
};

function NavIcon({ path }: { path: string }) {
  const d = ICONS[path];
  if (!d) return null;
  return (
    <svg className="nav-ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** The team app: a black sidebar like the website's dark sections, the work on white. */
export function AppShell({ workspace, email }: { workspace: Workspace; email: string }) {
  const { signOut } = useAuth();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId);
  const items = navFor(workspace.role);
  const [folded, setFolded] = useSideFolded();
  return (
    <div className={`shell${folded ? " side-folded" : ""}`}>
      <aside className="side">
        <SideToggle folded={folded} onToggle={() => setFolded(!folded)} />
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
                    <NavIcon path={item.path} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="me">
          <strong className="me-name">{me?.name || email}</strong>
          <span>{me ? memberLabel(me) : ROLE_LABEL[workspace.role]}</span>
          <Button variant="link" onClick={startTour}>
            Take the tour
          </Button>
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
      <Tour steps={teamSteps()} storageKey="gecko.tour.team" />
    </div>
  );
}
