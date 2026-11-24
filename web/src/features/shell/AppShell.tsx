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
import { Toaster } from "@/components/Toast";
import { Shortcuts } from "./Shortcuts";
import { GROUP_LABEL, navFor, type NavGroup } from "./nav";

const GROUPS: NavGroup[] = ["home", "work", "studio"];

/** One line icon per section (24 px grid, drawn with the stroke of the text). */
const ICONS: Record<string, string> = {
  today: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  ceo: "M4 19h16M6 16V11M10 16V7M14 16v-6M18 16V5",
  calendar:
    "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4",
  finance:
    "M4 7h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 7l2-3h12l2 3M12 10v6M9.5 11.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.4-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5",
  pipeline: "M4 6h16M7 12h10M10 18h4",
  clients:
    "M4 20a6 6 0 0 1 12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11a3.2 3.2 0 1 0 0-6.4M20 20a5 5 0 0 0-3-4.6",
  shoots:
    "M4 8h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM16 11l5-3v10l-5-3",
  talent: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0",
  locations:
    "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  creators:
    "M4 7h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM16 10.5l5-2.5v8l-5-2.5M8 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  studios:
    "M4 8h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M12 15.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  pages: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  tools: "M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z",
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
      <Toaster />
      <Shortcuts allowed={items.map((i) => i.path)} />
      <UndoBar workspaceId={workspace.id} />
      <Tour steps={teamSteps()} storageKey="gecko.tour.team" />
    </div>
  );
}
