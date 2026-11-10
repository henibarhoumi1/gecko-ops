import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase";
import {
  dayLabel,
  mapHref,
  nextReel,
  normaliseDay,
  progress,
  REEL_STATUSES,
  statusName,
  type ShootDay,
} from "./model";
import { Reader } from "./Reader";
import type { ReelChanges } from "./shootApi";

interface CrewDay {
  brand: string;
  who: string;
  day: ShootDay;
}

const cacheKey = (token: string) => `gecko.crewday.${token.slice(0, 16)}`;

function readCache(token: string): CrewDay | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(token));
    return raw ? (JSON.parse(raw) as CrewDay) : undefined;
  } catch {
    return undefined;
  }
}

/** The shoot day for crew without an account, opened from a day link: /day/<token>. */
export function CrewDayPage() {
  const { token = "" } = useParams();
  const queryClient = useQueryClient();
  const key = useMemo(() => ["crew-day", token], [token]);
  const [reading, setReading] = useState<string | null>(null);

  const page = useQuery({
    queryKey: key,
    queryFn: async (): Promise<CrewDay> => {
      const { data, error } = await requireSupabase().rpc("get_shoot_day_by_link", {
        p_token: token,
      });
      if (error) throw error;
      const o = (data ?? {}) as Record<string, unknown>;
      const result = {
        brand: typeof o.brand === "string" ? o.brand : "",
        who: typeof o.who === "string" ? o.who : "",
        day: normaliseDay(o.day),
      };
      try {
        localStorage.setItem(cacheKey(token), JSON.stringify(result));
      } catch {
        // Not kept on this phone.
      }
      return result;
    },
    initialData: () => readCache(token),
    initialDataUpdatedAt: 0,
    refetchInterval: 10_000,
    networkMode: "always",
    retry: 1,
  });

  const update = useMutation({
    mutationFn: async (input: { reelId: string; changes: ReelChanges }) => {
      queryClient.setQueryData<CrewDay>(key, (old) =>
        old
          ? {
              ...old,
              day: {
                ...old.day,
                reels: old.day.reels.map((r) =>
                  r.id === input.reelId ? { ...r, ...input.changes } : r,
                ),
              },
            }
          : old,
      );
      const { error } = await requireSupabase().rpc("update_shoot_reel_by_link", {
        p_token: token,
        p_id: input.reelId,
        p_changes: input.changes,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!page.data) {
    if (page.isError)
      return (
        <main className="page crew-day">
          <h1>{t("This link has ended", "Ce lien a expiré")}</h1>
          <p>
            {t(
              "Day links work until two days after the shoot. Ask Gecko for a new one.",
              "Les liens de tournage marchent jusqu'à deux jours après. Demandez-en un nouveau à Gecko.",
            )}
          </p>
        </main>
      );
    return <p className="loading">{t("Loading the shoot day…", "Chargement du tournage…")}</p>;
  }

  const { brand, who, day } = page.data;
  const p = progress(day.reels);
  const next = nextReel(day.reels);
  const map = mapHref(day);
  const readingReel = day.reels.find((r) => r.id === reading) ?? null;

  return (
    <main className="page crew-day shoot shoot-day">
      <p className="eyebrow">
        {brand} · {t("for", "pour")} {who}
      </p>
      <header className="shoot-head">
        <div>
          <h1 className="shoot-title" dir="auto">
            {day.title || t("Shoot day", "Tournage")}
          </h1>
          <p className="shoot-when">
            <span>{dayLabel(day.day)}</span>
            {day.callTime && (
              <span>
                {t("Call", "Convocation")} <strong>{day.callTime}</strong>
              </span>
            )}
            {day.wrapTime && (
              <span>
                {t("Wrap", "Fin")} <strong>{day.wrapTime}</strong>
              </span>
            )}
            {(day.place || day.address) && (
              <span dir="auto">
                {[day.place, day.address].filter(Boolean).join(", ")}
                {map && (
                  <>
                    {" "}
                    <a href={map} target="_blank" rel="noreferrer noopener">
                      {t("Map", "Plan")}
                    </a>
                  </>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="shoot-progress">
          <strong>
            {p.done}/{p.total}
          </strong>
          <span className="small">{t("reels shot", "vidéos tournées")}</span>
          <span className="shoot-bar">
            <span style={{ width: p.total ? `${(100 * p.done) / p.total}%` : "0%" }} />
          </span>
        </div>
      </header>
      {page.isError && (
        <p className="shoot-offline small">
          {t("No connection: the last copy on this phone.", "Pas de connexion : dernière copie.")}
        </p>
      )}
      {update.isError && <Notice tone="error">{friendlyError(update.error)}</Notice>}
      {next && (
        <div className="shoot-next">
          <div>
            <p className="eyebrow">
              {next.status === "shooting" ? t("Shooting now", "En cours") : t("Next up", "Ensuite")}
            </p>
            <strong dir="auto">{next.title}</strong>
          </div>
          <Button onClick={() => setReading(next.id)}>{t("Read", "Lire")}</Button>
        </div>
      )}
      {day.notes && (
        <p className="shoot-notes" dir="auto">
          {day.notes}
        </p>
      )}
      <ol className="shoot-reel-list">
        {day.reels.map((r, i) => (
          <li key={r.id} className={`shoot-reel status-${r.status}`}>
            <div className="shoot-reel-top">
              <span className="shoot-reel-n">{i + 1}</span>
              <div className="shoot-reel-what">
                <strong dir="auto">
                  {r.slot && <span className="shoot-slot">{r.slot}</span>}
                  {r.title}
                </strong>
                {(r.talent.length > 0 || r.set) && (
                  <span className="small" dir="auto">
                    {[r.talent.join(", "), r.set].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <Button variant="secondary" className="btn-small" onClick={() => setReading(r.id)}>
                {t("Read", "Lire")}
              </Button>
            </div>
            <div className="shoot-status" role="group" aria-label={t("Status", "Statut")}>
              {REEL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`shoot-status-btn s-${s}`}
                  aria-pressed={r.status === s}
                  onClick={() =>
                    r.status !== s && update.mutate({ reelId: r.id, changes: { status: s } })
                  }
                >
                  {statusName(s)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {readingReel && (
        <Reader
          key={readingReel.id}
          reel={readingReel}
          canTick
          hasNext={Boolean(nextReel(day.reels.filter((r) => r.id !== readingReel.id)))}
          onUpdate={(changes) => update.mutate({ reelId: readingReel.id, changes })}
          onNextReel={() =>
            setReading(nextReel(day.reels.filter((r) => r.id !== readingReel.id))?.id ?? null)
          }
          onClose={() => setReading(null)}
        />
      )}
    </main>
  );
}
