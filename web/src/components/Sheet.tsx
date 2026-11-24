// A side sheet over the page: one way to open a big picker or a panel everywhere (team and client side alike).
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Sheet({
  title,
  sub,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      html.style.overflow = was;
    };
  }, [onClose]);
  return createPortal(
    <div className="sheet-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        className={`sheet${wide ? " is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="sheet-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="sheet-x" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
