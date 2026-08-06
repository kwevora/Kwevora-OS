"use client";

import type { KaiContentPackage } from "../core/runtime/contentGenerator";
import { getPlatformLabel } from "../core/runtime/platformConnections";
import EditableField, {
  type EditableFieldName,
  type EditingField,
} from "./EditableField";

type ContentCardProps = {
  item: KaiContentPackage;
  editing: EditingField | null;
  onStartEdit: (next: EditingField | null) => void;
  onChange: (
    packageId: string,
    field: EditableFieldName,
    value: string
  ) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCopyEverything: (item: KaiContentPackage) => void;
};

type VideoDetails = {
  videoUrl?: string;
  thumbnailUrl?: string;
  renderStatus?: "queued" | "rendering" | "ready" | "failed";
  durationInSeconds?: number;
};

export default function ContentCard({
  item,
  editing,
  onStartEdit,
  onChange,
  onApprove,
  onReject,
  onCopyEverything,
}: ContentCardProps) {
  const isReady = item.status === "ready_to_publish";
  const videoDetails = item as KaiContentPackage & VideoDetails;

  const videoUrl =
    typeof videoDetails.videoUrl === "string"
      ? videoDetails.videoUrl.trim()
      : "";

  const thumbnailUrl =
    typeof videoDetails.thumbnailUrl === "string"
      ? videoDetails.thumbnailUrl.trim()
      : "";

  const renderStatus = getRenderStatus(videoDetails, videoUrl);
  const duration = formatDuration(videoDetails.durationInSeconds);

  return (
    <article className="rounded-2xl border border-white/10 bg-black/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-full bg-purple-600/20 px-4 py-2 text-sm font-bold uppercase text-purple-300">
          {getPlatformLabel(item.platform)}
        </p>

        <div className="flex flex-wrap gap-2">
          <p
            className={`rounded-full px-4 py-2 text-sm font-bold uppercase ${getRenderStatusClasses(
              renderStatus
            )}`}
          >
            {getRenderStatusLabel(renderStatus)}
          </p>

          <p className="rounded-full bg-yellow-600/20 px-4 py-2 text-sm font-bold capitalize text-yellow-300">
            {(item.status ?? "waiting_review").replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <h3 className="mt-5 text-3xl font-black">
        {item.title || "Untitled content package"}
      </h3>

      <VideoPreview
        title={item.title}
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        renderStatus={renderStatus}
        duration={duration}
      />

      <div className="mt-6 grid gap-5">
        <EditableField
          title="Title"
          value={item.title}
          packageId={item.id}
          field="title"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Hook"
          value={item.hook}
          packageId={item.id}
          field="hook"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Script"
          value={item.script.join("\n")}
          packageId={item.id}
          field="script"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Caption"
          value={item.caption}
          packageId={item.id}
          field="caption"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Hashtags"
          value={item.hashtags.join(" ")}
          packageId={item.id}
          field="hashtags"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Thumbnail Idea"
          value={item.thumbnailIdea}
          packageId={item.id}
          field="thumbnailIdea"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="CTA"
          value={item.cta}
          packageId={item.id}
          field="cta"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Destination Link"
          value={item.destinationLink}
          packageId={item.id}
          field="destinationLink"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <EditableField
          title="Pinned Comment"
          value={item.pinnedComment}
          packageId={item.id}
          field="pinnedComment"
          editing={editing}
          onStartEdit={onStartEdit}
          onChange={onChange}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold tracking-[0.25em] text-gray-400">
            WHY KAI MADE THIS
          </p>

          <p className="mt-3 text-gray-300">
            {item.reason || "KAI created this package to support today’s goal."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onApprove(item.id)}
          disabled={isReady || renderStatus !== "ready"}
          className="rounded-xl bg-green-600 px-6 py-4 font-black transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReady
            ? "Ready To Publish"
            : renderStatus === "ready"
              ? "Approve This Package"
              : "Waiting For Video"}
        </button>

        <button
          type="button"
          onClick={() => onCopyEverything(item)}
          className="rounded-xl bg-white/10 px-6 py-4 font-black transition hover:bg-white/20"
        >
          Copy Everything
        </button>

        <button
          type="button"
          onClick={() => onReject(item.id)}
          className="rounded-xl bg-red-600 px-6 py-4 font-black transition hover:bg-red-500"
        >
          Reject
        </button>
      </div>
    </article>
  );
}

type VideoPreviewProps = {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  renderStatus: "queued" | "rendering" | "ready" | "failed";
  duration: string;
};

function VideoPreview({
  title,
  videoUrl,
  thumbnailUrl,
  renderStatus,
  duration,
}: VideoPreviewProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#07040f]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-purple-300">
            VIDEO PREVIEW
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Watch KAI&apos;s finished video before approving it.
          </p>
        </div>

        {duration ? (
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-gray-300">
            {duration}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-[420px] items-center justify-center bg-black p-5">
        {renderStatus === "ready" && videoUrl ? (
          <video
            controls
            preload="metadata"
            poster={thumbnailUrl || undefined}
            className="max-h-[650px] w-full max-w-sm rounded-2xl bg-black shadow-2xl"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser could not play this video.
          </video>
        ) : null}

        {renderStatus === "rendering" ? (
          <PreviewMessage
            title="KAI is rendering this video."
            message="The preview will appear here when the MP4 is ready."
          />
        ) : null}

        {renderStatus === "queued" ? (
          <PreviewMessage
            title="This video is waiting to render."
            message="KAI has prepared the content package and the video will begin rendering soon."
          />
        ) : null}

        {renderStatus === "failed" ? (
          <PreviewMessage
            title="The video could not be rendered."
            message="The content package is safe. KAI can try rendering the video again."
          />
        ) : null}

        {renderStatus === "ready" && !videoUrl ? (
          <PreviewMessage
            title="The video is marked ready."
            message="No MP4 address was found for this package."
          />
        ) : null}
      </div>

      {videoUrl ? (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm text-gray-500">
            {title || "KWEVORA video"} · {videoUrl}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PreviewMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="max-w-md px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-purple-400/30 bg-purple-400/10 text-2xl">
        ▶
      </div>

      <h4 className="mt-5 text-xl font-black text-white">{title}</h4>

      <p className="mt-3 leading-7 text-gray-400">{message}</p>
    </div>
  );
}

function getRenderStatus(
  item: VideoDetails,
  videoUrl: string
): "queued" | "rendering" | "ready" | "failed" {
  if (item.renderStatus === "failed") {
    return "failed";
  }

  if (item.renderStatus === "rendering") {
    return "rendering";
  }

  if (item.renderStatus === "queued") {
    return "queued";
  }

  if (item.renderStatus === "ready" || videoUrl) {
    return "ready";
  }

  return "queued";
}

function getRenderStatusLabel(
  status: "queued" | "rendering" | "ready" | "failed"
) {
  switch (status) {
    case "rendering":
      return "Rendering";
    case "ready":
      return "Video Ready";
    case "failed":
      return "Render Failed";
    default:
      return "Waiting To Render";
  }
}

function getRenderStatusClasses(
  status: "queued" | "rendering" | "ready" | "failed"
) {
  switch (status) {
    case "rendering":
      return "bg-cyan-600/20 text-cyan-300";
    case "ready":
      return "bg-green-600/20 text-green-300";
    case "failed":
      return "bg-red-600/20 text-red-300";
    default:
      return "bg-gray-600/20 text-gray-300";
  }
}

function formatDuration(value?: number) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "";
  }

  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}