import { Notice } from "@/components/Notice";
import { SharedSpaceView } from "@/features/shared/SharedSpaceView";
import { useTeamShared, useTeamSharedActions } from "@/features/shared/sharedApi";
import { friendlyError } from "@/lib/errors";

export function TeamShared({ clientId }: { clientId: string }) {
  const shared = useTeamShared(clientId);
  const act = useTeamSharedActions(clientId);
  if (shared.isPending) return <p className="muted">Loading…</p>;
  if (shared.isError) return <Notice tone="error">{friendlyError(shared.error)}</Notice>;
  return (
    <SharedSpaceView
      reader="team"
      data={shared.data}
      actions={{
        saveNotes: (body) => act.saveNotes.mutateAsync(body),
        addReference: (input) => act.add.mutateAsync(input),
        answer: (input) => act.answer.mutateAsync(input),
        remove: (id) => act.remove.mutateAsync(id),
      }}
    />
  );
}
