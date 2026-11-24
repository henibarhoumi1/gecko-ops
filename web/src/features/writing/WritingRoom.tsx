import { useState } from "react";
import { Link } from "react-router-dom";
import { FORMAT_LABEL, type Concept } from "@/features/concepts/model";
import { scriptStatus, STYLE_LABEL, type Script } from "@/features/scripts/model";
import { t } from "@/lib/i18n";
import { isCinematic } from "@/lib/wording";
import {
  byStage,
  roomPieces,
  ROOM_STAGES,
  stageLabel,
  waitingOnMe,
  type Piece,
  type RoomStage,
} from "./room";

/**
 * Ideas and scripts on one page, in the order they move: idea → to script → writing → reading → ready.
 * Same page for the team and the client; each card opens the idea or the script where it's worked on.
 */
export function WritingRoom({
  concepts,
  scripts,
  reader,
  base,
}: {
  concepts: readonly Concept[];
  scripts: readonly Script[];
  reader: "client" | "team";
  /** Where the Ideas and Scripts pages live: "/clients/<id>" for the team, "" in the portal. */
  base: string;
}) {
  const pieces = roomPieces(concepts, scripts);
  const columns = byStage(pieces);
  const mine = waitingOnMe(pieces, reader);
  const [only, setOnly] = useState<RoomStage | "mine" | null>(null);

  if (pieces.length === 0)
    return (
      <div className="room-empty">
        <p>
          {reader === "client"
            ? t(
                "Nothing written yet. Ideas and scripts will show up here as they move, from first idea to ready to shoot.",
                "Rien d'écrit pour l'instant. Les idées et les scripts apparaîtront ici, de la première idée jusqu'au tournage.",
              )
            : "Nothing written yet for this client. Start with an idea."}
        </p>
        <Link className="btn" to={`${base}/concepts`}>
          {t("Add an idea", "Ajouter une idée")}
        </Link>
      </div>
    );

  const filter = (list: Piece[]) =>
    only === "mine" ? list.filter((p) => p.waitingOn === reader) : list;

  const ours = only === "mine";
  const stagesWith = ROOM_STAGES.filter((st) => columns[st].length > 0);
  return (
    <div className="room room-v2">
      <div className="room-sum">
        <p>
          {stagesWith.length === 0
            ? null
            : stagesWith.map((st, i) => (
                <span key={st}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <strong>{columns[st].length}</strong> {stageLabel(st, reader).toLowerCase()}
                </span>
              ))}
        </p>
        {mine > 0 && (
          <button
            type="button"
            className={`room-only${ours ? " on" : ""}`}
            aria-pressed={ours}
            onClick={() => setOnly(ours ? null : "mine")}
          >
            <span className="room-only-dot" aria-hidden="true" />
            {reader === "client"
              ? t(`${mine} waiting for you`, `${mine} vous attendent`)
              : `${mine} waiting on us`}
            <span className="room-only-k">
              {ours ? t("Show all", "Tout voir") : t("Show only these", "Voir seulement")}
            </span>
          </button>
        )}
      </div>

      <div className="room-board">
        {ROOM_STAGES.map((stage) => {
          const list = filter(columns[stage]);
          return (
            <section
              key={stage}
              className={`room-lane lane-${stage}${list.length ? "" : " is-empty"}`}
            >
              <h2 className="room-lane-head">
                <span className="room-lane-dot" aria-hidden="true" />
                {stageLabel(stage, reader)}
                <span className="room-lane-n">{list.length}</span>
              </h2>
              <div className="room-lane-body">
                {list.length === 0 ? (
                  <p className="room-lane-none">{t("Nothing here", "Rien ici")}</p>
                ) : (
                  list.map((p) => <PieceCard key={p.key} piece={p} reader={reader} base={base} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PieceCard({
  piece,
  reader,
  base,
}: {
  piece: Piece;
  reader: "client" | "team";
  base: string;
}) {
  const { concept, scripts } = piece;
  const mine = piece.waitingOn === reader;
  const meta = [
    concept ? FORMAT_LABEL[concept.format] : "",
    !isCinematic() && scripts[0] ? STYLE_LABEL[scripts[0].style] : "",
  ].filter(Boolean);
  const main = scripts[0];
  const open = main
    ? `${base}/scripts#script-${main.id}`
    : concept
      ? `${base}/concepts#idea-${concept.id}`
      : base;
  return (
    <article className={`room-card${mine ? " mine" : ""}`}>
      <p className="room-card-meta">
        <span>{meta.join(" · ")}</span>
        {mine && (
          <span className="room-turn">
            {reader === "client" ? t("Your turn", "À vous") : "Our turn"}
          </span>
        )}
      </p>
      <h3 dir="auto">
        <Link to={open}>{piece.title}</Link>
      </h3>
      {piece.hook && (
        <p className="room-hook" dir="auto">
          {piece.hook}
        </p>
      )}
      {main && (
        <p className="room-card-status">
          {scripts.length > 1 ? `${scripts.length} scripts · ` : ""}
          {scriptStatus(main, reader)}
        </p>
      )}
      <div className="room-card-foot">
        {concept && (
          <Link className="room-btn" to={`${base}/concepts#idea-${concept.id}`}>
            {t("Idea", "Idée")}
          </Link>
        )}
        {scripts.map((s, i) => (
          <Link key={s.id} className="room-btn" to={`${base}/scripts#script-${s.id}`}>
            {scripts.length > 1 ? `${t("Script", "Script")} ${i + 1}` : t("Script", "Script")}
          </Link>
        ))}
        {reader === "team" && piece.stage === "write" && concept && (
          <Link className="room-btn primary" to={`${base}/scripts?idea=${concept.id}`}>
            Write the script
          </Link>
        )}
      </div>
    </article>
  );
}
