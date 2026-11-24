// The client chooses who's in it, where it's shot, what's in frame and a note, on each idea and each script.
// Talent shows with photos; the set list and the approved places are one choice; props are chips.
import { useState } from "react";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { toast } from "@/components/Toast";
import type { ClientPortal } from "@/features/auth/account";
import { useImageUrl } from "@/features/board/boardApi";
import { PHOTO_BUCKET, useMyProduction } from "@/features/production/productionApi";
import type { ProductionOption } from "@/features/production/model";
import { useClientRole } from "@/features/portal/role";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { previewRole } from "@/lib/preview";
import { hasPicks, NO_PICKS, useMyPicks, useSavePicks, type Picks, type SetRow } from "./picksApi";

export function Face({
  path,
  name,
  size = 40,
}: {
  path?: string | undefined;
  name: string;
  size?: number;
}) {
  const url = useImageUrl(path, PHOTO_BUCKET);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="pk-face" style={{ width: size, height: size }} aria-hidden="true">
      {url.data ? <img src={url.data} alt="" loading="lazy" /> : <span>{initials}</span>}
    </span>
  );
}

const usable = (o: ProductionOption) => o.status !== "passed" && o.status !== "suggested";

/** The line under an idea or a script: what the client picked, and the button to choose. */
export function ClientPicks({
  portal,
  kind,
  id,
}: {
  portal: ClientPortal;
  kind: "concept" | "script";
  id: string;
}) {
  const role = useClientRole();
  const mine = useMyPicks(portal);
  const production = useMyProduction(portal);
  const [open, setOpen] = useState(false);
  const picks = (kind === "concept" ? mine.data?.concepts[id] : mine.data?.scripts[id]) ?? NO_PICKS;
  const options = (production.data?.options ?? []).filter(usable);
  const talent = options.filter((o) => o.kind === "talent");
  const places = options.filter((o) => o.kind === "location");
  const props = options.filter((o) => o.kind === "prop");
  const sets = mine.data?.sets ?? [];
  const canPick = role !== "viewer" && !previewRole();
  if (!canPick && !hasPicks(picks)) return null;
  if (talent.length + places.length + props.length + sets.length === 0 && !hasPicks(picks))
    return null;

  const chosenTalent = talent.filter((o) => picks.talent.includes(o.id));
  const where =
    sets.find((s) => s.id === picks.set)?.name ??
    places.find((o) => o.id === picks.location)?.name ??
    null;
  const chosenProps = props.filter((o) => picks.props.includes(o.id));

  return (
    <div className="pk-line">
      {hasPicks(picks) ? (
        <div className="pk-summary">
          {chosenTalent.length > 0 && (
            <span className="pk-faces">
              {chosenTalent.map((o) => (
                <Face key={o.id} path={o.photos[0]} name={o.name} size={28} />
              ))}
              <span>{chosenTalent.map((o) => o.name).join(", ")}</span>
            </span>
          )}
          {where && <span className="pk-where">{where}</span>}
          {chosenProps.length > 0 && (
            <span className="pk-props">{chosenProps.map((o) => o.name).join(", ")}</span>
          )}
          {picks.note && <span className="pk-note">&ldquo;{picks.note}&rdquo;</span>}
        </div>
      ) : (
        <span className="pk-empty">
          {t(
            "Who's in it, where, and with what: your call.",
            "Qui joue, où, avec quoi : à vous de choisir.",
          )}
        </span>
      )}
      {canPick && (
        <button type="button" className="pk-open" onClick={() => setOpen(true)}>
          {hasPicks(picks)
            ? t("Change", "Modifier")
            : t("Choose talent, set & props", "Choisir talents, décor et accessoires")}
        </button>
      )}
      {open && (
        <PicksSheet
          portal={portal}
          kind={kind}
          id={id}
          start={picks}
          talent={talent}
          places={places}
          props={props}
          sets={sets}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PicksSheet({
  portal,
  kind,
  id,
  start,
  talent,
  places,
  props,
  sets,
  onClose,
}: {
  portal: ClientPortal;
  kind: "concept" | "script";
  id: string;
  start: Picks;
  talent: ProductionOption[];
  places: ProductionOption[];
  props: ProductionOption[];
  sets: SetRow[];
  onClose: () => void;
}) {
  const save = useSavePicks(portal);
  const [p, setP] = useState<Picks>(start);
  const toggle = (list: string[], x: string) =>
    list.includes(x) ? list.filter((y) => y !== x) : [...list, x];

  async function done() {
    try {
      await save.mutateAsync({ kind, id, picks: p });
      toast({ text: t("Saved. Gecko sees your picks.", "Enregistré. Gecko voit vos choix.") });
      onClose();
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  return (
    <Sheet
      wide
      title={
        kind === "concept"
          ? t("Your picks for this idea", "Vos choix pour cette idée")
          : t("Your picks for this script", "Vos choix pour ce script")
      }
      sub={t(
        "Choose from what Gecko proposed. Gecko confirms availability before the shoot.",
        "Choisissez parmi ce que Gecko a proposé. Gecko confirme les disponibilités avant le tournage.",
      )}
      onClose={onClose}
    >
      <div className="pk">
        {talent.length > 0 && (
          <section className="pk-sec">
            <h3>{t("Talent", "Talents")}</h3>
            <div className="pk-talent">
              {talent.map((o) => {
                const on = p.talent.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className="pk-person"
                    aria-pressed={on}
                    onClick={() => setP({ ...p, talent: toggle(p.talent, o.id) })}
                  >
                    <PersonPhoto option={o} />
                    <span className="pk-name">{o.name}</span>
                    {o.role && <span className="pk-role">{o.role}</span>}
                    {o.status === "approved" || o.status === "booked" ? (
                      <span className="pk-ok">{t("Approved", "Validé")}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {sets.length + places.length > 0 && (
          <section className="pk-sec">
            <h3>{t("Set", "Décor")}</h3>
            <div className="pk-sets">
              {sets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="pk-set"
                  aria-pressed={p.set === s.id}
                  onClick={() => setP({ ...p, set: p.set === s.id ? null : s.id, location: null })}
                >
                  <span className="pk-name">{s.name}</span>
                  {s.notes && <span className="pk-role">{s.notes}</span>}
                </button>
              ))}
              {places.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="pk-set has-photo"
                  aria-pressed={p.location === o.id}
                  onClick={() =>
                    setP({ ...p, location: p.location === o.id ? null : o.id, set: null })
                  }
                >
                  <PersonPhoto option={o} />
                  <span className="pk-name">{o.name}</span>
                  {o.role && <span className="pk-role">{o.role}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {props.length > 0 && (
          <section className="pk-sec">
            <h3>{t("Props", "Accessoires")}</h3>
            <div className="pk-chips">
              {props.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={p.props.includes(o.id)}
                  onClick={() => setP({ ...p, props: toggle(p.props, o.id) })}
                >
                  {o.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="pk-sec">
          <h3>{t("Note for Gecko", "Note pour Gecko")}</h3>
          <textarea
            rows={3}
            maxLength={1000}
            value={p.note}
            placeholder={t(
              "Morning light, the white towels, no logo on the bottle…",
              "Lumière du matin, les serviettes blanches, pas de logo sur la bouteille…",
            )}
            onChange={(e) => setP({ ...p, note: e.target.value })}
          />
        </section>

        <footer className="pk-foot">
          <Button variant="link" onClick={() => setP(NO_PICKS)}>
            {t("Clear", "Tout effacer")}
          </Button>
          <Button disabled={save.isPending} onClick={() => void done()}>
            {t("Save my picks", "Enregistrer mes choix")}
          </Button>
        </footer>
      </div>
    </Sheet>
  );
}

function PersonPhoto({ option }: { option: ProductionOption }) {
  const url = useImageUrl(option.photos[0], PHOTO_BUCKET);
  return (
    <span className="pk-photo" aria-hidden="true">
      {url.data ? (
        <img src={url.data} alt="" loading="lazy" />
      ) : (
        <span>
          {option.name
            .split(/\s+/)
            .map((w) => w[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
