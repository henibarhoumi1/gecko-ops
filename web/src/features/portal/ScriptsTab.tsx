import { useState } from "react";
import type { ClientPortal } from "@/features/auth/account";
import { ReviewActions } from "@/features/concepts/ReviewActions";
import { byClient, hookName, groupScripts, type Script } from "@/features/scripts/model";
import { Button } from "@/components/Button";
import { canApprove, useClientRole } from "./role";
import { WriteScript } from "./WriteScript";
import { ScriptView } from "@/features/scripts/ScriptView";
import { useClientScriptNote } from "@/features/scripts/scriptsApi";
import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

export function ScriptsTab({ portal, scripts }: { portal: ClientPortal; scripts: Script[] }) {
  const groups = groupScripts(scripts, "client");
  const role = useClientRole();
  const [writing, setWriting] = useState(false);
  const canWrite = canApprove(role);
  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          {tw(
            [
              "Each script is one reel, written the way we'll film it. Pick the hook you like, comment on any line, then approve. Once you approve, that's what we shoot.",
              "Chaque script, c'est une vidéo, écrite comme on va la filmer. Choisissez l'accroche qui vous plaît, commentez n'importe quelle ligne, puis validez. Une fois validé, c'est ce qu'on tourne.",
            ],
            [
              "Each treatment describes one film: the feeling, the story, the scenes. Comment on any line, then approve. Once you approve, that's the film we make.",
              "Chaque note d'intention décrit un film : l'émotion, l'histoire, les scènes. Commentez n'importe quelle ligne, puis validez. Une fois validée, c'est le film qu'on tourne.",
            ],
          )}
        </p>
        {canWrite && !writing && (
          <Button variant="secondary" onClick={() => setWriting(true)}>
            {tw(
              ["Write your own script", "Écrire votre script"],
              ["Write your own treatment", "Écrire votre note d'intention"],
            )}
          </Button>
        )}
      </div>
      {writing && <WriteScript portal={portal} onDone={() => setWriting(false)} />}
      {groups.length === 0 && !writing && (
        <p className="muted">
          {tw(
            [
              "Scripts come after you approve the ideas. They'll appear here for you to read and approve.",
              "Les scripts arrivent après la validation des idées. Ils apparaîtront ici pour que vous les lisiez et les validiez.",
            ],
            [
              "Treatments come after you approve the concepts. They'll appear here for you to read and approve.",
              "Les notes d'intention arrivent après la validation des concepts. Elles apparaîtront ici pour que vous les lisiez et les validiez.",
            ],
          )}
        </p>
      )}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((script) => (
              <ClientScript key={script.id} portal={portal} script={script} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ClientScript({ portal, script }: { portal: ClientPortal; script: Script }) {
  const note = useClientScriptNote(portal);
  const role = useClientRole();
  const [editing, setEditing] = useState(false);
  if (byClient(script)) {
    if (editing)
      return <WriteScript portal={portal} script={script} onDone={() => setEditing(false)} />;
    return (
      <ScriptView
        script={script}
        reader="client"
        picked={script.hook}
        onComment={(line, body) =>
          note.mutateAsync({
            scriptId: script.id,
            kind: "comment",
            body,
            line,
            version: script.version,
            hook: null,
          })
        }
      >
        <div className="concept-actions">
          {script.status !== "approved" && canApprove(role) && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t("Edit", "Modifier")}
            </Button>
          )}
          <p className="small muted decide-note">
            {script.status === "approved"
              ? t(
                  "Gecko approved this version. It's what we shoot.",
                  "Gecko a validé cette version. C'est ce qu'on tourne.",
                )
              : t(
                  "Gecko reads it and approves it or suggests changes.",
                  "Gecko la lit, puis la valide ou propose des changements.",
                )}
          </p>
        </div>
      </ScriptView>
    );
  }
  return <GeckoScript script={script} note={note} />;
}

function GeckoScript({
  script,
  note,
}: {
  script: Script;
  note: ReturnType<typeof useClientScriptNote>;
}) {
  const canDecide = script.status === "review" || script.status === "changes";
  const [picked, setPicked] = useState<number | null>(
    script.hook ?? (script.hooks.length === 1 ? 0 : null),
  );
  const send = (kind: "comment" | "approve" | "changes", body: string, line: string | null) =>
    note.mutateAsync({
      scriptId: script.id,
      kind,
      body,
      line,
      version: script.version,
      hook: kind === "approve" ? picked : null,
    });

  return (
    <ScriptView
      script={script}
      reader="client"
      picked={script.status === "approved" ? script.hook : picked}
      onPick={canDecide ? setPicked : undefined}
      onComment={(line, body) => send("comment", body, line)}
    >
      <ReviewActions
        canDecide={canDecide}
        pending={note.isPending}
        commentLabel={tw(
          ["Comment on the whole script", "Commenter tout le script"],
          ["Comment on the whole treatment", "Commenter toute la note d'intention"],
        )}
        approveNote={t(
          `You're approving version ${script.version} of "${script.title}"${
            picked !== null && script.hooks.length > 1 ? ` with ${hookName(picked)}` : ""
          }. ${tw(["This is what we'll shoot.", ""], ["This is the film we'll make.", ""])}`,
          `Vous validez la version ${script.version} de « ${script.title} »${
            picked !== null && script.hooks.length > 1 ? `, avec ${hookName(picked)}` : ""
          }. ${tw(["", "C'est ce qu'on va tourner."], ["", "C'est le film qu'on va tourner."])}`,
        )}
        onSend={(kind, body) => {
          if (kind === "approve" && script.hooks.length > 1 && picked === null)
            return Promise.reject(new Error("hook_required"));
          return send(kind, body, null);
        }}
      />
    </ScriptView>
  );
}
