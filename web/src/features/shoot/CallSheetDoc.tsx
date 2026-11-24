import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { block, type Block } from "@/features/pages/blocks";
import { usePageActions } from "@/features/pages/pagesApi";
import { useMembers } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import type { ShootDay } from "./model";

/** The day's call sheet as a Gecko document (crew, talent, schedule, map, kit), ready to print to PDF. */
export function callSheetBlocks(brand: string, day: ShootDay): Block[] {
  const f = (label: string, text: string) => block("field", text, { label });
  const gecko = day.people.filter((p) => p.side !== "client");
  const client = day.people.filter((p) => p.side === "client");
  return [
    f("Client", brand),
    f("Date", day.day),
    f("Call", day.callTime ?? ""),
    f("Wrap", day.wrapTime ?? ""),
    f("Place", [day.place, day.address].filter(Boolean).join(", ")),
    ...(day.mapLink ? [f("Map", day.mapLink)] : []),
    block("h2", "Schedule"),
    ...(day.reels.length
      ? day.reels
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((r) => f(r.slot || `Reel ${r.position + 1}`, `${r.title} · ${r.seconds} s`))
      : [block("text", "Reels are added from the shoot day.")]),
    block("h2", "Crew"),
    ...(gecko.length
      ? gecko.map((p) =>
          f(
            p.role || "Crew",
            [p.name, p.callTime && `call ${p.callTime}`, p.phone].filter(Boolean).join(" · "),
          ),
        )
      : [block("text", "Add the crew on the shoot day.")]),
    ...(client.length
      ? [
          block("h2", "From the client"),
          ...client.map((p) =>
            f(
              p.role || "Client",
              [p.name, p.callTime && `call ${p.callTime}`].filter(Boolean).join(" · "),
            ),
          ),
        ]
      : []),
    block("h2", "Bring"),
    block("todo", "Camera kit, batteries, cards"),
    block("todo", "Lights and stands"),
    block("todo", "Sound"),
    block("todo", "Props and wardrobe"),
    block("todo", "Release forms"),
    ...(day.notes ? [block("h2", "Notes"), block("text", day.notes)] : []),
  ];
}

export function CallSheetDocButton({
  brand,
  day,
  clientId,
}: {
  brand: string;
  day: ShootDay;
  clientId: string;
}) {
  const act = usePageActions();
  const navigate = useNavigate();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId)?.name ?? "";
  return (
    <Button
      variant="secondary"
      disabled={act.create.isPending}
      onClick={() =>
        void act.create
          .mutateAsync({
            title: `Call sheet · ${brand} · ${day.day}`,
            icon: "☎",
            kind: "doc",
            template: "callsheet",
            blocks: callSheetBlocks(brand, day),
            authorName: me,
            clientId,
          })
          .then((id) => {
            toast({
              text: "Call sheet ready",
              detail: "Print it to PDF or send it",
              celebrate: true,
            });
            navigate(`/pages/${id}`);
          })
          .catch((e: unknown) => toast({ text: friendlyError(e), tone: "error" }))
      }
    >
      Gecko call sheet (PDF)
    </Button>
  );
}
