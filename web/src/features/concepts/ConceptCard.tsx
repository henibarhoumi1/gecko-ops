import { LinkPlayer } from "@/components/LinkPlayer";
import type { ReactNode } from "react";
import {
  FORMAT_LABEL,
  refLines,
  shortDate,
  STATUS_LABEL,
  type Concept,
  type ConceptNote,
} from "./model";
import { t } from "@/lib/i18n";

const noteLabel = (kind: ConceptNote["kind"]) =>
  kind === "approve"
    ? t("Approved", "A validé")
    : kind === "changes"
      ? t("Asked for changes", "A demandé des changements")
      : "";

/** One concept as both sides see it: the idea, its references and the conversation under it. */
export function ConceptCard({
  concept,
  reader,
  children,
}: {
  concept: Concept;
  reader: "client" | "team";
  children?: ReactNode;
}) {
  const refs = refLines(concept.refs);
  return (
    <article className={`concept concept-${concept.status}`}>
      <header className="concept-head">
        <span className="tag">{FORMAT_LABEL[concept.format]}</span>
        <span className={`status status-${concept.status}`}>
          {STATUS_LABEL[reader][concept.status]}
        </span>
        {concept.version > 1 && concept.status !== "idea" && (
          <span className="small muted">
            {t("Version", "Version")} {concept.version}
          </span>
        )}
      </header>
      <h3>{concept.title}</h3>
      {concept.body && <p className="concept-body">{concept.body}</p>}
      {refs.length > 0 && (
        <ul className="refs">
          {refs.map((ref, i) => (
            <li key={i}>{ref.href ? <LinkPlayer url={ref.href} label={ref.text} /> : ref.text}</li>
          ))}
        </ul>
      )}
      <p className="small muted">
        {concept.fromClient ? t("Idea from ", "Idée de ") : t("By ", "Par ")}
        {concept.authorName || (concept.fromClient ? t("the client", "le client") : "Gecko")}
        {concept.approvedAt &&
          t(
            ` · Approved by ${concept.approvedBy ?? "the client"} on ${shortDate(concept.approvedAt)}`,
            ` · Validée par ${concept.approvedBy ?? "le client"} le ${shortDate(concept.approvedAt)}`,
          )}
      </p>
      <NoteList notes={concept.notes} />
      {children}
    </article>
  );
}

/** The conversation under a concept or a video, oldest first. */
export function NoteList({ notes }: { notes: ConceptNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ol className="notes" aria-label={t("Conversation", "Échanges")}>
      {notes.map((note) => (
        <li
          key={note.id}
          className={`note note-${note.kind}${note.fromClient ? " from-client" : ""}`}
        >
          <p className="small">
            <strong>
              {note.authorName || (note.fromClient ? t("Client", "Client") : "Gecko")}
            </strong>
            {noteLabel(note.kind) && <span className="note-kind">{noteLabel(note.kind)}</span>}
            <span className="muted">
              {" "}
              · {shortDate(note.createdAt)}
              {note.kind !== "comment" ? ` · ${t("version", "version")} ${note.version}` : ""}
            </span>
          </p>
          {note.body && <p className="note-body">{note.body}</p>}
        </li>
      ))}
    </ol>
  );
}
