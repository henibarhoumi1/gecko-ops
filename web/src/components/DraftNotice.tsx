import { Button } from "@/components/Button";
import { t } from "@/lib/i18n";

/** Shown when a form reopens with writing that was kept but never saved. */
export function DraftNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div className="draft-notice" role="status">
      <span>
        {t(
          "We kept what you were writing last time. It isn't saved yet.",
          "On a gardé ce que vous écriviez la dernière fois. Ce n'est pas encore enregistré.",
        )}
      </span>
      <Button variant="link" onClick={onDiscard}>
        {t("Start over", "Recommencer")}
      </Button>
    </div>
  );
}
