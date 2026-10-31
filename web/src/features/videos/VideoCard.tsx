import type { ReactNode } from "react";
import { NoteList } from "@/features/concepts/ConceptCard";
import { shortDate } from "@/features/concepts/model";
import { fileSize, VIDEO_STATUS_LABEL, type Video } from "./model";
import { VideoPlayer } from "./VideoPlayer";

/** One video as both sides see it: the player, where it stands, and the conversation under it. */
export function VideoCard({
  video,
  reader,
  children,
}: {
  video: Video;
  reader: "client" | "team";
  children?: ReactNode;
}) {
  return (
    <article className={`concept video concept-${video.status}`}>
      <VideoPlayer video={video} />
      <div className="video-info">
        <header className="concept-head">
          <span className="tag">Video</span>
          <span className={`status status-${video.status}`}>
            {VIDEO_STATUS_LABEL[reader][video.status]}
          </span>
          {video.version > 1 && <span className="small muted">Version {video.version}</span>}
        </header>
        <h3>{video.title}</h3>
        {video.conceptTitle && (
          <p className="small muted">From the concept "{video.conceptTitle}"</p>
        )}
        {video.hasFinal && reader === "team" && (
          <p className="small">
            Final file: {video.finalName}
            {video.finalSize != null && (
              <span className="muted"> · {fileSize(video.finalSize)}</span>
            )}
          </p>
        )}
        {video.approvedAt && (
          <p className="small muted">
            Version {video.approvedVersion} approved by {video.approvedBy ?? "the client"} on{" "}
            {shortDate(video.approvedAt)}
          </p>
        )}
        <NoteList notes={video.notes} />
        {children}
      </div>
    </article>
  );
}
