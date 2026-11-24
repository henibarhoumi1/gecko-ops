import { useEffect, useRef, useState } from "react";
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
  const [over, setOver] = useState(false);
  const hot = useRef(false);

  // A logo pasted (⌘V) while the pointer is over this panel lands here.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!hot.current) return;
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => LOGO_TYPES.includes(x.type));
      if (!f) return;
      e.preventDefault();
      void onFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

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
    <section
      className={`logo-panel card${over ? " is-over" : ""}`}
      onMouseEnter={() => (hot.current = true)}
      onMouseLeave={() => (hot.current = false)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void onFile(Array.from(e.dataTransfer.files).find((x) => LOGO_TYPES.includes(x.type)));
      }}
    >
      <button
        type="button"
        className={`logo-well${logo ? "" : " empty"}`}
        onClick={() => fileRef.current?.click()}
        aria-label={logo ? "Replace logo" : "Add logo"}
      >
        {logo ? (
          <img src={logo} alt={`${brand} logo`} />
        ) : (
          <span className="small">{over ? "Drop it here" : "Drop or paste the logo"}</span>
        )}
      </button>
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
