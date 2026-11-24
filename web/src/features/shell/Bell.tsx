// Notifications (Heni, 24 Nov 2026): a bell in the sidebar with what clients did (approved, asked for changes,
// commented) since you last looked, refreshed every minute. Founder and producers.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { describeAction, useAlerts } from "@/features/alerts/alertsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

const KEY = "gecko.bell.seen";

function seenAt(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function Bell() {
  const { role } = useWorkspace();
  // Client activity is for the founder and producers; others don't load it at all.
  return role === "founder" || role === "sales" ? <BellInner /> : null;
}

function BellInner() {
  const alerts = useAlerts(14);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(seenAt);
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const items = (alerts.data?.activity ?? []).slice(0, 20);
  const unread = items.filter((a) => a.at > seen).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || pop.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const narrow = window.innerWidth < 760;
      setPos(
        narrow ? { top: r.bottom + 8, left: 12 } : { top: Math.max(12, r.top), left: r.right + 14 },
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const ago = (at: string) => {
    const m = Math.round((Date.now() - new Date(at).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24);
    return d === 1 ? "Yesterday" : `${d} days ago`;
  };

  const toggle = () => {
    if (!open && items[0]) {
      try {
        localStorage.setItem(KEY, items[0].at);
      } catch {
        /* not remembered in private mode */
      }
      window.setTimeout(() => setSeen(items[0]!.at), 1500);
    }
    setOpen(!open);
  };

  return (
    <div className="bell" ref={box}>
      <button
        type="button"
        className="bell-btn"
        ref={btn}
        aria-expanded={open}
        aria-label={unread ? `${unread} new from clients` : "Notifications"}
        onClick={toggle}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="bell-n">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            className="bell-pop"
            role="dialog"
            aria-label="Notifications"
            ref={pop}
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="bell-head">
              <strong>
                From clients{unread > 0 && <span className="bell-count">{unread} new</span>}
              </strong>
              <Link to="/alerts" className="bell-all" onClick={() => setOpen(false)}>
                All alerts →
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="bell-empty">Nothing from clients in the last two weeks.</p>
            ) : (
              <ul>
                {items.map((a, i) => (
                  <li key={`${a.at}-${i}`} className={a.at > seen ? "is-new" : ""}>
                    <Link
                      to={`/clients/${encodeURIComponent(a.client_id)}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="bell-av" aria-hidden="true">
                        {(a.author || a.brand || "C").trim().slice(0, 1).toUpperCase()}
                      </span>
                      <span className="bell-txt">
                        <span>
                          <strong>{a.author || "Client"}</strong> {describeAction(a)}{" "}
                          <span dir="auto">{a.title}</span>
                        </span>
                        <span className="bell-meta">
                          {a.brand} · {ago(a.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
