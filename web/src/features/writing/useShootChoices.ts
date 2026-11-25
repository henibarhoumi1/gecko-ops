// What an idea or a script can be shot with, read the same way on both sides: the client's talent (with where each
// one's approvals stand), the campaign's sets, the approved props and places, each with its photos.
import { useMemo } from "react";
import type { ClientPortal } from "@/features/auth/account";
import {
  isCommitted,
  talentRole,
  talentWaiting,
  type ProductionOption,
} from "@/features/production/model";
import { useMyProduction, useTeamProduction } from "@/features/production/productionApi";
import { setsForProject, useProjectSets } from "@/features/projects/setsApi";
import type { ProjectSet } from "@/features/projects/setsModel";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { NO_CHOICES, type Choice, type ShootChoices } from "./shootPlan";

const ORDER = { ready: 0, waiting: 1 } as const;

function toChoices(
  options: readonly ProductionOption[],
  sets: readonly ProjectSet[],
): ShootChoices {
  const talent = options
    .filter((o) => o.kind === "talent" && o.status !== "suggested" && o.status !== "passed")
    .map((o): Choice => {
      const stands = talentWaiting(o) === "ready" ? "ready" : "waiting";
      return {
        id: o.id,
        name: o.name,
        detail: o.role ? talentRole(o.role) : undefined,
        photos: o.photos,
        stands,
      };
    })
    .sort(
      (a, b) =>
        ORDER[a.stands ?? "waiting"] - ORDER[b.stands ?? "waiting"] || a.name.localeCompare(b.name),
    );
  const ok = options.filter(isCommitted);
  const simple = (o: ProductionOption): Choice => ({
    id: o.id,
    name: o.name,
    detail: o.details || undefined,
    photos: o.photos,
  });
  return {
    talent,
    sets: sets.map((s) => ({
      id: s.id,
      name: s.name,
      detail: s.notes || undefined,
      photos: s.photos,
      projectId: s.projectId,
    })),
    props: ok.filter((o) => o.kind === "prop").map(simple),
    places: ok.filter((o) => o.kind === "location").map(simple),
  };
}

/** Gecko's side: the client's production page and the campaign's set list. */
export function useTeamShootChoices(clientId: string, projectId?: string | null): ShootChoices {
  const { id: workspaceId } = useWorkspace();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const production = useTeamProduction(target);
  const sets = useProjectSets(clientId);
  return useMemo(
    () =>
      production.data || sets.data
        ? toChoices(
            production.data?.options ?? [],
            setsForProject(sets.data ?? [], projectId ?? null),
          )
        : NO_CHOICES,
    [production.data, sets.data, projectId],
  );
}

/** The client's side: the same lists, from their production page (sets included). */
export function useClientShootChoices(
  portal: ClientPortal,
  projectId?: string | null,
): ShootChoices {
  const production = useMyProduction(portal);
  return useMemo(() => {
    if (!production.data) return NO_CHOICES;
    const sets: ProjectSet[] = (production.data.sets ?? []).map((s) => ({
      id: s.id,
      projectId: s.projectId,
      name: s.name,
      notes: s.notes,
      photos: s.photos ?? [],
      position: s.position,
    }));
    return toChoices(production.data.options, setsForProject(sets, projectId ?? null));
  }, [production.data, projectId]);
}
