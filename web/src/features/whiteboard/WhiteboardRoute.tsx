import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { useWhiteboardActions, useWhiteboards, type WhiteboardTarget } from "./whiteboardApi";

// Excalidraw is big; only people who open a whiteboard download it.
const WhiteboardCanvas = lazy(() => import("./WhiteboardCanvas"));

/** The whiteboards at /…/whiteboard or /…/whiteboard/<id>, for the team or the client. */
export function WhiteboardRoute({
  target,
  base,
  reader,
  template,
}: {
  target: WhiteboardTarget;
  base: string;
  reader: "team" | "client";
  template: "performance" | "cinematic";
}) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const boards = useWhiteboards(target);
  const actions = useWhiteboardActions(target);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState(false);
  const started = useRef(false);

  const list = boards.data ?? [];
  const current = list.find((b) => b.id === boardId) ?? list[0];
  const firstName =
    template === "cinematic" ? t("Moodboard", "Moodboard") : t("Inspiration", "Inspiration");

  // A client's first visit opens a board straight away, already laid out.
  useEffect(() => {
    if (!boards.isSuccess || list.length || started.current) return;
    started.current = true;
    actions.create.mutate(firstName);
  }, [boards.isSuccess, list.length, actions.create, firstName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    if (naming === "new") {
      const id = await actions.create.mutateAsync(name);
      navigate(`${base}/${id}`);
    } else if (current) {
      await actions.rename.mutateAsync({ id: current.id, title: name });
    }
    setNaming(null);
  }

  async function onDelete() {
    if (!current) return;
    await actions.remove.mutateAsync(current.id);
    setDeleting(false);
    navigate(base);
  }

  const failed = actions.create.error ?? actions.rename.error ?? actions.remove.error;

  if (boards.isError) return <Notice tone="error">{friendlyError(boards.error)}</Notice>;

  return (
    <section className="wb-page">
      <div className="wb-head">
        <nav className="wb-tabs" aria-label={t("Whiteboards", "Tableaux blancs")}>
          {list.map((b) => (
            <NavLink
              key={b.id}
              to={`${base}/${b.id}`}
              className={() => `wb-tab${b.id === current?.id ? " active" : ""}`}
            >
              {b.title}
            </NavLink>
          ))}
        </nav>
        {naming ? (
          <form className="wb-name" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor="wb-title">
              {t("Board name", "Nom du tableau")}
            </label>
            <input
              id="wb-title"
              value={title}
              maxLength={80}
              autoFocus
              placeholder={t("Shot ideas, Wardrobe…", "Idées de plans, Stylisme…")}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button type="submit">
              {naming === "new" ? t("Add", "Ajouter") : t("Save", "Enregistrer")}
            </Button>
            <Button variant="link" onClick={() => setNaming(null)}>
              {t("Cancel", "Annuler")}
            </Button>
          </form>
        ) : (
          <div className="wb-actions">
            <Button variant="link" onClick={() => (setTitle(""), setNaming("new"))}>
              {t("New board", "Nouveau tableau")}
            </Button>
            {current && (
              <Button variant="link" onClick={() => (setTitle(current.title), setNaming("rename"))}>
                {t("Rename", "Renommer")}
              </Button>
            )}
            {reader === "team" &&
              current &&
              list.length > 1 &&
              (deleting ? (
                <span className="wb-confirm">
                  Delete “{current.title}” for both sides?{" "}
                  <Button variant="link" className="danger" onClick={onDelete}>
                    Yes, delete it
                  </Button>{" "}
                  <Button variant="link" onClick={() => setDeleting(false)}>
                    Keep it
                  </Button>
                </span>
              ) : (
                <Button variant="link" onClick={() => setDeleting(true)}>
                  Delete board
                </Button>
              ))}
          </div>
        )}
      </div>
      {failed && <Notice tone="error">{friendlyError(failed)}</Notice>}
      {current ? (
        <Suspense
          fallback={<p className="muted">{t("Opening the board…", "Ouverture du tableau…")}</p>}
        >
          <WhiteboardCanvas
            key={current.id}
            target={target}
            boardId={current.id}
            template={template}
          />
        </Suspense>
      ) : (
        <p className="muted">{t("Opening the board…", "Ouverture du tableau…")}</p>
      )}
    </section>
  );
}
