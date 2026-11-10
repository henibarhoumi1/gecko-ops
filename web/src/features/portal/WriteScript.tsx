import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
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

const LENGTHS = [9, 15, 20, 30, 45, 60, 90] as const;

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
      };
    },
  );
  const { title, conceptId, seconds, beats, draft } = keep.value;
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
    <form className="concept-form card write-script" onSubmit={onSubmit}>
      <h3>
        {script
          ? tw(
              ["Edit the script", "Modifier le script"],
              ["Edit the treatment", "Modifier la note d'intention"],
            )
          : tw(["Your script", "Votre script"], ["Your treatment", "Votre note d'intention"])}
      </h3>
      <p className="small muted">
        {tw(
          [
            "Write it the way you picture it. Gecko reads it, approves it or suggests changes, and may tighten it into a filmable version for you to approve.",
            "Écrivez-le comme vous l'imaginez. Gecko le lit, le valide ou propose des changements, et peut le resserrer en une version tournable à valider.",
          ],
          [
            "Describe the film the way you picture it. Gecko reads it, approves it or suggests changes, and may shape it into a shooting version for you to approve.",
            "Décrivez le film comme vous l'imaginez. Gecko le lit, le valide ou propose des changements, et peut en faire une version de tournage à valider.",
          ],
        )}
      </p>
      {keep.restored && <DraftNotice onDiscard={keep.discard} />}
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
            });
          }}
          options={[
            ["", t("No idea, a script of its own", "Aucune, un script à part")],
            ...approved.map((c) => [c.id, c.title] as const),
          ]}
        />
      )}
      {idea && (
        <div className="script-idea">
          <p className="small">
            <strong>{t("The idea", "L'idée")}</strong>
          </p>
          {idea.hook && <p className="script-idea-hook">&ldquo;{idea.hook}&rdquo;</p>}
          {idea.body && <p className="small">{idea.body}</p>}
        </div>
      )}
      <div className="row">
        <Field
          label={t("Title", "Titre")}
          name="title"
          maxLength={160}
          value={title}
          onChange={(e) => set({ title: e.target.value })}
          autoFocus={!startIdea}
        />
        <Select
          label={t("Length", "Durée")}
          name="seconds"
          value={String(seconds)}
          onChange={(e) => setSeconds(Number(e.target.value))}
          options={LENGTHS.map((n) => [String(n), `${n} s`] as const)}
        />
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
            hookNote={t("write 1 to 3, Gecko helps pick", "écrivez-en 1 à 3, Gecko aide à choisir")}
          />
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={write.isPending}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={write.isPending}>
          {t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
      </div>
    </form>
  );
}
