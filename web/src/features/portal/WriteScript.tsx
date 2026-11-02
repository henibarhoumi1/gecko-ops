import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import type { ClientPortal } from "@/features/auth/account";
import {
  tidyLines,
  tidyTreatment,
  TREATMENT_KEYS,
  treatmentLabel,
  type Script,
  type ScriptLine,
  type Treatment,
} from "@/features/scripts/model";
import { useClientWriteScript } from "@/features/scripts/scriptsApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { isCinematic, tw, words } from "@/lib/wording";

const LENGTHS = [15, 20, 30, 45, 60, 90] as const;

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
  onDone,
}: {
  portal: ClientPortal;
  script?: Script;
  onDone: () => void;
}) {
  const write = useClientWriteScript(portal);
  const cine = isCinematic();
  const [beats, setBeats] = useState<ScriptLine[]>(script?.beats.length ? script.beats : [{}, {}]);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("title")) return setError(t("Give it a short title.", "Donnez-lui un titre court."));
    const hooks = tidyLines([
      { see: text("hook-see"), hear: text("hook-hear") },
      { see: text("hook2-see"), hear: text("hook2-hear") },
    ]);
    const treatment: Treatment = {};
    for (const key of TREATMENT_KEYS) treatment[key] = text(`t-${key}`);
    try {
      await write.mutateAsync({
        id: script?.id ?? null,
        title: text("title"),
        seconds: Number(text("seconds")) || 30,
        goal: text("goal"),
        hooks,
        beats: tidyLines(beats),
        cta: text("cta"),
        treatment: tidyTreatment(treatment),
      });
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
              ["Edit your script", "Modifier votre script"],
              ["Edit your treatment", "Modifier votre note d'intention"],
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
      <div className="row">
        <Field
          label={t("Title", "Titre")}
          name="title"
          maxLength={160}
          defaultValue={script?.title}
          autoFocus
        />
        <Select
          label={t("Length", "Durée")}
          name="seconds"
          defaultValue={String(script?.seconds ?? (cine ? 45 : 30))}
          options={LENGTHS.map((n) => [String(n), `${n} s`] as const)}
        />
      </div>
      <Field
        label={words.goal()}
        name="goal"
        maxLength={300}
        defaultValue={script?.goal}
        placeholder={tw(
          ["…want to try the product today", "…avoir envie d'essayer le produit aujourd'hui"],
          ["…calm, and wanting the coat", "…apaisé, avec l'envie du manteau"],
        )}
      />

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

      <fieldset className="write-part">
        <legend>
          {tw(
            ["How it opens (the first 3 seconds)", "L'ouverture (les 3 premières secondes)"],
            ["The opening shot", "Le plan d'ouverture"],
          )}
        </legend>
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
        {!cine && (
          <details open={Boolean(script?.hooks[1])}>
            <summary className="small">
              {t("Add a second opening to compare", "Ajouter une deuxième ouverture à comparer")}
            </summary>
            <div className="row">
              <TextArea
                label={t("What we see", "Ce qu'on voit")}
                name="hook2-see"
                rows={2}
                maxLength={1000}
                defaultValue={script?.hooks[1]?.see}
              />
              <TextArea
                label={t("What we hear", "Ce qu'on entend")}
                name="hook2-hear"
                rows={2}
                maxLength={1000}
                defaultValue={script?.hooks[1]?.hear}
              />
            </div>
          </details>
        )}
      </fieldset>

      <fieldset className="write-part">
        <legend>{cine ? t("The scenes", "Les scènes") : t("Then what happens", "Ensuite")}</legend>
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
              {!cine && (
                <Field
                  label={t("Words on screen", "Texte à l'écran")}
                  maxLength={300}
                  value={beat.text ?? ""}
                  onChange={(e) => setBeat(i, "text", e.target.value)}
                />
              )}
            </li>
          ))}
        </ol>
        {beats.length < 40 && (
          <Button variant="link" onClick={() => setBeats((list) => [...list, {}])}>
            {t("+ Add a moment", "+ Ajouter un moment")}
          </Button>
        )}
      </fieldset>

      <Field
        label={tw(["How it ends", "La fin"], ["The final frame", "Le dernier plan"])}
        name="cta"
        maxLength={300}
        defaultValue={script?.cta}
        placeholder={tw(
          ["Order on our site, delivery in 48 h", "Commandez sur notre site, livraison en 48 h"],
          ["The logo on white", "Le logo sur fond blanc"],
        )}
      />
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
