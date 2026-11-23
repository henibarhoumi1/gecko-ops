import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";

export interface WritingTab {
  key: string;
  label: string;
  /** A small count or mark next to the label (how many picked, a warning). */
  badge?: ReactNode;
  body: ReactNode;
}

/**
 * Page tabs for a writing space, like Notion's: every panel stays mounted (so nothing typed is lost when you
 * switch) and only the open one shows. Alt+1…9 jumps to a tab; arrows move along the tab row.
 */
export function WritingTabs({ tabs, initial }: { tabs: WritingTab[]; initial?: string }) {
  const [open, setOpen] = useState(initial ?? tabs[0]?.key);
  const id = useId();
  const current = tabs.some((x) => x.key === open) ? open : tabs[0]?.key;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const n = Number(e.code.replace("Digit", ""));
      const tab = n >= 1 ? tabs[n - 1] : undefined;
      if (tab) {
        e.preventDefault();
        setOpen(tab.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs]);

  return (
    <div className="wtabs">
      <div className="wtabs-row" role="tablist" aria-label="Sections">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${id}-t-${tab.key}`}
            aria-controls={`${id}-p-${tab.key}`}
            aria-selected={current === tab.key}
            tabIndex={current === tab.key ? 0 : -1}
            className="wtab"
            title={`Alt+${i + 1}`}
            onClick={() => setOpen(tab.key)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const at = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
              const next = tabs[at];
              if (!next) return;
              setOpen(next.key);
              (e.currentTarget.parentElement?.children[at] as HTMLElement | undefined)?.focus();
            }}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== "" && (
              <span className="wtab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${id}-p-${tab.key}`}
          aria-labelledby={`${id}-t-${tab.key}`}
          hidden={current !== tab.key}
          className="wtab-panel"
        >
          {tab.body}
        </div>
      ))}
    </div>
  );
}

/**
 * ⌘S / Ctrl+S saves the form (with its first submit button, or the one named), ⌘↵ / Ctrl+Enter uses the
 * "share" button when there is one. Only while focus is inside the form.
 */
export function useSaveKeys(form: RefObject<HTMLFormElement | null>) {
  const busy = useRef(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = form.current;
      if (!el || !(e.metaKey || e.ctrlKey) || busy.current) return;
      if (!el.contains(document.activeElement) && document.activeElement !== document.body) return;
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "enter") return;
      const buttons = [...el.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
      const share = buttons.find((b) => b.value === "share");
      const save = buttons.find((b) => b.value !== "share") ?? buttons[0];
      const pick = key === "enter" && share ? share : key === "s" ? save : null;
      if (!pick || pick.disabled) return;
      e.preventDefault();
      busy.current = true;
      el.requestSubmit(pick);
      window.setTimeout(() => (busy.current = false), 600);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form]);
}
