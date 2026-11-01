import type { ClientPortal } from "@/features/auth/account";
import { Notice } from "@/components/Notice";
import { SharedSpaceView } from "@/features/shared/SharedSpaceView";
import { useClientShared, useMyShared } from "@/features/shared/sharedApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";

export function SharedTab({ portal }: { portal: ClientPortal }) {
  const shared = useMyShared(portal);
  const act = useClientShared(portal);
  if (shared.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (shared.isError) return <Notice tone="error">{friendlyError(shared.error)}</Notice>;
  return (
    <SharedSpaceView
      reader="client"
      data={shared.data}
      actions={{
        saveNotes: (body) => act.saveNotes.mutateAsync(body),
        addReference: (input) => act.add.mutateAsync({ ...input, kind: "reference" }),
        addRequest: (input) => act.add.mutateAsync({ ...input, url: "", kind: "request" }),
        remove: (id) => act.remove.mutateAsync(id),
      }}
    />
  );
}
