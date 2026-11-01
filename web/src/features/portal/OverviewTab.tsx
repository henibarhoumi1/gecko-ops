import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { countByStatus, shortDate } from "@/features/concepts/model";
import { percentFilled, type Answers } from "@/features/onboarding/progress";
import type { SheetTarget } from "@/features/onboarding/useOnboardingSheet";
import { requireSupabase } from "@/lib/supabase";
import { dt, paymentLines, type PortalData } from "./portalApi";

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
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function OverviewTab({ data, target }: { data: PortalData; target: SheetTarget }) {
  const onboarding = useOnboardingPercent(target);
  const counts = countByStatus(data.concepts);
  const o = data.overview;
  const first = data.me.split(/\s+/)[0] || data.me;

  return (
    <section className="tab-body">
      <p className="lede">
        Welcome, {first}. This is where your campaign lives: what's included, the plan, and every
        concept for you to approve.
      </p>

      <div className="todo">
        <Link to="/onboarding" className="todo-card">
          <span className="eyebrow">Onboarding</span>
          <strong>
            {onboarding.data?.sentAt
              ? "Sent to Gecko"
              : onboarding.data
                ? `${onboarding.data.pct}% filled`
                : "Tell us about your brand"}
          </strong>
          <span className="small muted">
            {onboarding.data?.sentAt
              ? "You can still add to it."
              : "About 15 minutes. It saves as you go."}
          </span>
        </Link>
        <Link to="/concepts" className="todo-card">
          <span className="eyebrow">Concepts</span>
          <strong>
            {counts.review
              ? `${counts.review} waiting for your approval`
              : counts.changes
                ? `Reworking ${counts.changes} for you`
                : counts.approved
                  ? `${counts.approved} approved`
                  : "Coming soon"}
          </strong>
          <span className="small muted">
            {counts.review
              ? "Approve them, ask for changes, or add your own ideas."
              : counts.changes
                ? "The new version comes back here for your OK."
                : counts.approved
                  ? "Have an idea of your own? Add it any time."
                  : "The first ideas land here for you to approve."}
          </span>
        </Link>
      </div>

      {!o ? (
        <p className="muted">Gecko is setting up your campaign plan. It will show here shortly.</p>
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
                <span className="eyebrow">What's included</span>
                <ul>
                  {o.included.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="fact">
              <span className="eyebrow">Shoot</span>
              <strong>{o.shootDate ? longDate(o.shootDate) : "Date to be confirmed"}</strong>
              {o.shootPlace && <span className="muted">{o.shootPlace}</span>}
            </div>
            {o.nextStep && (
              <div className="fact fact-next">
                <span className="eyebrow">Next step</span>
                <strong>{o.nextStep}</strong>
              </div>
            )}
          </div>

          {o.milestones.length > 0 && (
            <div className="block">
              <h2>Timeline</h2>
              <ol className="timeline">
                {o.milestones.map((m, i) => (
                  <li key={i} className={m.done ? "done" : ""}>
                    <span className="dot" aria-hidden="true" />
                    <span>{m.label}</span>
                    <span className="muted small">
                      {m.done ? "Done" : m.date ? shortDate(m.date) : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {o.price != null && (
            <div className="block">
              <h2>Payment</h2>
              <table className="pay">
                <tbody>
                  <tr>
                    <th scope="row">Total</th>
                    <td>{dt(o.price)}</td>
                    <td />
                  </tr>
                  {paymentLines(o).map((line) => (
                    <tr key={line.label}>
                      <th scope="row">{line.label}</th>
                      <td>{line.amount == null ? "" : dt(line.amount)}</td>
                      <td>
                        <span className={`pill pill-${line.state.toLowerCase()}`}>
                          {line.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted">Final files are delivered once the balance is paid.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
