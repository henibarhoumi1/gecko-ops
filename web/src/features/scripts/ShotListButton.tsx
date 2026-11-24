import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { block, type Block } from "@/features/pages/blocks";
import { usePageActions } from "@/features/pages/pagesApi";
import { useMembers } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import type { Script } from "./model";

/** A shot list for this reel from its script: every hook and beat becomes shots to tick on set. */
export function shotListBlocks(
  script: Pick<Script, "title" | "seconds" | "hooks" | "beats" | "cta">,
): Block[] {
  const shot = (see?: string, hear?: string) =>
    block(
      "todo",
      [see?.trim(), hear?.trim() && `says: “${hear.trim()}”`].filter(Boolean).join(" · ") || "Shot",
    );
  const hooks = script.hooks.filter((h) => (h.see || h.hear || h.text || "").trim());
  const beats = script.beats.filter((b) => (b.see || b.hear || b.text || "").trim());
  return [
    block("field", script.title, { label: "Reel" }),
    block("field", `${script.seconds} s`, { label: "Length" }),
    block("field", "", { label: "Date" }),
    ...(hooks.length
      ? [
          block("h2", hooks.length > 1 ? "Hooks (shoot every option)" : "Hook"),
          ...hooks.map((h) => shot(h.see, h.hear || h.text)),
        ]
      : []),
    block("h2", "The reel"),
    ...(beats.length
      ? beats.map((b) => shot(b.see, b.hear || b.text))
      : [block("todo", "Add beats to the script")]),
    ...(script.cta
      ? [block("h2", "Call to action"), shot("Product / logo end card", script.cta)]
      : []),
    block("h2", "Pickups"),
    block("todo", "Product close-ups, hands, textures"),
    block("todo", "Logo and packaging"),
    block("todo", "Room tone 30 s"),
  ];
}

export function ShotListButton({ script, clientId }: { script: Script; clientId: string }) {
  const act = usePageActions();
  const navigate = useNavigate();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId)?.name ?? "";
  return (
    <Button
      variant="link"
      disabled={act.create.isPending}
      onClick={() =>
        void act.create
          .mutateAsync({
            title: `Shot list · ${script.title}`.slice(0, 200),
            icon: "list",
            kind: "doc",
            template: "shot-list",
            blocks: shotListBlocks(script),
            authorName: me,
            clientId,
          })
          .then((id) => {
            toast({ text: "Shot list ready", detail: "Tick it on set, or print it" });
            navigate(`/pages/${id}`);
          })
          .catch((e: unknown) => toast({ text: friendlyError(e), tone: "error" }))
      }
    >
      Shot list
    </Button>
  );
}
