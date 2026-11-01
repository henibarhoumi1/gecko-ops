import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { countByStatus, shortDate } from "@/features/concepts/model";
import { ReelStrip } from "@/features/plans/ReelStrip";
import { percentFilled, type Answers } from "@/features/onboarding/progress";
import type { SheetTarget } from "@/features/onboarding/useOnboardingSheet";
import { requireSupabase } from "@/lib/supabase";
import { dt, paymentLines, stateLabel, type PortalData } from "./portalApi";
import { locale, plural, t } from "@/lib/i18n";

function useOnboardingPercent(target: SheetTarget) {
  return useQuery({
    queryKey: ["onboarding-pct", target.workspaceId, target.clientId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_client_onboarding", {
        p_workspace_id: target.workspaceId,
        p_client_id: target.clientId,
      });
      if (error) throw error;
      const row = data as { data: Answers; sentAt: string | null };
      return { pct: percentFilled(row.data ?? {}), sentAt: row.sentAt };
    },
  });
}

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface Todo {
  to: string;
  title: string;
  detail: string;
}

/** Everything that waits on the client, most useful first. */
function waitingOnYou(data: PortalData, sentAt: string | null, onboardingLoaded: boolean): Todo[] {
  const todo: Todo[] = [];
  const scripts = data.scripts.filter((s) => s.status === "review").length;
  const ideas = countByStatus(data.concepts).review;
  if (scripts > 0)
    todo.push({
      to: "/scripts",
      title:
        scripts === 1
          ? t("A script is ready for you", "Un script vous attend")
          : t(`${scripts} scripts are ready for you`, `${scripts} scripts vous attendent`),
      detail: t(
        "Pick the hook you like, comment on any line, then approve.",
        "Choisissez l'accroche qui vous plaît, commentez n'importe quelle ligne, puis validez.",
      ),
    });
  if (ideas > 0)
    todo.push({
      to: "/concepts",
      title:
        ideas === 1
          ? t("An idea is waiting for you", "Une idée vous attend")
          : t(`${ideas} ideas are waiting for you`, `${ideas} idées vous attendent`),
      detail: t(
        "Approve the ones you like or tell us what to change.",
        "Validez celles qui vous plaisent ou dites-nous quoi changer.",
      ),
    });
  if (onboardingLoaded && !sentAt)
    todo.push({
      to: "/onboarding",
      title: t("Tell us about your brand", "Parlez-nous de votre marque"),
      detail: t(
        "About 15 minutes. It saves as you go, so you can stop and come back.",
        "Environ 15 minutes. C'est enregistré au fur et à mesure : vous pouvez faire une pause et revenir.",
      ),
    });
  const o = data.overview;
  if (o?.price != null) {
    const half = dt(Math.round(o.price * 500) / 1000);
    if (o.depositStatus === "due")
      todo.push({
        to: "/#payment",
        title: t(`Deposit of ${half}`, `Acompte de ${half}`),
        detail: t("It books your shoot day.", "Il réserve votre jour de tournage."),
      });
    else if (o.balanceStatus === "due")
      todo.push({
        to: "/#payment",
        title: t(`Balance of ${half}`, `Solde de ${half}`),
        detail: t(
          "Your final files unlock as soon as it's in.",
          "Vos fichiers finaux se débloquent dès qu'il est reçu.",
        ),
      });
  }
  return todo;
}

