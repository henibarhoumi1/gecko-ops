import { useState } from "react";
import type { ClientPortal } from "@/features/auth/account";
import { ReviewActions } from "@/features/concepts/ReviewActions";
import { hookName, groupScripts, type Script } from "@/features/scripts/model";
import { ScriptView } from "@/features/scripts/ScriptView";
import { useClientScriptNote } from "@/features/scripts/scriptsApi";
import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";

export function ScriptsTab({ portal, scripts }: { portal: ClientPortal; scripts: Script[] }) {
  const groups = groupScripts(scripts, "client");
  return (
    <section className="tab-body">
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
      {groups.length === 0 && (
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
