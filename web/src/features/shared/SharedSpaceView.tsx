import { LinkPlayer } from "@/components/LinkPlayer";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { linkHost, type SharedItem, type SharedSpace } from "./sharedApi";
import { t } from "@/lib/i18n";

export interface SharedActions {
  saveNotes: (body: string) => Promise<unknown>;
  addReference: (input: { title: string; body: string; url: string }) => Promise<unknown>;
  /** Client only. */
  addRequest?: (input: { title: string; body: string }) => Promise<unknown>;
  /** Team only: answer, or close without an answer. */
  answer?: (input: {
    id: string;
    answer: string;
    status: "answered" | "closed";
  }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

/** The space both sides fill in: brand notes, references and requests. */
export function SharedSpaceView({
  reader,
  data,
  actions,
}: {
  reader: "client" | "team";
  data: SharedSpace;
  actions: SharedActions;
}) {
  const references = data.items.filter((i) => i.kind === "reference");
  const requests = data.items.filter((i) => i.kind === "request");
  const openRequests = requests.filter((r) => r.status === "open");

  return (
    <section className="tab-body shared">
      <p className="lede">
        {reader === "client"
          ? t(
              "The space we both fill in. Your brand notes guide every script, references show us what you like, and requests are for anything that isn't about a script or a reel.",
              "L'espace qu'on remplit ensemble. Vos notes de marque guident chaque script, les références nous montrent ce que vous aimez, et les demandes servent à tout ce qui ne concerne pas un script ou une vidéo.",
            )
          : "Filled in by both sides. Every script gets checked against the brand notes. Requests from the client need an answer here."}
      </p>

      <BrandNotes reader={reader} notes={data.brandNotes} onSave={actions.saveNotes} />

      <div className="group">
        <h2>
          {t("References", "Références")} <span className="count">{references.length}</span>
        </h2>
        <ReferenceForm reader={reader} onAdd={actions.addReference} />
        {references.length === 0 ? (
          <p className="muted">
            {reader === "client"
              ? t(
                  "Drop in reels or ads you love, or ones you never want to look like.",
                  "Ajoutez des vidéos ou des pubs que vous adorez, ou auxquelles vous ne voulez jamais ressembler.",
                )
              : "No references yet."}
          </p>
        ) : (
          <ul className="refs-grid">
            {references.map((item) => (
              <Reference key={item.id} reader={reader} item={item} onRemove={actions.remove} />
            ))}
          </ul>
        )}
      </div>

      <div className="group">
        <h2>
          {t("Requests", "Demandes")}{" "}
          {reader === "team" && openRequests.length > 0 && (
            <span className="badge">{openRequests.length} open</span>
          )}
        </h2>
        {actions.addRequest && <RequestForm onAdd={actions.addRequest} />}
        {requests.length === 0 ? (
          <p className="muted">
            {reader === "client"
              ? t(
                  "A new product, a date that moved, a question for Heni: ask here and the answer stays with it.",
                  "Un nouveau produit, une date qui bouge, une question pour Heni : demandez ici, la réponse reste avec.",
                )
              : "No requests from the client."}
          </p>
        ) : (
          <ul className="requests">
            {requests.map((item) => (
              <Request
                key={item.id}
                reader={reader}
                item={item}
                onAnswer={actions.answer}
                onRemove={actions.remove}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError("");
    try {
      await action();
      after?.();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

function BrandNotes({
  reader,
  notes,
  onSave,
}: {
  reader: "client" | "team";
  notes: SharedSpace["brandNotes"];
  onSave: (body: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const { busy, error, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "");
    void run(
      () => onSave(body),
      () => setEditing(false),
    );
  }

  return (
    <div className="block brand-notes">
      <div className="page-head">
        <h2>{t("Brand notes", "Notes de marque")}</h2>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {notes.body ? t("Edit", "Modifier") : t("Write them", "Les écrire")}
          </Button>
        )}
      </div>
      {editing ? (
        <form className="concept-form" onSubmit={onSubmit}>
          <TextArea
            label={t("Brand notes", "Notes de marque")}
            name="body"
            rows={10}
            maxLength={8000}
            defaultValue={notes.body}
            dir="auto"
            autoFocus
            placeholder={t(
              "Words we use: …\nWords we never use: …\nClaims we can't make: …\nThe brand never: …\nAlways show: …",
              "Les mots qu'on utilise : …\nLes mots qu'on n'utilise jamais : …\nCe qu'on ne peut pas promettre : …\nLa marque ne fait jamais : …\nToujours montrer : …",
            )}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="actions">
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              {t("Cancel", "Annuler")}
            </Button>
            <Button type="submit" disabled={busy}>
              {t("Save", "Enregistrer")}
            </Button>
          </div>
        </form>
      ) : notes.body ? (
        <>
          <p className="brand-notes-body" dir="auto">
            {notes.body}
          </p>
          {notes.updatedAt && (
            <p className="small muted">
              {t(
                `Last edited by ${notes.updatedBy || "Gecko"} on ${shortDate(notes.updatedAt)}`,
                `Modifié par ${notes.updatedBy || "Gecko"} le ${shortDate(notes.updatedAt)}`,
              )}
            </p>
          )}
        </>
      ) : (
        <p className="muted">
          {reader === "client"
            ? t(
                "Words you use and avoid, claims you can't make, what your brand never does. Every script gets checked against this.",
                "Les mots que vous utilisez et ceux à éviter, ce que vous ne pouvez pas promettre, ce que votre marque ne fait jamais. Chaque script est vérifié avec ces notes.",
              )
            : "Nothing yet. Fill it in from the onboarding answers or on a call with the client."}
        </p>
      )}
    </div>
  );
}

function ReferenceForm({
  reader,
  onAdd,
}: {
  reader: "client" | "team";
  onAdd: (input: { title: string; body: string; url: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const { busy, error, setError, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const url = text("url");
    if (!url && !text("body"))
      return setError(
        t("Paste a link or write what you mean.", "Collez un lien ou expliquez en quelques mots."),
      );
    if (url && !/^https?:\/\/\S+$/i.test(url))
      return setError(
        t(
          "Paste the full link, starting with https://",
          "Collez le lien complet, qui commence par https://",
        ),
      );
    void run(
      () => onAdd({ title: text("title"), body: text("body"), url }),
      () => setOpen(false),
    );
  }

  if (!open)
    return (
      <p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("Add a reference", "Ajouter une référence")}
        </Button>
      </p>
    );
  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <Field
        label={t("Link", "Lien")}
        name="url"
        type="url"
        placeholder="https://www.instagram.com/reel/…"
        autoFocus
      />
      <Field
        label={t("In a few words", "En quelques mots")}
        name="title"
        maxLength={160}
        placeholder={
          reader === "client"
            ? t("This hook, this light, never this", "Cette accroche, cette lumière, jamais ça")
            : "What to take from it"
        }
      />
      <TextArea
        label={t("Anything to add (optional)", "Quelque chose à ajouter (facultatif)")}
        name="body"
        rows={2}
        maxLength={4000}
        dir="auto"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={busy}>
          {t("Add", "Ajouter")}
        </Button>
      </div>
    </form>
  );
}

function Reference({
  reader,
  item,
  onRemove,
}: {
  reader: "client" | "team";
  item: SharedItem;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const { busy, error, run } = useAction();
  const canRemove = reader === "client" ? item.mine : !item.fromClient;
  return (
    <li className="ref-card">
      {item.title && (
        <strong className="ref-title" dir="auto">
          {item.title}
        </strong>
      )}
      {item.url && <LinkPlayer url={item.url} label={`${linkHost(item.url)} ↗`} />}
      {item.body && (
        <p className="small ref-body" dir="auto">
          {item.body}
        </p>
      )}
      <p className="small muted">
        {item.fromClient
          ? item.authorName || t("Client", "Client")
          : `${item.authorName || "Gecko"}, Gecko`}{" "}
        · {shortDate(item.createdAt)}
        {canRemove && (
          <>
            {" · "}
            <button
              type="button"
              className="line-comment"
              disabled={busy}
              onClick={() => void run(() => onRemove(item.id))}
            >
              {t("Remove", "Retirer")}
            </button>
          </>
        )}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
    </li>
  );
}

function RequestForm({
  onAdd,
}: {
  onAdd: (input: { title: string; body: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const { busy, error, setError, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    if (!body) return setError(t("Write what you need.", "Écrivez ce dont vous avez besoin."));
    void run(
      () => onAdd({ title: String(form.get("title") ?? "").trim(), body }),
      () => setOpen(false),
    );
  }

  if (!open)
    return (
      <p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("Ask for something", "Faire une demande")}
        </Button>
      </p>
    );
  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <Field
        label={t("Subject (optional)", "Sujet (facultatif)")}
        name="title"
        maxLength={160}
        autoFocus
      />
      <TextArea
        label={t("What do you need?", "De quoi avez-vous besoin ?")}
        name="body"
        rows={4}
        maxLength={4000}
        dir="auto"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={busy}>
          {t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
      </div>
    </form>
  );
}

const requestStatus = (reader: "client" | "team", status: string) =>
  status === "open"
    ? reader === "client"
      ? t("With Gecko", "Chez Gecko")
      : "Needs an answer"
    : status === "answered"
      ? t("Answered", "Répondu")
      : t("Closed", "Clos");

function Request({
  reader,
  item,
  onAnswer,
  onRemove,
}: {
  reader: "client" | "team";
  item: SharedItem;
  onAnswer?: SharedActions["answer"];
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [answering, setAnswering] = useState(false);
  const { busy, error, run } = useAction();
  const status = item.status ?? "open";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onAnswer) return;
    const answer = String(new FormData(event.currentTarget).get("answer") ?? "").trim();
    void run(
      () => onAnswer({ id: item.id, answer, status: answer ? "answered" : "closed" }),
      () => setAnswering(false),
    );
  }

  return (
    <li className={`request request-${status}`}>
      <p className="small">
        <span className={`status status-${status === "open" ? "changes" : "approved"}`}>
          {requestStatus(reader, status)}
        </span>
        <span className="muted">
          {" "}
          · {item.authorName || t("Client", "Client")} · {shortDate(item.createdAt)}
        </span>
      </p>
      {item.title && (
        <strong dir="auto" className="request-title">
          {item.title}
        </strong>
      )}
      <p className="request-body" dir="auto">
        {item.body}
      </p>
      {item.answer && (
        <div className="note note-approve">
          <p className="small">
            <strong>{item.answeredBy || "Gecko"}</strong>
            {item.answeredAt && <span className="muted"> · {shortDate(item.answeredAt)}</span>}
          </p>
          <p className="note-body" dir="auto">
            {item.answer}
          </p>
        </div>
      )}
      {onAnswer && status !== "closed" && !answering && (
        <div className="concept-actions">
          <Button variant="secondary" onClick={() => setAnswering(true)}>
            {item.answer ? "Change the answer" : "Answer"}
          </Button>
          <Button
            variant="link"
            disabled={busy}
            onClick={() =>
              void run(() => onAnswer({ id: item.id, answer: item.answer, status: "closed" }))
            }
          >
            Close
          </Button>
        </div>
      )}
      {answering && (
        <form className="concept-form" onSubmit={onSubmit}>
          <TextArea
            label="Your answer (the client sees it)"
            name="answer"
            rows={3}
            maxLength={4000}
            defaultValue={item.answer}
            dir="auto"
            autoFocus
          />
          <div className="actions">
            <Button variant="secondary" onClick={() => setAnswering(false)} disabled={busy}>
              {t("Cancel", "Annuler")}
            </Button>
            <Button type="submit" disabled={busy}>
              Send answer
            </Button>
          </div>
        </form>
      )}
      {reader === "client" && item.mine && status === "open" && (
        <button
          type="button"
          className="line-comment"
          disabled={busy}
          onClick={() => void run(() => onRemove(item.id))}
        >
          {t("Withdraw", "Retirer")}
        </button>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </li>
  );
}