export function OverviewTab({ data, target }: { data: PortalData; target: SheetTarget }) {
  const onboarding = useOnboardingPercent(target);
  const counts = countByStatus(data.concepts);
  const o = data.overview;
  const first = data.me.split(/\s+/)[0] || data.me;
  const todo = waitingOnYou(data, onboarding.data?.sentAt ?? null, onboarding.isSuccess);
  const scriptsReworked = data.scripts.filter((s) => s.status === "changes").length;
  const doing = [
    counts.changes > 0 &&
      t(
        `Reworking ${plural(counts.changes, ["idea", "ideas"], ["idée", "idées"])} from your notes.`,
        `On retravaille ${plural(counts.changes, ["idea", "ideas"], ["idée", "idées"])} d'après vos notes.`,
      ),
    scriptsReworked > 0 &&
      t(
        `Reworking ${plural(scriptsReworked, ["script", "scripts"], ["script", "scripts"])} from your notes.`,
        `On retravaille ${plural(scriptsReworked, ["script", "scripts"], ["script", "scripts"])} d'après vos notes.`,
      ),
  ].filter((line): line is string => Boolean(line));

  return (
    <section className="tab-body">
      <p className="lede">
        {t(
          `Welcome, ${first}. This is where your campaign lives: what needs you, what Gecko is working on, and the plan.`,
          `Bienvenue, ${first}. Votre campagne vit ici : ce qui vous attend, ce que Gecko prépare, et le plan.`,
        )}
      </p>

      <h2 className="waiting-title">{t("Waiting on you", "À vous de jouer")}</h2>
      {todo.length === 0 ? (
        <p className="waiting-none">
          {t(
            "Nothing needs you right now. We'll show it here when it does.",
            "Rien ne vous attend pour l'instant. Ça s'affichera ici le moment venu.",
          )}
        </p>
      ) : (
        <ul className="waiting">
          {todo.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="waiting-item">
                <strong>{item.title}</strong>
                <span className="small">{item.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {o?.reels ? (
        <ReelStrip
          plan={o.plan ?? "custom"}
          reels={o.reels}
          scripts={data.scripts}
          reader="client"
        />
      ) : null}

      {doing.length > 0 && (
        <>
          <h2>{t("What Gecko is doing", "Ce que fait Gecko")}</h2>
          <ul className="doing">
            {doing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}

      {!o ? (
        <p className="muted">
          {t(
            "Gecko is setting up your campaign plan. It will show here shortly.",
            "Gecko prépare le plan de votre campagne. Il s'affichera ici très bientôt.",
          )}
        </p>
      ) : (
        <>
          {(o.campaign || o.summary) && (
            <div className="block">
              {o.campaign && <h2>{o.campaign}</h2>}
              {o.summary && <p className="pre">{o.summary}</p>}
            </div>
          )}

          <div className="facts">
            {o.included.length > 0 && (
              <div className="fact">
                <span className="eyebrow">{t("What's included", "Ce qui est inclus")}</span>
                <ul>
                  {o.included.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="fact">
              <span className="eyebrow">{t("Shoot", "Tournage")}</span>
              <strong>
                {o.shootDate
                  ? longDate(o.shootDate)
                  : t("Date to be confirmed", "Date à confirmer")}
              </strong>
              {o.shootPlace && <span className="muted">{o.shootPlace}</span>}
            </div>
            {o.nextStep && (
              <div className="fact fact-next">
                <span className="eyebrow">{t("Next step", "Prochaine étape")}</span>
                <strong>{o.nextStep}</strong>
              </div>
            )}
          </div>

          {o.milestones.length > 0 && (
            <div className="block">
              <h2>{t("Timeline", "Calendrier")}</h2>
              <ol className="timeline">
                {o.milestones.map((m, i) => (
                  <li key={i} className={m.done ? "done" : ""}>
                    <span className="dot" aria-hidden="true" />
                    <span>{m.label}</span>
                    <span className="muted small">
                      {m.done ? t("Done", "Fait") : m.date ? shortDate(m.date) : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {o.price != null && (
            <div className="block" id="payment">
              <h2>{t("Payment", "Paiement")}</h2>
              <table className="pay">
                <tbody>
                  <tr>
                    <th scope="row">{t("Total", "Total")}</th>
                    <td>{dt(o.price)}</td>
                    <td />
                  </tr>
                  {paymentLines(o).map((line) => (
                    <tr key={line.label}>
                      <th scope="row">{line.label}</th>
                      <td>{line.amount == null ? "" : dt(line.amount)}</td>
                      <td>
                        <span className={`pill pill-${line.state.toLowerCase()}`}>
                          {stateLabel(line.state)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted">
                {t(
                  "Final files are delivered once the balance is paid.",
                  "Les fichiers finaux sont livrés une fois le solde payé.",
                )}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
