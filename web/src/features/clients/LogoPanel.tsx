import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { LOGO_TYPES, prepareLogo } from "@/lib/logo";
import { useLogos, useSaveLogo } from "./clientsApi";

/** The client's logo: shown at the top of their portal and next to their name here. */
export function LogoPanel({ clientId, brand }: { clientId: string; brand: string }) {
  const logos = useLogos();
  const save = useSaveLogo(clientId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logo = logos.data?.[clientId];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await save.mutateAsync(await prepareLogo(file));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="logo-panel card">
      <div className={`logo-well${logo ? "" : " empty"}`}>
        {logo ? (
          <img src={logo} alt={`${brand} logo`} />
        ) : (
          <span className="small muted">No logo yet</span>
        )}
      </div>
      <div className="logo-side">
        <h2>Brand logo</h2>
        <p className="small muted">
          Sits at the top of {brand}&rsquo;s portal. PNG with a transparent background looks best;
          white margins are trimmed for you.
        </p>
        <div className="logo-actions">
          <Button
            variant="secondary"
            disabled={busy || logos.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Saving…" : logo ? "Replace logo" : "Add logo"}
          </Button>
          {logo && (
            <Button
              variant="link"
              disabled={busy}
              onClick={() => {
                setError(null);
                save.mutate(null, { onError: (err) => setError(friendlyError(err)) });
              }}
            >
              Remove
            </Button>
          )}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {logos.isError && <Notice tone="error">{friendlyError(logos.error)}</Notice>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={LOGO_TYPES.join(",")}
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
