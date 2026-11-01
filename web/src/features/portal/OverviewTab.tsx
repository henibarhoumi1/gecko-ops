import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { countByStatus, shortDate } from "@/features/concepts/model";
import { ReelStrip } from "@/features/plans/ReelStrip";
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

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
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
      title: scripts === 1 ? "A script is ready for you" : `${scripts} scripts are ready for you`,
      detail: "Pick the hook you like, comment on any line, then approve.",
    });
  if (ideas > 0)
    todo.push({
      to: "/concepts",
      title: ideas === 1 ? "An idea is waiting for you" : `${ideas} ideas are waiting for you`,
      detail: "Approve the ones you like or tell us what to change.",
    });
  if (onboardingLoaded && !sentAt)
    todo.push({
      to: "/onboarding",
      title: "Tell us about your brand",
      detail: "About 15 minutes. It saves as you go, so you can stop and come back.",
    });
  const o = data.overview;
  if (o?.price != null) {
    const half = dt(Math.round(o.price * 500) / 1000);
    if (o.depositStatus === "due")
      todo.push({
        to: "/#payment",
        title: `Deposit of ${half}`,
        detail: "It books your shoot day.",
      });
    else if (o.balanceStatus === "due")
      todo.push({
        to: "/#payment",
        title: `Balance of ${half}`,
        detail: "Your final files unlock as soon as it's in.",
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
    counts.changes > 0 && `Reworking ${plural(counts.changes, "idea")} from your notes.`,
    scriptsReworked > 0 && `Reworking ${plural(scriptsReworked, "script")} from your notes.`,
  ].filter((line): line is string => Boolean(line));

  return (
    <section className="tab-body">
      <p className="lede">
        Welcome, {first}. This is where your campaign lives: what needs you, what Gecko is working
        on, and the plan.
      </p>

      <h2 className="waiting-title">Waiting on you</h2>
      {todo.length === 0 ? (
        <p className="waiting-none">
          Nothing needs you right now. We'll show it here when it does.
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
          <h2>What Gecko is doing</h2>
          <ul className="doing">
            {doing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}

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
            <div className="block" id="payment">
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
