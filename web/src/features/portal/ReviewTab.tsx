import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { shortDate } from "@/features/concepts/model";
import { CutScreen } from "@/features/review/CutScreen";
import { groupCuts, latest, timecode, type Cut, type CutStatus } from "@/features/review/model";
import { useClientCutNote, useMyCuts } from "@/features/review/reviewApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { tw, words } from "@/lib/wording";
import { canApprove, useClientRole } from "./role";

/** A date to end a sentence with: French short months already carry their own full stop. */
const day = (iso: string | null) => shortDate(iso).replace(/\.$/, "");

const target = (portal: ClientPortal) => ({
  workspaceId: portal.workspaceId,
  clientId: portal.clientId,
});

function groupName(status: CutStatus): string {
  return {
    review: t("Ready for you to watch", "Prêts à regarder"),
    changes: t("Gecko is on your notes", "Gecko travaille sur vos notes"),
    approved: t("Approved", "Validés"),
    draft: "",
  }[status];
}

/** Every cut Gecko has sent, by what the client should do with it. */
export function ReviewTab({ portal }: { portal: ClientPortal }) {
  const { cutId } = useParams();
  const cuts = useMyCuts(target(portal));
  if (cuts.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (cuts.isError) return <Notice tone="error">{friendlyError(cuts.error)}</Notice>;
  if (cutId) {
    const cut = cuts.data.cuts.find((c) => c.id === cutId);
    return cut ? (
      <ClientScreening portal={portal} cut={cut} />
    ) : (
      <Notice>
        {t("This cut is no longer here.", "Ce montage n'est plus là.")}{" "}
        <Link to="/review">{t("See all cuts", "Voir tous les montages")}</Link>
      </Notice>
    );
  }
  const groups = groupCuts(cuts.data.cuts, "client");
  return (
    <section className="tab-body">
      <p className="lede">
        {tw(
          [
            "Watch each reel, pause where something should change and leave a note on that moment. Approve it when it's right.",
            "Regardez chaque vidéo, mettez sur pause là où quelque chose doit changer et laissez une note sur ce moment. Validez quand c'est bon.",
          ],
          [
            "Watch each film, pause where something should change and leave a note on that moment. Approve it when it's right.",
            "Regardez chaque film, mettez sur pause là où quelque chose doit changer et laissez une note sur ce moment. Validez quand c'est juste.",
          ],
        )}
      </p>
      {groups.length === 0 && (
        <p className="muted">
          {tw(
            [
              "Your reels show up here as soon as the first cut is ready.",
              "Vos vidéos s'affichent ici dès que le premier montage est prêt.",
            ],
            [
              "Your films show up here as soon as the first cut is ready.",
              "Vos films s'affichent ici dès que le premier montage est prêt.",
            ],
          )}
        </p>
      )}
      {groups.map(([status, items]) => (
        <div key={status} className="group">
          <h2>
            {groupName(status)} <span className="count">{items.length}</span>
          </h2>
          <ul className="cut-list">
            {items.map((cut) => (
              <CutRow key={cut.id} cut={cut} to={`/review/${cut.id}`} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function CutRow({ cut, to, extra }: { cut: Cut; to: string; extra?: string }) {
  const v = latest(cut);
  return (
    <li>
      <Link to={to} className={`cut-row status-${cut.status}`}>
        <span className="cut-title" dir="auto">
          {cut.title}
        </span>
        <span className="small muted">
          {cut.version > 0 && `V${cut.version}`}
          {v?.seconds != null && ` · ${timecode(Number(v.seconds))}`}
          {` · ${shortDate(cut.updatedAt)}`}
          {extra && ` · ${extra}`}
        </span>
      </Link>
    </li>
  );
}

function ClientScreening({ portal, cut }: { portal: ClientPortal; cut: Cut }) {
  const note = useClientCutNote(target(portal));
  const allowed = canApprove(useClientRole());
  const waiting = cut.status === "review" || cut.status === "changes";
  return (
    <section className="tab-body">
      <p className="small">
        <Link to="/review">← {words.review()}</Link>
      </p>
      <h2 className="screen-title" dir="auto">
        {cut.title}
      </h2>
      <CutScreen
        cut={cut}
        reader="client"
        onNote={({ at, body }) =>
          note.mutateAsync({ id: cut.id, kind: "comment", version: cut.version, at, body })
        }
        decision={
          cut.status === "approved" ? (
            <p className="screen-approved">
              {t(
                `Approved V${cut.approvedVersion} on ${day(cut.approvedAt)}. Gecko is preparing the final file.`,
                `V${cut.approvedVersion} validée le ${day(cut.approvedAt)}. Gecko prépare le fichier final.`,
              )}
            </p>
          ) : cut.status === "changes" ? (
            <p className="screen-approved changes">
              {t(
                `You asked for changes on V${cut.version}. Gecko is on it and sends V${cut.version + 1} here.`,
                `Vous avez demandé des changements sur la V${cut.version}. Gecko s'en occupe et envoie la V${cut.version + 1} ici.`,
              )}
            </p>
          ) : waiting && allowed ? (
            <Decide
              version={cut.version}
              onSend={(kind, body) =>
                note.mutateAsync({ id: cut.id, kind, version: cut.version, at: null, body })
              }
            />
          ) : waiting ? (
            <p className="small muted">
              {t(
                "Your owner or an approver on your side signs this off. Your notes still reach Gecko.",
                "C'est votre responsable ou un valideur qui valide. Vos notes arrivent quand même chez Gecko.",
              )}
            </p>
          ) : null
        }
      />
    </section>
  );
}

function Decide({
  version,
  onSend,
}: {
  version: number;
  onSend: (kind: "approve" | "changes", body: string) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "changes">("idle");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get("body") ?? "").trim();
    if (mode === "changes" && !body)
      return setError(
        t(
          "Say what should change overall. Notes on moments are already sent.",
          "Dites ce qui doit changer dans l'ensemble. Les notes sur les moments sont déjà envoyées.",
        ),
      );
    setSending(true);
    setError("");
    try {
      await onSend(mode === "approve" ? "approve" : "changes", body);
      setMode("idle");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  if (mode === "idle")
    return (
      <div className="screen-decide">
        <Button onClick={() => setMode("approve")}>
          {t(`Approve V${version}`, `Valider la V${version}`)}
        </Button>
        <Button variant="secondary" onClick={() => setMode("changes")}>
          {t("Ask for changes", "Demander des changements")}
        </Button>
      </div>
    );

  return (
    <form className="screen-decide-form card" onSubmit={onSubmit}>
      <p>
        {mode === "approve"
          ? t(
              `You're approving version ${version}. Gecko then prepares the final file, without the watermark.`,
              `Vous validez la version ${version}. Gecko prépare ensuite le fichier final, sans filigrane.`,
            )
          : t(
              "Gecko gets your notes on moments plus this message, and sends a new version.",
              "Gecko reçoit vos notes sur les moments et ce message, puis envoie une nouvelle version.",
            )}
      </p>
      <label className="visually-hidden" htmlFor="decide-body">
        {t("Message", "Message")}
      </label>
      <textarea
        id="decide-body"
        name="body"
        rows={2}
        maxLength={2000}
        placeholder={
          mode === "approve"
            ? t("Anything to add? (optional)", "Quelque chose à ajouter ? (facultatif)")
            : t("What should change overall?", "Que faut-il changer dans l'ensemble ?")
        }
      />
      <div className="screen-form-row">
        <Button type="submit" disabled={sending}>
          {mode === "approve"
            ? t("Yes, approve", "Oui, valider")
            : t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
        <Button variant="link" onClick={() => setMode("idle")}>
          {t("Cancel", "Annuler")}
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}

/** The delivery shelf: approved cuts, their final files once the balance is in. */
export function DeliveryTab({ portal }: { portal: ClientPortal }) {
  const cuts = useMyCuts(target(portal));
  if (cuts.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (cuts.isError) return <Notice tone="error">{friendlyError(cuts.error)}</Notice>;
  const approved = cuts.data.cuts.filter((c) => c.status === "approved");
  const ready = approved.filter((c) => c.delivered);
  const locked = !cuts.data.balancePaid && ready.length > 0;
  return (
    <section className="tab-body">
      <p className="lede">
        {t(
          "Every approved cut ends up here, as the clean file without the watermark.",
          "Chaque montage validé arrive ici, en fichier propre sans filigrane.",
        )}
      </p>
      {locked && (
        <Notice>
          {ready.length === 1
            ? t(
                "Your final file is ready. It opens here as soon as the balance is paid.",
                "Votre fichier final est prêt. Il s'ouvre ici dès que le solde est réglé.",
              )
            : t(
                `${ready.length} final files are ready. They open here as soon as the balance is paid.`,
                `${ready.length} fichiers finaux sont prêts. Ils s'ouvrent ici dès que le solde est réglé.`,
              )}
        </Notice>
      )}
      {approved.length === 0 ? (
        <p className="muted">
          {t(
            "Nothing approved yet. Approve a cut in Review and its final file comes here.",
            "Rien de validé pour l'instant. Validez un montage et son fichier final arrive ici.",
          )}
        </p>
      ) : (
        <ul className="shelf">
          {approved.map((cut) => (
            <li key={cut.id} className={`shelf-item${cut.finalLink ? " open" : ""}`}>
              <div>
                <strong dir="auto">{cut.title}</strong>
                <p className="small muted">
                  V{cut.approvedVersion} · {t("approved", "validée")} {shortDate(cut.approvedAt)}
                  {cut.finalNote && <> · {cut.finalNote}</>}
                </p>
              </div>
              {cut.finalLink ? (
                <a
                  className="btn btn-primary"
                  href={cut.finalLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Get the file", "Récupérer le fichier")}
                </a>
              ) : cut.delivered ? (
                <span className="shelf-lock small">
                  {t("Opens once paid", "S'ouvre après paiement")}
                </span>
              ) : (
                <span className="small muted">{t("Being finished", "En finition")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
