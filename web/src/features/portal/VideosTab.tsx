import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { ReviewActions } from "@/features/concepts/ReviewActions";
import { downloadFinal } from "@/features/videos/media";
import { fileSize, groupVideos, type Video } from "@/features/videos/model";
import { VideoCard } from "@/features/videos/VideoCard";
import { friendlyError } from "@/lib/errors";
import { useVideoNote, type MyVideos } from "./portalApi";

export function VideosTab({ portal, data }: { portal: ClientPortal; data: MyVideos }) {
  const groups = groupVideos(data.videos, "client");
  const locked = !data.balancePaid && data.videos.some((v) => v.hasFinal);

  return (
    <section className="tab-body">
      <p className="lede">
        Watch each cut here. Previews carry a Gecko watermark. Approve a cut or tell us what to
        change; the clean files are ready to download once the balance is paid.
      </p>
      {locked && (
        <Notice>
          Your final files are ready. They unlock here as soon as the balance is paid.
        </Notice>
      )}
      {groups.length === 0 && (
        <p className="muted">Your videos appear here as soon as the first cut is ready.</p>
      )}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((video) => (
              <VideoCard key={video.id} video={video} reader="client">
                <FinalFile video={video} balancePaid={data.balancePaid} />
                <ClientVideoActions portal={portal} video={video} />
              </VideoCard>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ClientVideoActions({ portal, video }: { portal: ClientPortal; video: Video }) {
  const note = useVideoNote(portal);
  return (
    <ReviewActions
      canDecide={video.status === "review" || video.status === "changes"}
      pending={note.isPending}
      approveNote={`You're approving version ${video.version} of "${video.title}". Gecko then prepares the final file without the watermark.`}
      onSend={(kind, body) =>
        note.mutateAsync({ videoId: video.id, kind, body, version: video.version })
      }
    />
  );
}

function FinalFile({ video, balancePaid }: { video: Video; balancePaid: boolean }) {
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  if (!video.hasFinal)
    return video.status === "approved" ? (
      <p className="small muted">Gecko is preparing the final file.</p>
    ) : null;
  if (!balancePaid)
    return <p className="small muted">The final file unlocks here once the balance is paid.</p>;

  return (
    <div className="video-files">
      <Button
        disabled={opening}
        onClick={() => {
          setError("");
          setOpening(true);
          downloadFinal(video.id)
            .catch((e: unknown) => setError(friendlyError(e)))
            .finally(() => setOpening(false));
        }}
      >
        Download the final file
      </Button>
      {video.finalSize != null && <span className="small muted">{fileSize(video.finalSize)}</span>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
