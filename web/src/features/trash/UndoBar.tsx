import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { t } from "@/lib/i18n";
import { kindName, lastDelete, MUTATED, useRestore } from "./trashApi";

/**
 * After anything is deleted, by the team or the client: "Deleted. Undo" for ten seconds.
 * It shows each delete once, and never one from before the page opened.
 */
export function UndoBar({ workspaceId }: { workspaceId: string }) {
  const restore = useRestore(workspaceId);
  const [shown, setShown] = useState<{ batch: string; kind: string; label: string } | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    // What was already there when the page opened is never offered.
    void lastDelete(workspaceId)
      .then((d) => {
        seen.current = new Set(d ? [d.batch] : []);
      })
      .catch(() => {
        seen.current = new Set();
      });
    const check = () => {
      if (!seen.current) return;
      void lastDelete(workspaceId)
        .then((d) => {
          if (!alive || !d || !seen.current || seen.current.has(d.batch)) return;
          seen.current.add(d.batch);
          setShown(d);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setShown(null), 10_000);
        })
        .catch(() => undefined);
    };
    window.addEventListener(MUTATED, check);
    return () => {
      alive = false;
      window.removeEventListener(MUTATED, check);
      window.clearTimeout(timer.current);
    };
  }, [workspaceId]);

  if (!shown) return null;
  return (
    <div className="undo-bar" role="status">
      <span dir="auto">
        {t("Deleted", "Supprimé")}: {kindName(shown.kind).toLowerCase()} &ldquo;{shown.label}
        &rdquo;.
      </span>
      <Button
        variant="link"
        disabled={restore.isPending}
        onClick={() => restore.mutate(shown.batch, { onSuccess: () => setShown(null) })}
      >
        {t("Undo", "Annuler")}
      </Button>
      {restore.isError && (
        <span className="small">{t("Couldn't undo.", "Annulation impossible.")}</span>
      )}
    </div>
  );
}
