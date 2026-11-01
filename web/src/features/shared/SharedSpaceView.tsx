import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { shortDate } from "@/features/concepts/model";
import { friendlyError } from "@/lib/errors";
import { linkHost, type SharedItem, type SharedSpace } from "./sharedApi";

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
          ? "The space we both fill in. Your brand notes guide every script, references show us what you like, and requests are for anything that isn't about a script or a reel."
          : "Filled in by both sides. Every script gets checked against the brand notes. Requests from the client need an answer here."}
      </p>

      <BrandNotes reader={reader} notes={data.brandNotes} onSave={actions.saveNotes} />

      <div className="group">
        <h2>
          References <span className="count">{references.length}</span>
        </h2>
        <ReferenceForm reader={reader} onAdd={actions.addReference} />
        {references.length === 0 ? (
          <p className="muted">
            {reader === "client"
              ? "Drop in reels or ads you love, or ones you never want to look like."
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
          Requests{" "}
          {reader === "team" && openRequests.length > 0 && (
            <span className="badge">{openRequests.length} open</span>
          )}
        </h2>
        {actions.addRequest && <RequestForm onAdd={actions.addRequest} />}
        {requests.length === 0 ? (
          <p className="muted">
            {reader === "client"
              ? "A new product, a date that moved, a question for Heni: ask here and the answer stays with it."
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
        <h2>Brand notes</h2>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {notes.body ? "Edit" : "Write them"}
          </Button>
        )}
      </div>
      {editing ? (
        <form className="concept-form" onSubmit={onSubmit}>
          <TextArea
            label="Brand notes"
            name="body"
            rows={10}
            maxLength={8000}
            defaultValue={notes.body}
            dir="auto"
            autoFocus
            placeholder={
              "Words we use: …\nWords we never use: …\nClaims we can't make: …\nThe brand never: …\nAlways show: …"
            }
          />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="actions">
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save
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
              Last edited by {notes.updatedBy || "Gecko"} on {shortDate(notes.updatedAt)}
            </p>
          )}
        </>
      ) : (
        <p className="muted">
          {reader === "client"
            ? "Words you use and avoid, claims you can't make, what your brand never does. Every script gets checked against this."
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
    if (!url && !text("body")) return setError("Paste a link or write what you mean.");
    if (url && !/^https?:\/\/\S+$/i.test(url))
      return setError("Paste the full link, starting with https://");
    void run(
      () => onAdd({ title: text("title"), body: text("body"), url }),
      () => setOpen(false),
    );
  }

  if (!open)
    return (
      <p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Add a reference
        </Button>
      </p>
    );
  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <Field
        label="Link"
        name="url"
        type="url"
        placeholder="https://www.instagram.com/reel/…"
        autoFocus
      />
      <Field
        label="In a few words"
        name="title"
        maxLength={160}
        placeholder={
          reader === "client" ? "This hook, this light, never this" : "What to take from it"
        }
      />
      <TextArea
        label="Anything to add (optional)"
        name="body"
        rows={2}
        maxLength={4000}
        dir="auto"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          Add
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
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer noopener" className="ref-link">
          {linkHost(item.url)} ↗
        </a>
      )}
      {item.body && (
        <p className="small ref-body" dir="auto">
          {item.body}
        </p>
      )}
      <p className="small muted">
        {item.fromClient ? item.authorName || "Client" : `${item.authorName || "Gecko"}, Gecko`} ·{" "}
        {shortDate(item.createdAt)}
        {canRemove && (
          <>
            {" · "}
            <button
              type="button"
              className="line-comment"
              disabled={busy}
              onClick={() => void run(() => onRemove(item.id))}
            >
              Remove
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
    if (!body) return setError("Write what you need.");
    void run(
      () => onAdd({ title: String(form.get("title") ?? "").trim(), body }),
      () => setOpen(false),
    );
  }

  if (!open)
    return (
      <p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Ask for something
        </Button>
      </p>
    );
  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <Field label="Subject (optional)" name="title" maxLength={160} autoFocus />
      <TextArea label="What do you need?" name="body" rows={4} maxLength={4000} dir="auto" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          Send to Gecko
        </Button>
      </div>
    </form>
  );
}

const REQUEST_STATUS: Record<"client" | "team", Record<string, string>> = {
  client: { open: "With Gecko", answered: "Answered", closed: "Closed" },
  team: { open: "Needs an answer", answered: "Answered", closed: "Closed" },
};

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
          {REQUEST_STATUS[reader][status]}
        </span>
        <span className="muted">
          {" "}
          · {item.authorName || "Client"} · {shortDate(item.createdAt)}
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
              Cancel
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
          Withdraw
        </button>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </li>
  );
}
