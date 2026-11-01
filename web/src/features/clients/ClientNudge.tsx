import { useState } from "react";
import { Button } from "@/components/Button";
import { useScripts } from "@/features/scripts/scriptsApi";
import { originFor } from "@/lib/hosts";
import { useConcepts } from "./clientsApi";
import { MessageLang } from "./LoginsPanel";
import { nudgeMessage, whatsappLink, type MsgLang } from "./messages";

/** The client gets no emails yet, so Gecko tells them on WhatsApp when something is waiting in the portal. */
export function ClientNudge({ clientId }: { clientId: string }) {
  const concepts = useConcepts(clientId);
  const scripts = useScripts(clientId);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<MsgLang>("fr");
  const [copied, setCopied] = useState(false);
  const waiting = {
    ideas: concepts.data?.filter((c) => c.status === "review").length ?? 0,
    scripts: scripts.data?.filter((s) => s.status === "review").length ?? 0,
  };
  const message = nudgeMessage(lang, waiting, originFor("client"));

  if (!open)
    return (
      <Button variant="secondary" className="nudge-open" onClick={() => setOpen(true)}>
        Message the client
      </Button>
    );
  return (
    <div className="card stack nudge">
      <div className="nudge-head">
        <strong>Tell the client what&rsquo;s waiting</strong>
        <MessageLang lang={lang} onChange={(l) => (setLang(l), setCopied(false))} />
      </div>
      <p className="small pre message-preview">{message}</p>
      <div className="actions start">
        <a
          className="btn btn-primary"
          href={whatsappLink(message)}
          target="_blank"
          rel="noreferrer noopener"
        >
          Send on WhatsApp
        </a>
        <Button
          variant="secondary"
          onClick={() => void navigator.clipboard.writeText(message).then(() => setCopied(true))}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="link" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
}
