import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { PLANS } from "@/features/plans/model";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { fullContent, money, type ProposalContent } from "./proposal";

interface Shared {
  brand: string;
  from: string;
  content: Partial<ProposalContent>;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedName: string | null;
}

const WORDS = {
  en: {
    for: "A proposal for",
    from: "from",
    goals: "What it should do",
    plan: "The plan",
    reels: "reels",
    included: "What's included",
    timeline: "How it goes",
    terms: "Payment and terms",
    accept: "Accept the proposal",
    name: "Your name",
    sign: "Accept",
    accepted: "Accepted by",
    thanks: "Thank you! Gecko will be in touch today to start.",
    until: "Valid until",
    gone: "This link has expired or isn't right. Ask Gecko for a new one.",
  },
  fr: {
    for: "Une proposition pour",
    from: "de la part de",
    goals: "Ce que ça doit apporter",
    plan: "L'offre",
    reels: "vidéos",
    included: "Ce qui est inclus",
    timeline: "Comment ça se passe",
    terms: "Paiement et conditions",
    accept: "Accepter la proposition",
    name: "Votre nom",
    sign: "Accepter",
    accepted: "Acceptée par",
    thanks: "Merci ! Gecko vous contacte aujourd'hui pour démarrer.",
    until: "Valable jusqu'au",
    gone: "Ce lien a expiré ou n'est pas le bon. Demandez-en un nouveau à Gecko.",
  },
} as const;

/** The proposal a brand opens from a link, without an account: /p/<token>. */
export function ProposalPage() {
  const { token = "" } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const page = useQuery({
    queryKey: ["proposal-link", token],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_proposal_by_link", {
        p_token: token,
      });
      if (error) throw error;
      return data as Shared;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().rpc("accept_proposal_by_link", {
        p_token: token,
        p_name: name,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposal-link", token] }),
  });

  if (page.isPending) return <main className="proposal-page" />;
  if (page.isError)
    return (
      <main className="proposal-page">
        <Logo />
        <Notice tone="error">
          {WORDS.fr.gone} · {WORDS.en.gone}
        </Notice>
      </main>
    );
  const d = page.data;
  const c = fullContent(d.content, { brand: d.brand, pack: null, value: null });
  const w = WORDS[c.lang];
  const plan = PLANS[c.plan];
  return (
    <main className="proposal-page" lang={c.lang}>
      <header>
        <Logo />
        <p className="small">
          {w.for} <strong>{d.brand}</strong> · {w.from} {d.from || "Gecko"}
        </p>
      </header>
      <h1>[ {d.brand} × Gecko ]</h1>
      <p className="proposal-intro" dir="auto">
        {c.intro}
      </p>
      {c.goals.length > 0 && (
        <section>
          <h2>{w.goals}</h2>
          <ul>
            {c.goals.map((g) => (
              <li key={g} dir="auto">
                {g}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="proposal-plan">
        <h2>{w.plan}</h2>
        <p className="proposal-price">
          <strong>{plan.label}</strong>
          {c.reels != null && (
            <span>
              {" "}
              · {c.reels} {w.reels}
            </span>
          )}
          <span className="proposal-amount">{money(c.price, c.lang)}</span>
        </p>
        {c.included.length > 0 && (
          <>
            <h3>{w.included}</h3>
            <ul>
              {c.included.map((x) => (
                <li key={x} dir="auto">
                  {x}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {c.timeline.length > 0 && (
        <section>
          <h2>{w.timeline}</h2>
          <ol>
            {c.timeline.map((x) => (
              <li key={x} dir="auto">
                {x}
              </li>
            ))}
          </ol>
        </section>
      )}
      {c.terms && (
        <section>
          <h2>{w.terms}</h2>
          <p dir="auto">{c.terms}</p>
        </section>
      )}
      <section className="proposal-accept">
        {d.acceptedAt ? (
          <p>
            <strong>
              {w.accepted} {d.acceptedName}
            </strong>{" "}
            · {new Date(d.acceptedAt).toLocaleDateString(c.lang === "fr" ? "fr-FR" : "en-GB")}
            <br />
            {w.thanks}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate();
            }}
          >
            <h2>{w.accept}</h2>
            <label>
              <span className="small">{w.name}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                minLength={2}
              />
            </label>
            <Button type="submit" disabled={accept.isPending || name.trim().length < 2}>
              {w.sign}
            </Button>
            {accept.isError && <Notice tone="error">{friendlyError(accept.error)}</Notice>}
            <p className="small muted">
              {w.until}{" "}
              {new Date(d.expiresAt).toLocaleDateString(c.lang === "fr" ? "fr-FR" : "en-GB")}
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
