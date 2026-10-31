import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { watchLink } from "./media";
import type { Video } from "./model";

/**
 * The watermarked preview. Nothing loads until someone presses play: each press asks the worker
 * for a signed two-hour link, which is kept for an hour so replays don't ask again.
 */
export function VideoPlayer({ video }: { video: Video }) {
  const [open, setOpen] = useState(false);
  const watch = useQuery({
    queryKey: ["watch", video.id, video.version, video.updatedAt],
    queryFn: () => watchLink(video.id),
    enabled: open && video.hasPreview,
    staleTime: 60 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data && !query.state.data.ready ? 5_000 : false),
  });

  if (!video.hasPreview) return <div className="player player-empty">No cut uploaded yet</div>;

  if (!open)
    return (
      <button type="button" className="player player-cover" onClick={() => setOpen(true)}>
        <span className="play" aria-hidden="true" />
        <span>Watch{video.version > 1 ? ` version ${video.version}` : ""}</span>
      </button>
    );

  if (watch.isPending) return <div className="player player-wait">Loading the player…</div>;

  if (watch.isError)
    return (
      <div className="player player-wait">
        <Notice tone="error">{friendlyError(watch.error)}</Notice>
        <Button variant="secondary" onClick={() => void watch.refetch()}>
          Try again
        </Button>
      </div>
    );

  if (!watch.data.ready)
    return (
      <div className="player player-wait" role="status">
        {watch.data.state === "error"
          ? "This file couldn't be processed. Upload the cut again."
          : `Getting this cut ready to play${watch.data.percent ? `, ${Math.round(watch.data.percent)}%` : ""}…`}
      </div>
    );

  return (
    <div className="player">
      <iframe
        src={watch.data.iframe}
        title={video.title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
