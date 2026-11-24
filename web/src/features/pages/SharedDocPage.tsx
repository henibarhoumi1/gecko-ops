// A page or Gecko document opened from a share link (/doc/:token), no account needed. Read-only, on Gecko paper,
// printable; a quote or proposal shared "to accept" has an Accept box at the end.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { EmbedView } from "./BlockRow";
import { calculate, columnTotal, fmtNum, readBlocks, TEMPLATES, type Block } from "./blocks";

interface Shared {
  title: string;
  kind: "page" | "doc";
  template: string;
  blocks: Block[];
  updatedAt: string;
  brand: string | null;
  canAccept: boolean;
  acceptedAt: string | null;
  acceptedName: string | null;
}

export function SharedDocPage() {
  const { token = "" } = useParams();
  const doc = useQuery({
    queryKey: ["shared-doc", token],
    retry: false,
    queryFn: async (): Promise<Shared> => {
      const { data, error } = await requireSupabase().rpc("get_page_by_link", { p_token: token });
      if (error) throw error;
      const d = data as Omit<Shared, "blocks"> & { blocks: unknown };
      return { ...d, blocks: readBlocks(d.blocks) };
    },
  });
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState<{ at: string; name: string } | null>(null);
  const accept = useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().rpc("accept_page_by_link", {
        p_token: token,
        p_name: name,
      });
      if (error) throw error;
      const d = data as { acceptedAt: string; acceptedName: string };
      setAccepted({ at: d.acceptedAt, name: d.acceptedName });
    },
  });

  if (doc.isPending)
    return (
      <main className="shared-doc">
        <p className="loading">Loading</p>
      </main>
    );
  if (doc.isError)
    return (
      <main className="shared-doc shared-gone">
        <Logo className="paper-logo" />
        <h1>This link doesn&rsquo;t work any more.</h1>
        <p>Ask Gecko for a new one: contact@gecko-creative.com</p>
      </main>
    );
  const d = doc.data;
  const done = accepted ?? (d.acceptedAt ? { at: d.acceptedAt, name: d.acceptedName ?? "" } : null);
  const kindName = TEMPLATES.find((t) => t.key === d.template)?.name ?? "Document";
  const isDoc = d.kind === "doc";

  return (
    <main className="shared-doc">
      <div className="shared-bar no-print">
        <Button variant="secondary" onClick={() => window.print()}>
          Save as PDF
        </Button>
      </div>
      <article
        className={`paper tpl-${d.template || "blank"} shared-paper${isDoc ? " is-doc-paper" : ""}`}
      >
        {isDoc && (
          <header className="paper-cover">
            <div className="paper-cover-top">
              <Logo className="paper-logo" />
              <span className="paper-kind">{kindName}</span>
            </div>
            <div className="paper-cover-meta">
              {d.brand && <span>For {d.brand}</span>}
              <span>
                {new Date(d.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </header>
        )}
        <h1 className="shared-title" dir="auto">
          {d.title || "Untitled"}
        </h1>
        <div className="shared-blocks">
          {d.blocks.map((b, i) => (
            <BlockView key={b.id} b={b} n={numbered(d.blocks, i)} />
          ))}
        </div>
        {d.canAccept && (
          <section className="shared-accept">
            {done ? (
              <p className="shared-accepted">
                <strong>Accepted</strong> by {done.name},{" "}
                {new Date(done.at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . Thank you, we&rsquo;ll be in touch to book the shoot.
              </p>
            ) : (
              <form
                className="no-print"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  accept.mutate();
                }}
              >
                <h2>Accept this {kindName.toLowerCase()}</h2>
                <p className="small">Type your full name to accept. Gecko is told right away.</p>
                <div className="shared-accept-row">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={120}
                    aria-label="Your full name"
                    required
                  />
                  <Button type="submit" disabled={accept.isPending || !name.trim()}>
                    Accept
                  </Button>
                </div>
                {accept.isError && (
                  <p className="small shared-error">{friendlyError(accept.error)}</p>
                )}
              </form>
            )}
          </section>
        )}
        {isDoc && (
          <footer className="paper-foot">
            <Logo className="paper-foot-logo" />
            <span>Video ads that sell · Tunis</span>
            <span>gecko-creative.com</span>
            <span>contact@gecko-creative.com</span>
          </footer>
        )}
      </article>
    </main>
  );
}

function numbered(blocks: readonly Block[], i: number): number {
  let n = 0;
  for (let j = i; j >= 0 && blocks[j]?.type === "number"; j--) n++;
  return n;
}

function BlockView({ b, n }: { b: Block; n: number }) {
  const text = (
    <span className="sb-text" dir="auto">
      {b.text}
    </span>
  );
  switch (b.type) {
    case "h1":
      return <h2 className="sb sb-h1">{b.text}</h2>;
    case "h2":
      return <h3 className="sb sb-h2">{b.text}</h3>;
    case "h3":
      return <h4 className="sb sb-h3">{b.text}</h4>;
    case "divider":
      return <hr className="sb sb-divider" />;
    case "todo":
      return (
        <p className={`sb sb-todo${b.checked ? " is-checked" : ""}`}>
          <span className="sb-box" aria-hidden="true" />
          {text}
        </p>
      );
    case "bullet":
      return (
        <p className="sb sb-bullet">
          <span className="sb-mark">•</span>
          {text}
        </p>
      );
    case "number":
      return (
        <p className="sb sb-number">
          <span className="sb-mark">{n}.</span>
          {text}
        </p>
      );
    case "quote":
      return <blockquote className="sb sb-quote">{b.text}</blockquote>;
    case "callout":
      return <p className="sb sb-callout">{b.text}</p>;
    case "field":
      return (
        <p className="sb sb-field">
          <span className="sb-label">{b.label}</span>
          {text}
        </p>
      );
    case "table": {
      const rows = b.rows ?? [];
      const totals = (rows[0] ?? []).map((_, c) => columnTotal(rows, c));
      return (
        <div className="sb tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {(rows[0] ?? []).map((h, c) => (
                  <th key={c}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, i) => (
                <tr key={i}>
                  {r.map((v, c) => (
                    <td key={c} className={totals[c] !== null ? "is-num" : undefined}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals.some((t) => t !== null) && (
              <tfoot>
                <tr>
                  {totals.map((t, c) => (
                    <td key={c} className={t !== null ? "is-num" : undefined}>
                      {t !== null ? fmtNum(t) : c === 0 ? "Total" : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }
    case "calc": {
      const v = calculate(b.text);
      return (
        <p className="sb sb-calc">
          <span>{b.text}</span>
          {v !== null && <strong>= {fmtNum(v)}</strong>}
        </p>
      );
    }
    case "embed":
      return b.url ? (
        <figure className="sb blk-media">
          <EmbedView url={b.url} />
          {b.text && <figcaption>{b.text}</figcaption>}
        </figure>
      ) : null;
    case "image":
      return b.url ? (
        <figure className="sb blk-media">
          <img className="blk-img" src={b.url} alt={b.text} loading="lazy" />
          {b.text && <figcaption>{b.text}</figcaption>}
        </figure>
      ) : null;
    case "toggle":
      return (
        <details className="sb sb-toggle" open={b.open}>
          <summary>{b.text}</summary>
          {b.body && <p className="sb-text">{b.body}</p>}
        </details>
      );
    case "code":
      return <pre className="sb sb-code">{b.text}</pre>;
    default:
      return b.text ? (
        <p className="sb sb-p">{text}</p>
      ) : (
        <p className="sb sb-empty" aria-hidden="true" />
      );
  }
}
