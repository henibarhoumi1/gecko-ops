import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import type { ClientPortal } from "@/features/auth/account";
import {
  ctaLine,
  tidyLines,
  tidyTreatment,
  TREATMENT_KEYS,
  treatmentLabel,
  type Script,
  type ScriptLine,
  type Treatment,
} from "@/features/scripts/model";
import { useClientWriteScript } from "@/features/scripts/scriptsApi";
import {
  AdParts,
  adDraft,
  draftBeats,
  draftCta,
  noWords,
  type AdDraft,
} from "@/features/scripts/AdParts";
import { DraftNotice } from "@/components/DraftNotice";
import type { Concept } from "@/features/concepts/model";
import { useDraft } from "@/lib/drafts";
import { BrandDrawer, useBrand } from "@/features/scripts/BrandDrawer";
import { useProvenHooks } from "@/features/results/ResultsExtras";
import { useMyShared } from "@/features/shared/sharedApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { isCinematic, tw } from "@/lib/wording";
import type { ShootPlan } from "@/features/scripts/model";
import { ShootPanel } from "@/features/writing/ShootPanel";
import { IdeaCard, LengthPicker } from "@/features/writing/WriteParts";
import { useClientShootChoices } from "@/features/writing/useShootChoices";
import { planCount, samePlan, tidyPlan } from "@/features/writing/shootPlan";

function treatmentHint(key: (typeof TREATMENT_KEYS)[number]): string {
  return {
    mood: t("Light, pace, the feeling it leaves", "Lumière, rythme, l'émotion qu'il laisse"),
    story: t("What happens, in a few lines", "Ce qui se passe, en quelques lignes"),
    music: t("A track, a genre, or silence", "Un morceau, un genre, ou le silence"),
    styling: t("Clothes, hair, colours, props", "Tenues, coiffure, couleurs, accessoires"),
    casting: t("Who we see on camera", "Qui on voit à l'écran"),
  }[key];
}

/**
 * The client's own script or treatment, asked as plain questions instead of the team's full editor.
 * Gecko approves it, asks for changes, or turns it into a proper script as a new version.
 */
