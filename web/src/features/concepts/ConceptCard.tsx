import type { ReactNode } from "react";
import {
  FORMAT_LABEL,
  refLines,
  shortDate,
  STATUS_LABEL,
  type Concept,
  type ConceptNote,
} from "./model";

const NOTE_LABEL: Record<ConceptNote["kind"], string> = {
  comment: "",
  approve: "Approved",
  changes: "Asked for changes",
};

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
          <span className="small muted">Version {concept.version}</span>
        )}
      </header>
      <h3>{concept.title}</h3>
      {concept.body && <p className="concept-body">{concept.body}</p>}
      {refs.length > 0 && (
        <ul className="refs">
          {refs.map((ref, i) => (
            <li key={i}>
              {ref.href ? (
                <a href={ref.href} target="_blank" rel="noreferrer noopener">
                  {ref.text}
                </a>
              ) : (
                ref.text
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="small muted">
        {concept.fromClient ? "Idea from " : "By "}
        {concept.authorName || (concept.fromClient ? "the client" : "Gecko")}
        {concept.approvedAt &&
          ` · Approved by ${concept.approvedBy ?? "the client"} on ${shortDate(concept.approvedAt)}`}
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
    <ol className="notes" aria-label="Conversation">
      {notes.map((note) => (
        <li
          key={note.id}
          className={`note note-${note.kind}${note.fromClient ? " from-client" : ""}`}
        >
          <p className="small">
            <strong>{note.authorName || (note.fromClient ? "Client" : "Gecko")}</strong>
            {NOTE_LABEL[note.kind] && <span className="note-kind">{NOTE_LABEL[note.kind]}</span>}
            <span className="muted">
              {" "}
              · {shortDate(note.createdAt)}
              {note.kind !== "comment" ? ` · version ${note.version}` : ""}
            </span>
          </p>
          {note.body && <p className="note-body">{note.body}</p>}
        </li>
      ))}
    </ol>
  );
}
