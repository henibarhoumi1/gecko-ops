import { t } from "@/lib/i18n";

/** Folds the sidebar to a slim strip, or opens it again. */
export function SideToggle({ folded, onToggle }: { folded: boolean; onToggle: () => void }) {
  const label = folded
    ? t("Open the menu", "Ouvrir le menu")
    : t("Fold the menu", "Replier le menu");
  return (
    <button
      type="button"
      className="side-toggle"
      aria-label={label}
      aria-expanded={!folded}
      title={label}
      onClick={onToggle}
    >
      <span aria-hidden="true">{folded ? "»" : "«"}</span>
    </button>
  );
}