export function WriteScript({
  portal,
  script,
  ideas = [],
  fromIdea,
  onDone,
}: {
  portal: ClientPortal;
  script?: Script;
  /** The client's ideas: the approved ones can be written from. */
  ideas?: readonly Concept[];
  /** Writing the script of this approved idea. */
  fromIdea?: string;
  onDone: () => void;
}) {
  const write = useClientWriteScript(portal);
  const space = useMyShared(portal);
  const brand = useBrand(portal.workspaceId, portal.clientId, space.data?.brandNotes.body);
  const proven = useProvenHooks(portal);
  const cine = isCinematic();
  const approved = ideas.filter((c) => c.status === "approved");
  const startIdea = approved.find((c) => c.id === fromIdea);
  // Kept on this device while writing: closing the tab doesn't lose it.
  const keep = useDraft(
    `script.${portal.clientId}.${script?.id ?? (startIdea ? `idea-${startIdea.id}` : "new")}`,
    () => {
      const seconds = script?.seconds ?? (cine ? 45 : 30);
      return {
        title: script?.title ?? startIdea?.title ?? "",
        conceptId: script?.conceptId ?? startIdea?.id ?? "",
        seconds,
        beats: script?.beats.length ? script.beats : ([{}, {}] as ScriptLine[]),
        // Everyone but film clients writes the ad in parts, the same way the team does.
        draft: adDraft(script, undefined, startIdea?.hook || undefined, seconds),
        // Who, where, with what: the script's own plan, or the idea's to start from.
        shoot: (script?.shoot ?? startIdea?.shoot ?? {}) as ShootPlan,
      };
    },
  );
  const { title, conceptId, seconds, beats, draft } = keep.value;
  const shoot: ShootPlan = keep.value.shoot ?? {};
  const choices = useClientShootChoices(portal, script?.projectId ?? null);
  const set = (patch: Partial<typeof keep.value>) => keep.setValue((v) => ({ ...v, ...patch }));
  const setDraft = (next: AdDraft) => set({ draft: next });
  const setSeconds = (n: number) => set({ seconds: n });
  const setBeats = (f: (list: ScriptLine[]) => ScriptLine[]) =>
    keep.setValue((v) => ({ ...v, beats: f(v.beats) }));
  const idea = approved.find((c) => c.id === conceptId);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!title.trim()) return setError(t("Give it a short title.", "Donnez-lui un titre court."));
    const hooks = cine
      ? tidyLines([{ see: text("hook-see"), hear: text("hook-hear") }])
      : tidyLines(draft.hooks);
    const treatment: Treatment = {};
    for (const key of TREATMENT_KEYS) treatment[key] = text(`t-${key}`);
    try {
      await write.mutateAsync({
        id: script?.id ?? null,
        title: title.trim(),
        seconds: seconds || 30,
        goal: script?.goal ?? "",
        hooks,
        beats: cine ? tidyLines(beats) : draftBeats(draft),
        cta: cine ? text("cta") : draftCta(draft),
        treatment: tidyTreatment(treatment),
        ...(cine ? {} : { style: draft.style }),
        ...(approved.length || script?.conceptId ? { conceptId: conceptId || null } : {}),
        // Sent only when it changed, so an untouched plan never costs a call.
        ...(samePlan(shoot, script?.shoot) ? {} : { shoot: tidyPlan(shoot) }),
      });
      keep.clear();
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const setBeat = (i: number, key: keyof ScriptLine, value: string) =>
    setBeats((list) => list.map((b, j) => (j === i ? { ...b, [key]: value } : b)));

  return (
    <form className="ws write-script" onSubmit={onSubmit}>
      <div className="ws-bar">
        <div className="ws-where">
          <strong>
            {script
              ? tw(
                  ["Edit the script", "Modifier le script"],
                  ["Edit the treatment", "Modifier la note d'intention"],
                )
              : tw(["Your script", "Votre script"], ["Your treatment", "Votre note d'intention"])}
          </strong>
          <span>
            {t(
              "Gecko reads it, then approves it or suggests changes.",
              "Gecko le lit, puis le valide ou propose des changements.",
            )}
          </span>
        </div>
        <div className="ws-actions">
          <Button variant="link" onClick={onDone} disabled={write.isPending}>
            {t("Cancel", "Annuler")}
          </Button>
          <Button type="submit" disabled={write.isPending}>
            {t("Send to Gecko", "Envoyer à Gecko")}
          </Button>
        </div>
      </div>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
      <div className="ws-grid">
        <div className="ws-main">
          <input
            className="ws-title"
            name="title"
            aria-label={t("Title", "Titre")}
            placeholder={tw(
              ["Untitled script", "Script sans titre"],
              ["Untitled treatment", "Note sans titre"],
            )}
            value={title}
            maxLength={160}
            onChange={(e) => set({ title: e.target.value })}
            autoFocus={!startIdea}
          />
          <div className="ws-meta">
            {(approved.length > 0 || idea) && (
              <Select
                label={t("Written from the idea", "Écrit à partir de l'idée")}
                name="concept"
                value={conceptId}
                onChange={(e) => {
                  const c = approved.find((x) => x.id === e.target.value);
                  set({
                    conceptId: e.target.value,
                    ...(c && !title.trim() ? { title: c.title } : {}),
                    ...(c?.hook && noWords(draft.hooks)
                      ? { draft: { ...draft, hooks: [{ hear: c.hook }, ...draft.hooks.slice(1)] } }
                      : {}),
                    ...(c?.shoot && planCount(shoot) === 0 ? { shoot: c.shoot } : {}),
                  });
                }}
                options={[
                  ["", t("No idea, a script of its own", "Aucune, un script à part")],
                  ...approved.map((c) => [c.id, c.title] as const),
                ]}
              />
            )}
            <LengthPicker value={seconds} onChange={setSeconds} />
          </div>
          {cine && (
            <fieldset className="write-part">
              <legend>{t("The treatment", "La note d'intention")}</legend>
              {TREATMENT_KEYS.map((key) => (
                <TextArea
                  key={key}
                  label={treatmentLabel(key)}
                  name={`t-${key}`}
                  rows={2}
                  maxLength={2000}
                  defaultValue={script?.treatment?.[key]}
                  placeholder={treatmentHint(key)}
                />
              ))}
            </fieldset>
          )}

          {cine ? (
            <>
              <fieldset className="write-part">
                <legend>{t("The opening shot", "Le plan d'ouverture")}</legend>
                <div className="row">
                  <TextArea
                    label={t("What we see", "Ce qu'on voit")}
                    name="hook-see"
                    rows={2}
                    maxLength={1000}
                    defaultValue={script?.hooks[0]?.see}
                  />
                  <TextArea
                    label={t("What we hear", "Ce qu'on entend")}
                    name="hook-hear"
                    rows={2}
                    maxLength={1000}
                    defaultValue={script?.hooks[0]?.hear}
                  />
                </div>
              </fieldset>

              <fieldset className="write-part">
                <legend>{t("The scenes", "Les scènes")}</legend>
                <ol className="write-beats">
                  {beats.map((beat, i) => (
                    <li key={i}>
                      <TextArea
                        label={t(`What we see, moment ${i + 1}`, `Ce qu'on voit, moment ${i + 1}`)}
                        rows={2}
                        maxLength={1000}
                        value={beat.see ?? ""}
                        onChange={(e) => setBeat(i, "see", e.target.value)}
                      />
                      <TextArea
                        label={t("What we hear", "Ce qu'on entend")}
                        rows={2}
                        maxLength={1000}
                        value={beat.hear ?? ""}
                        onChange={(e) => setBeat(i, "hear", e.target.value)}
                      />
                    </li>
                  ))}
                </ol>
                {beats.length < 40 && (
                  <Button variant="link" onClick={() => setBeats((list) => [...list, {}])}>
                    {t("+ Add a moment", "+ Ajouter un moment")}
                  </Button>
                )}
              </fieldset>

              <TextArea
                label={t("The final frame", "Le dernier plan")}
                name="cta"
                rows={2}
                maxLength={1000}
                defaultValue={ctaLine(script?.cta).hear}
                placeholder={t("The logo on white", "Le logo sur fond blanc")}
              />
            </>
          ) : (
            <>
              <BrandDrawer sheet={brand.sheet} never={brand.never} />
              <AdParts
                draft={draft}
                onChange={setDraft}
                seconds={seconds}
                never={brand.never}
                proven={proven}
                hookNote={t(
                  "write 1 to 3, Gecko helps pick",
                  "écrivez-en 1 à 3, Gecko aide à choisir",
                )}
              />
            </>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
        <div className="ws-rail">
          {idea && <IdeaCard title={idea.title} hook={idea.hook} body={idea.body} />}
          <ShootPanel
            choices={choices}
            plan={shoot}
            onChange={(next) => set({ shoot: next })}
            empty={t(
              "Gecko adds the talent, the sets and the props here. You'll pick them for each video.",
              "Gecko ajoute ici les talents, les décors et les accessoires. Vous les choisirez pour chaque vidéo.",
            )}
          />
        </div>
      </div>
    </form>
  );
}
