import { useEffect, useId, useRef, useState } from "react";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  /** Red, and listed last after a separator. */
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

/** The "⋯" on any item: open, open in a new tab, hide, move to trash and the like, in one small menu. */
export function ItemMenu({ actions, label = "More" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const shown = actions.filter((a) => !a.hidden);
  const plain = shown.filter((a) => !a.danger);
  const danger = shown.filter((a) => a.danger);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!shown.length) return null;
  const item = (a: MenuAction) => (
    <li key={a.label}>
      <button
        type="button"
        role="menuitem"
        className={a.danger ? "danger" : undefined}
        disabled={a.disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          a.onSelect();
        }}
      >
        {a.label}
      </button>
    </li>
  );
  return (
    <div className="item-menu" ref={box}>
      <button
        type="button"
        className="item-menu-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <ul className="item-menu-list" role="menu" id={id}>
          {plain.map(item)}
          {danger.length > 0 && plain.length > 0 && (
            <li className="item-menu-sep" role="separator" />
          )}
          {danger.map(item)}
        </ul>
      )}
    </div>
  );
}
