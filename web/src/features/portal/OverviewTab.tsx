import { byClient } from "@/features/scripts/model";
import { Link } from "react-router-dom";
import { countByStatus, shortDate } from "@/features/concepts/model";
import type { SheetTarget } from "@/features/onboarding/useOnboardingSheet";
import { dt, paymentLines, stateLabel, useOnboardingStatus, type PortalData } from "./portalApi";
import { getLang, t } from "@/lib/i18n";
import { tw, words } from "@/lib/wording";
import { PortalHeader, Progress, StageTracker } from "./HomeParts";
import { currentStage } from "./stage";
import { seesMoney, useClientRole, type ClientRole } from "./role";
import type { ProductionOption } from "@/features/production/model";
import { useMyProduction } from "@/features/production/productionApi";
import type { CutsPage } from "@/features/review/model";
import { useMyCuts } from "@/features/review/reviewApi";
import { useMyInvoices } from "@/features/invoices/invoicesApi";
import { money, unpaid, type Invoice } from "@/features/invoices/model";

interface Todo {
  to: string;
  title: string;
  detail: string;
}

/** Everything that waits on the client, most useful first. */
function waitingOnYou(
  data: PortalData,
  sentAt: string | null,
  onboardingLoaded: boolean,
  production: ProductionOption[],
  role: ClientRole,
  cuts: CutsPage | undefined,
  invoices: Invoice[],
): Todo[] {
  const todo: Todo[] = [];
  // An invoice past its due date comes first: it's the one thing that can hold up the finals.
  const late = invoices.filter((i) => i.status === "sent" && i.overdue);
  const toPay = unpaid(invoices);
  if (toPay.length > 0)
    todo.push({
      to: "/money",
      title: late.length
        ? t(
            late.length === 1 ? "An invoice is past due" : `${late.length} invoices are past due`,
            late.length === 1
              ? "Une facture est en retard"
              : `${late.length} factures sont en retard`,
          )
        : t(
            toPay.length === 1 ? "An invoice is waiting" : `${toPay.length} invoices are waiting`,
            toPay.length === 1
              ? "Une facture vous attend"
              : `${toPay.length} factures vous attendent`,
          ),
      detail: t(
        `${money(
          toPay.reduce((s, i) => s + Number(i.total), 0),
          getLang(),
        )} to pay. Open it to download the PDF.`,
        `${money(
          toPay.reduce((s, i) => s + Number(i.total), 0),
          getLang(),
        )} à régler. Ouvrez-la pour télécharger le PDF.`,
      ),
    });
  const toWatch = cuts?.cuts.filter((c) => c.status === "review").length ?? 0;
  if (toWatch > 0)
    todo.push({
      to: "/review",
      title: tw(
        [
          toWatch === 1 ? "A reel is ready to watch" : `${toWatch} reels are ready to watch`,
          toWatch === 1
            ? "Une vidéo est prête à regarder"
            : `${toWatch} vidéos sont prêtes à regarder`,
        ],
        [
          toWatch === 1 ? "A film is ready to watch" : `${toWatch} films are ready to watch`,
          toWatch === 1 ? "Un film est prêt à regarder" : `${toWatch} films sont prêts à regarder`,
        ],
      ),
      detail: t(
        "Pause anywhere to leave a note on that moment, then approve.",
        "Mettez sur pause n'importe où pour laisser une note sur ce moment, puis validez.",
      ),
    });
  const finals = cuts?.balancePaid ? cuts.cuts.filter((c) => c.finalLink).length : 0;
  if (finals > 0 && toWatch === 0)
    todo.push({
      to: "/delivery",
      title: t(
        finals === 1 ? "Your final file is ready" : `${finals} final files are ready`,
        finals === 1 ? "Votre fichier final est prêt" : `${finals} fichiers finaux sont prêts`,
      ),
      detail: t("Clean, without the watermark.", "Propres, sans filigrane."),
    });
  const scripts = data.scripts.filter((s) => s.status === "review" && !byClient(s)).length;
  const ideas = countByStatus(data.concepts).review;
  if (scripts > 0)
    todo.push({
      to: "/scripts",
      title:
        scripts === 1
          ? tw(
              ["A script is ready for you", "Un script vous attend"],
              ["A treatment is ready for you", "Une note d'intention vous attend"],
            )
          : tw(
              [`${scripts} scripts are ready for you`, `${scripts} scripts vous attendent`],
              [
                `${scripts} treatments are ready for you`,
                `${scripts} notes d'intention vous attendent`,
              ],
            ),
      detail: tw(
        [
          "Pick the hook you like, comment on any line, then approve.",
          "Choisissez l'accroche qui vous plaît, commentez n'importe quelle ligne, puis validez.",
        ],
        [
          "Read it, comment on any line, then approve.",
          "Lisez-la, commentez n'importe quelle ligne, puis validez.",
        ],
      ),
    });
  const yoursBack = data.scripts.filter((s) => s.status === "changes" && byClient(s)).length;
  if (yoursBack > 0 && role !== "viewer" && role !== "finance")
    todo.push({
      to: "/scripts",
      title: tw(
        ["Gecko suggested changes to your script", "Gecko propose des changements à votre script"],
        [
          "Gecko suggested changes to your treatment",
          "Gecko propose des changements à votre note d'intention",
        ],
      ),
      detail: t(
        "Read the note, then edit and send it back.",
        "Lisez la note, puis modifiez et renvoyez.",
      ),
    });
  if (ideas > 0)
    todo.push({
      to: "/concepts",
      title:
        ideas === 1
          ? tw(
              ["An idea is waiting for you", "Une idée vous attend"],
              ["A concept is waiting for you", "Un concept vous attend"],
            )
          : tw(
              [`${ideas} ideas are waiting for you`, `${ideas} idées vous attendent`],
              [`${ideas} concepts are waiting for you`, `${ideas} concepts vous attendent`],
            ),
      detail: t(
        "Approve the ones you like or tell us what to change.",
        "Validez celles qui vous plaisent ou dites-nous quoi changer.",
      ),
    });
  if (role !== "viewer")
    for (const [kind, to] of [
      ["talent", "/talent"],
      ["location", "/locations"],
      ["prop", "/budget"],
    ] as const) {
      const n = production.filter((o) => o.kind === kind && o.status === "proposed").length;
      if (n === 0) continue;
      todo.push({
        to,
        title:
          kind === "talent"
            ? tw(
                [
                  n === 1 ? "A talent to approve" : `${n} talent profiles to approve`,
                  n === 1 ? "Un talent à valider" : `${n} talents à valider`,
                ],
                [
                  n === 1 ? "A cast member to approve" : `${n} cast members to approve`,
                  n === 1 ? "Un profil de casting à valider" : `${n} profils de casting à valider`,
                ],
              )
            : kind === "location"
              ? tw(
                  [
                    n === 1 ? "A location to approve" : `${n} locations to approve`,
                    n === 1 ? "Un lieu à valider" : `${n} lieux à valider`,
                  ],
                  [
                    n === 1 ? "A set to approve" : `${n} sets to approve`,
                    n === 1 ? "Un décor à valider" : `${n} décors à valider`,
                  ],
                )
              : t(
                  n === 1 ? "A prop to approve" : `${n} props to approve`,
                  n === 1 ? "Un accessoire à valider" : `${n} accessoires à valider`,
                ),
        detail: t(
          "Each one shows its cost against your production budget.",
          "Chacun affiche son coût par rapport à votre budget de production.",
        ),
      });
    }
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
  // Once Gecko sends invoices, they say what's due; the plan's halves would repeat them with other numbers.
  if (o?.price != null && invoices.length === 0) {
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
  const onboarding = useOnboardingStatus(target);
  const counts = countByStatus(data.concepts);
  const o = data.overview;
  const first = data.me.split(/\s+/)[0] || data.me;
  const role = useClientRole();
  const production = useMyProduction(target);
  const cuts = useMyCuts(target);
  const invoices = useMyInvoices(target, seesMoney(role));
  const todo = waitingOnYou(
    data,
    onboarding.data?.sentAt ?? null,
    onboarding.isSuccess,
    production.data?.options ?? [],
    role,
    cuts.data,
    invoices.data ?? [],
  );
  const scriptsReworked = data.scripts.filter((s) => s.status === "changes" && !byClient(s)).length;
  const doing = [
    counts.changes > 0 &&
      t(
        `Reworking ${counts.changes} ${words.ideaPlural(counts.changes)} from your notes.`,
        `On retravaille ${counts.changes} ${words.ideaPlural(counts.changes)} d'après vos notes.`,
      ),
    scriptsReworked > 0 &&
      t(
        `Reworking ${scriptsReworked} ${words.scriptPlural(scriptsReworked)} from your notes.`,
        `On retravaille ${scriptsReworked} ${words.scriptPlural(scriptsReworked)} d'après vos notes.`,
      ),
  ].filter((line): line is string => Boolean(line));

  const stage = currentStage(
    o?.shootDate ?? null,
    data.scripts.filter((x) => x.status === "approved").length + counts.approved,
    new Date(),
    {
      sent: cuts.data?.cuts.length ?? 0,
      delivered: cuts.data?.cuts.filter((c) => c.delivered).length ?? 0,
    },
  );

  return (
    <section className="tab-body home">
      <PortalHeader
        brand={data.brand}
        logo={data.logo}
        cover={data.cover}
        campaign={o?.campaign}
        stage={stage}
      />
      <StageTracker
        stage={stage}
        shootDate={o?.shootDate ?? null}
        shootPlace={o?.shootPlace ?? ""}
      />

      <h2 className="waiting-title">
        {t(`${first}, here's what needs you`, `${first}, voici ce qui vous attend`)}
      </h2>
      {todo.length === 0 ? (
        <p className="waiting-none">
          {t(
            "Nothing right now. When Gecko sends something to read or approve, it shows up here first.",
            "Rien pour l'instant. Quand Gecko vous envoie quelque chose à lire ou à valider, ça s'affiche ici en premier.",
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

      <Progress plan={o?.plan ?? "custom"} reels={o?.reels ?? null} scripts={data.scripts} />

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
            "Gecko is putting your campaign plan together: dates, what's included and the steps. It lands here as soon as it's ready.",
            "Gecko prépare le plan de votre campagne : les dates, ce qui est inclus et les étapes. Il arrive ici dès qu'il est prêt.",
          )}
        </p>
      ) : (
        <>
          {o.summary && (
            <div className="block">
              <h2>{t("The plan", "Le plan")}</h2>
              <p className="pre">{o.summary}</p>
            </div>
          )}

          {(o.included.length > 0 || o.nextStep) && (
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
              {o.nextStep && (
                <div className="fact fact-next">
                  <span className="eyebrow">{t("Next step", "Prochaine étape")}</span>
                  <strong>{o.nextStep}</strong>
                </div>
              )}
            </div>
          )}

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
                {(invoices.data?.length ?? 0) > 0 && (
                  <>
                    {" "}
                    <Link to="/money">{t("See your invoices", "Voir vos factures")}</Link>
                  </>
                )}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
