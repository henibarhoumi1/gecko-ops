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

  const shown = (stage: RoomStage) => only === null || only === stage || only === "mine";
  const filter = (list: Piece[]) =>
    only === "mine" ? list.filter((p) => p.waitingOn === reader) : list;

  return (
    <div className="room">
      <div className="room-flow" role="toolbar" aria-label={t("Filter", "Filtrer")}>
        {mine > 0 && (
          <button
            type="button"
            className={`room-chip mine${only === "mine" ? " on" : ""}`}
            aria-pressed={only === "mine"}
            onClick={() => setOnly(only === "mine" ? null : "mine")}
          >
            {reader === "client"
              ? t(`${mine} waiting for you`, `${mine} vous attendent`)
              : `${mine} waiting on us`}
          </button>
        )}
        {ROOM_STAGES.map((stage, i) => (
          <button
            key={stage}
            type="button"
            className={`room-chip${only === stage ? " on" : ""}`}
            aria-pressed={only === stage}
            onClick={() => setOnly(only === stage ? null : stage)}
          >
            {i > 0 && <span aria-hidden="true">→ </span>}
            {stageLabel(stage, reader)} <strong>{columns[stage].length}</strong>
          </button>
        ))}
      </div>

      <div className="room-columns">
        {ROOM_STAGES.filter(shown).map((stage) => (
          <section key={stage} className={`room-col room-${stage}`}>
            <h2 className="room-col-head">
              [ {stageLabel(stage, reader)} ]{" "}
              <span className="muted">{filter(columns[stage]).length}</span>
            </h2>
            {filter(columns[stage]).map((p) => (
              <PieceCard key={p.key} piece={p} reader={reader} base={base} />
            ))}
          </section>
        ))}
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
  return (
    <article className={`room-card${mine ? " mine" : ""}`}>
      <div className="room-card-tags">
        {concept && <span className="tag">{FORMAT_LABEL[concept.format]}</span>}
        {!isCinematic() && scripts[0] && (
          <span className="tag">{STYLE_LABEL[scripts[0].style]}</span>
        )}
        {mine && (
          <span className="tag room-up">
            {reader === "client" ? t("Your turn", "À vous") : "Our turn"}
          </span>
        )}
      </div>
      <h3 dir="auto">{piece.title}</h3>
      {piece.hook && (
        <p className="room-hook" dir="auto">
          “{piece.hook}”
        </p>
      )}
      <ul className="room-links">
        {concept && (
          <li>
            <Link to={`${base}/concepts#idea-${concept.id}`}>{t("The idea", "L'idée")}</Link>
          </li>
        )}
        {scripts.map((s) => (
          <li key={s.id}>
            <Link to={`${base}/scripts#script-${s.id}`}>
              {scripts.length > 1 || concept ? s.title : t("The script", "Le script")}
            </Link>{" "}
            <span className="small muted">· {scriptStatus(s, reader)}</span>
          </li>
        ))}
        {reader === "team" && piece.stage === "write" && concept && (
          <li>
            <Link className="room-act" to={`${base}/scripts?idea=${concept.id}`}>
              Write the script →
            </Link>
          </li>
        )}
      </ul>
    </article>
  );
}
