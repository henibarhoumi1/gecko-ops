import { useNavigate, useParams } from "react-router-dom";
import type { BoardTarget } from "./boardApi";
import { BoardView } from "./BoardView";

/** The board at /…/board or /…/board/<id>, for the team (base = /clients/<id>/board) or the client (base = /board). */
export function BoardRoute({
  target,
  base,
  reader,
}: {
  target: BoardTarget;
  base: string;
  reader: "team" | "client";
}) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  return (
    <BoardView
      target={target}
      boardId={boardId ?? null}
      reader={reader}
      onOpenBoard={(id) => navigate(id ? `${base}/${id}` : base)}
    />
  );
}
