"use client";

import {
  useEffect,
  useState,
} from "react";

type VideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
};

type MediaFile = {
  source:
    | "recording"
    | "upload"
    | "generated";

  fileName: string;

  storedFileName: string;

  mimeType: string;

  size: number;

  filePath: string;
};

type PublishingStatus =
  | "approved"
  | "ready_to_publish"
  | "scheduled"
  | "published";

type PlatformPublication = {
  platform: string;

  externalId: string;

  url: string;

  publishedAt: string;

  channelId?: string;

  channelName?: string;

  privacyStatus?: string;
};

type PublishingItem = {
  id: string;

  createdAt: string;

  approvedAt: string;

  updatedAt: string;

  status:
    PublishingStatus;

  idea: string;

  reason: string;

  hook: string;

  title: string;

  script: string;

  caption: string;

  hashtags: string[];

  thumbnailIdea: string;

  callToAction: string;

  audience: string;

  recommendedPlatforms:
    string[];

  videoPlan:
    VideoPlan;

  format: string;

  destinationLink: string;

  pinnedComment: string;

  scheduledFor: string;

  publishedAt: string;

  media?: MediaFile;

  publications?:
    PlatformPublication[];
};

type PublishingResponse = {
  success: boolean;

  items:
    PublishingItem[];

  message?: string;
};

type YouTubeUploadResponse = {
  success?: boolean;

  message?: string;

  video?: {
    id?: string;

    url?: string;

    title?: string;

    channelId?: string;

    channelTitle?: string;

    privacyStatus?: string;

    uploadStatus?: string;
  };
};

export default function PublishingPage() {
  const [
    items,
    setItems,
  ] =
    useState<
      PublishingItem[]
    >(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    workingId,
    setWorkingId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    scheduleValues,
    setScheduleValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {},
    );

  useEffect(
    () => {
      void loadPublishingQueue();
    },
    [],
  );

  async function loadPublishingQueue() {
    try {
      const response =
        await fetch(
          "/api/publishing",
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "KWEVORA could not load the Publishing Queue.",
        );
      }

      const data =
        (
          await response.json()
        ) as PublishingResponse;

      const loadedItems =
        Array.isArray(
          data.items,
        )
          ? data.items
          : [];

      setItems(
        loadedItems,
      );

      const initialScheduleValues:
        Record<
          string,
          string
        > =
        {};

      loadedItems.forEach(
        (
          item,
        ) => {
          if (
            item.scheduledFor
          ) {
            initialScheduleValues[
              item.id
            ] =
              toDateTimeLocal(
                item.scheduledFor,
              );
          }
        },
      );

      setScheduleValues(
        initialScheduleValues,
      );
    } catch (
      error
    ) {
      console.error(
        "Publishing Queue load failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not load the Publishing Queue.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function publishToYouTube(
    item:
      PublishingItem,
  ) {
    if (
      !item.media
    ) {
      setMessage(
        "This package does not have a finished video file yet. Upload or record a video before sending it to YouTube.",
      );

      return;
    }

    const confirmed = window.confirm(
      `Send "${item.title || "this approved video"}" to YouTube as PRIVATE? It will not be publicly visible until you change it on YouTube.`,
    );

    if (!confirmed) {
      setMessage("YouTube upload canceled. Nothing was published.");
      return;
    }

    setWorkingId(
      item.id,
    );

    setMessage(
      "",
    );

    try {
      const description =
        [
          item.caption,

          "",

          item.callToAction,

          "",

          item.destinationLink,

          "",

          item.hashtags.join(
            " ",
          ),
        ]
          .filter(
            Boolean,
          )
          .join(
            "\n",
          );

      const response =
        await fetch(
          "/api/youtube/upload",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  item.title,

                description,

                tags:
                  item.hashtags.map(
                    (
                      hashtag,
                    ) =>
                      hashtag.replace(
                        /^#/,
                        "",
                      ),
                  ),

                videoPath:
                  item.media.filePath,

                storedFileName:
                  item.media.storedFileName,

                mimeType:
                  item.media.mimeType,

                privacyStatus:
                  "private",
              }),
          },
        );

      const data =
        (
          await response.json()
        ) as YouTubeUploadResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "KWEVORA could not send this package to YouTube.",
        );
      }

      const videoId =
        typeof data.video?.id ===
        "string"
          ? data.video.id
          : "";

      if (
        !videoId
      ) {
        throw new Error(
          "YouTube accepted the upload, but KWEVORA did not receive a video ID.",
        );
      }

      const videoUrl =
        typeof data.video?.url ===
        "string"
          ? data.video.url
          : `https://www.youtube.com/watch?v=${videoId}`;

      const publishedResponse =
        await fetch(
          "/api/publishing",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "mark_published",

                id:
                  item.id,

                publication: {
                  platform:
                    "youtube",

                  externalId:
                    videoId,

                  url:
                    videoUrl,

                  publishedAt:
                    new Date()
                      .toISOString(),

                  channelId:
                    data.video
                      ?.channelId ??
                    "",

                  channelName:
                    data.video
                      ?.channelTitle ??
                    "",

                  privacyStatus:
                    data.video
                      ?.privacyStatus ??
                    "private",
                },
              }),
          },
        );

      const publishedData =
        await publishedResponse.json();

      if (
        !publishedResponse.ok ||
        !publishedData.success
      ) {
        throw new Error(
          publishedData.message ||
          "The video reached YouTube, but KWEVORA could not save the platform publication.",
        );
      }

      replaceItem(
        publishedData.item,
      );

      setMessage(
        videoUrl
          ? `Video uploaded privately to YouTube and linked to KAI: ${videoUrl}`
          : "Video uploaded privately to YouTube and linked to KAI.",
      );
    } catch (
      error
    ) {
      console.error(
        "YouTube publishing failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not send this package to YouTube.",
      );
    } finally {
      setWorkingId(
        null,
      );
    }
  }

  async function scheduleItem(
    item:
      PublishingItem,
  ) {
    const localDateTime =
      scheduleValues[
        item.id
      ];

    if (
      !localDateTime
    ) {
      setMessage(
        "Choose a publishing date and time first.",
      );

      return;
    }

    const scheduledDate =
      new Date(
        localDateTime,
      );

    if (
      Number.isNaN(
        scheduledDate.getTime(),
      )
    ) {
      setMessage(
        "Choose a valid publishing date and time.",
      );

      return;
    }

    setWorkingId(
      item.id,
    );

    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/publishing",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "schedule",

                id:
                  item.id,

                scheduledFor:
                  scheduledDate.toISOString(),
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "KWEVORA could not schedule this package.",
        );
      }

      replaceItem(
        data.item,
      );

      setMessage(
        "Content package scheduled.",
      );
    } catch (
      error
    ) {
      console.error(
        "Scheduling failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not schedule this package.",
      );
    } finally {
      setWorkingId(
        null,
      );
    }
  }

  async function markPublished(
    item:
      PublishingItem,
  ) {
    setWorkingId(
      item.id,
    );

    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/publishing",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "mark_published",

                id:
                  item.id,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "KWEVORA could not mark this package as published.",
        );
      }

      replaceItem(
        data.item,
      );

      setMessage(
        "Content package marked as published.",
      );
    } catch (
      error
    ) {
      console.error(
        "Published status update failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not mark this package as published.",
      );
    } finally {
      setWorkingId(
        null,
      );
    }
  }

  async function removeItem(
    item:
      PublishingItem,
  ) {
    const confirmed =
      window.confirm(
        `Remove "${item.title}" from the Publishing Queue?`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    setWorkingId(
      item.id,
    );

    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/publishing",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "remove",

                id:
                  item.id,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
          "KWEVORA could not remove this package.",
        );
      }

      setItems(
        (
          currentItems,
        ) =>
          currentItems.filter(
            (
              currentItem,
            ) =>
              currentItem.id !==
              item.id,
          ),
      );

      setMessage(
        "Content package removed from the Publishing Queue.",
      );
    } catch (
      error
    ) {
      console.error(
        "Publishing Queue removal failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not remove this package.",
      );
    } finally {
      setWorkingId(
        null,
      );
    }
  }

  function replaceItem(
    updatedItem:
      PublishingItem,
  ) {
    setItems(
      (
        currentItems,
      ) =>
        currentItems.map(
          (
            item,
          ) =>
            item.id ===
            updatedItem.id
              ? updatedItem
              : item,
        ),
    );
  }

  return (
    <main className="min-h-screen bg-[#07040f] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-cyan-300">
            Publishing Queue
          </p>

          <h1 className="mt-4 text-5xl font-black">
            Approved and ready to go.
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Schedule, publish, and track every content package you have approved.
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="font-bold text-gray-300">
              Loading the Publishing Queue...
            </p>
          </section>
        ) : null}

        {message ? (
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
            <p className="font-bold text-cyan-100">
              {message}
            </p>
          </section>
        ) : null}

        {!loading &&
        items.length ===
          0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-gray-400">
              Nothing Ready
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Your Publishing Queue is empty.
            </h2>

            <p className="mt-3 text-gray-300">
              Approve a content package in the Review Queue and KAI will move it here.
            </p>
          </section>
        ) : null}

        <div className="space-y-8">
          {items.map(
            (
              item,
            ) => {
              const isWorking =
                workingId ===
                item.id;

              const hashtags =
                Array.isArray(
                  item.hashtags,
                )
                  ? item.hashtags
                  : [];

              const platforms =
                Array.isArray(
                  item.recommendedPlatforms,
                )
                  ? item.recommendedPlatforms
                  : [];

              const scenes =
                Array.isArray(
                  item.videoPlan
                    ?.scenes,
                )
                  ? item.videoPlan.scenes
                  : [];

              const publications =
                Array.isArray(
                  item.publications,
                )
                  ? item.publications
                  : [];

              return (
                <article
                  key={
                    item.id
                  }
                  className="rounded-3xl border border-white/10 bg-white/5 p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">
                        {statusLabel(
                          item.status,
                        )}
                      </p>

                      <h2 className="mt-3 text-3xl font-black">
                        {item.title ||
                          "Untitled Content Package"}
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        Approved{" "}
                        {formatDate(
                          item.approvedAt,
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        item.status
                      }
                    />
                  </div>

                  {item.scheduledFor ? (
                    <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                        Scheduled Publishing Time
                      </p>

                      <p className="mt-2 text-lg font-black text-amber-100">
                        {formatDate(
                          item.scheduledFor,
                        )}
                      </p>
                    </section>
                  ) : null}

                  {item.publishedAt ? (
                    <section className="mt-6 rounded-2xl border border-green-400/30 bg-green-400/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
                        Published
                      </p>

                      <p className="mt-2 text-lg font-black text-green-100">
                        {formatDate(
                          item.publishedAt,
                        )}
                      </p>
                    </section>
                  ) : null}

                  {publications.length >
                  0 ? (
                    <section className="mt-6 rounded-2xl border border-blue-400/30 bg-blue-400/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                        Platform Publications
                      </p>

                      <div className="mt-4 space-y-3">
                        {publications.map(
                          (
                            publication,
                          ) => (
                            <div
                              key={`${publication.platform}-${publication.externalId}`}
                              className="rounded-xl border border-white/10 bg-black/20 p-4"
                            >
                              <p className="font-black capitalize">
                                {
                                  publication.platform
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-400">
                                ID:{" "}
                                {
                                  publication.externalId
                                }
                              </p>

                              {publication.channelName ? (
                                <p className="mt-1 text-sm text-gray-400">
                                  Channel:{" "}
                                  {
                                    publication.channelName
                                  }
                                </p>
                              ) : null}

                              {publication.privacyStatus ? (
                                <p className="mt-1 text-sm text-gray-400">
                                  Privacy:{" "}
                                  {
                                    publication.privacyStatus
                                  }
                                </p>
                              ) : null}

                              {publication.url ? (
                                <a
                                  href={
                                    publication.url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-block font-bold text-blue-300 underline"
                                >
                                  Open on{" "}
                                  {
                                    publication.platform
                                  }
                                </a>
                              ) : null}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  <div className="mt-8 grid gap-8">
                    <section className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-6">
                      <SectionHeading
                        eyebrow="Publishing Strategy"
                        title="Where and why KAI recommends publishing"
                      />

                      <div className="mt-6 grid gap-5 lg:grid-cols-2">
                        <PublishingBlock
                          label="Video Idea"
                          value={
                            item.idea
                          }
                        />

                        <PublishingBlock
                          label="Why KAI Chose This"
                          value={
                            item.reason
                          }
                        />

                        <PublishingBlock
                          label="Target Audience"
                          value={
                            item.audience
                          }
                        />

                        <PublishingBlock
                          label="Content Format"
                          value={formatLabel(
                            item.format,
                          )}
                        />
                      </div>

                      <div className="mt-5">
                        <TagList
                          label="Recommended Platforms"
                          values={
                            platforms
                          }
                          emptyMessage="No platforms were recommended."
                          itemId={
                            item.id
                          }
                          tone="cyan"
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                      <SectionHeading
                        eyebrow="Publishing Package"
                        title="Final content and promotion details"
                      />

                      <div className="mt-6 grid gap-5">
                        <PublishingBlock
                          label="Hook"
                          value={
                            item.hook
                          }
                        />

                        <PublishingBlock
                          label="Script"
                          value={
                            item.script
                          }
                        />

                        <PublishingBlock
                          label="Caption"
                          value={
                            item.caption
                          }
                        />

                        <PublishingBlock
                          label="Call To Action"
                          value={
                            item.callToAction
                          }
                        />

                        <PublishingBlock
                          label="Thumbnail Idea"
                          value={
                            item.thumbnailIdea
                          }
                        />

                        <PublishingBlock
                          label="Pinned Comment"
                          value={
                            item.pinnedComment
                          }
                        />

                        <PublishingBlock
                          label="Destination Link"
                          value={
                            item.destinationLink
                          }
                        />

                        <TagList
                          label="Hashtags"
                          values={
                            hashtags
                          }
                          emptyMessage="No hashtags were included."
                          itemId={
                            item.id
                          }
                          tone="purple"
                        />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-green-400/20 bg-green-400/5 p-6">
                      <SectionHeading
                        eyebrow="Video Plan"
                        title="Production instructions"
                      />

                      <div className="mt-6 grid gap-5">
                        <PublishingBlock
                          label="Opening Text"
                          value={
                            item.videoPlan
                              ?.openingText
                          }
                        />

                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                            Scenes
                          </p>

                          {scenes.length >
                          0 ? (
                            <div className="mt-3 space-y-3">
                              {scenes.map(
                                (
                                  scene,
                                  index,
                                ) => (
                                  <div
                                    key={`${item.id}-scene-${index}`}
                                    className="flex gap-4 rounded-xl border border-white/10 bg-black/20 p-4"
                                  >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10 text-sm font-black text-green-200">
                                      {index +
                                        1}
                                    </div>

                                    <p className="leading-7 text-white">
                                      {
                                        scene
                                      }
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <EmptyValue message="No scenes were included." />
                          )}
                        </div>

                        <PublishingBlock
                          label="Ending Text"
                          value={
                            item.videoPlan
                              ?.endingText
                          }
                        />
                      </div>
                    </section>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                    {item.status !==
                    "published" ? (
                      <>
                        <div className="min-w-[260px] flex-1">
                          <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                            Schedule Date & Time
                          </label>

                          <input
                            type="datetime-local"
                            value={
                              scheduleValues[
                                item.id
                              ] ??
                              ""
                            }
                            onChange={(
                              event,
                            ) =>
                              setScheduleValues(
                                (
                                  current,
                                ) => ({
                                  ...current,

                                  [item.id]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void scheduleItem(
                              item,
                            )
                          }
                          disabled={
                            isWorking
                          }
                          className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Schedule
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void publishToYouTube(
                              item,
                            )
                          }
                          disabled={
                            isWorking ||
                            !item.media
                          }
                          className="rounded-xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isWorking
                            ? "Uploading..."
                            : item.media
                              ? "Upload Privately to YouTube"
                              : "Video File Required"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void markPublished(
                              item,
                            )
                          }
                          disabled={
                            isWorking
                          }
                          className="rounded-xl bg-green-400 px-5 py-3 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark Published
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        void removeItem(
                          item,
                        )
                      }
                      disabled={
                        isWorking
                      }
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;

  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-xl font-black">
        {title}
      </h3>
    </div>
  );
}

function PublishingBlock({
  label,
  value,
}: {
  label: string;

  value?: string;
}) {
  const cleanValue =
    typeof value ===
    "string"
      ? value.trim()
      : "";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      {cleanValue ? (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 leading-7 text-white">
          {cleanValue}
        </p>
      ) : (
        <EmptyValue
          message={`No ${label.toLowerCase()} was included.`}
        />
      )}
    </div>
  );
}

function TagList({
  label,
  values,
  emptyMessage,
  itemId,
  tone,
}: {
  label: string;

  values: string[];

  emptyMessage: string;

  itemId: string;

  tone:
    | "purple"
    | "cyan";
}) {
  const cleanValues =
    values.filter(
      (
        value,
      ) =>
        typeof value ===
          "string" &&
        value.trim().length >
          0,
    );

  const classes =
    tone === "purple"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-200"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      {cleanValues.length >
      0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cleanValues.map(
            (
              value,
              index,
            ) => (
              <span
                key={`${itemId}-${label}-${value}-${index}`}
                className={`rounded-full border px-3 py-1 text-sm font-bold ${classes}`}
              >
                {value}
              </span>
            ),
          )}
        </div>
      ) : (
        <EmptyValue
          message={
            emptyMessage
          }
        />
      )}
    </div>
  );
}

function EmptyValue({
  message,
}: {
  message: string;
}) {
  return (
    <p className="mt-2 rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-gray-500">
      {message}
    </p>
  );
}

function StatusBadge({
  status,
}: {
  status:
    PublishingStatus;
}) {
  const classes =
    status === "published"
      ? "border-green-400/30 bg-green-400/10 text-green-200"
      : status === "scheduled"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-sm font-bold ${classes}`}
    >
      {statusLabel(
        status,
      )}
    </span>
  );
}

function statusLabel(
  value:
    PublishingStatus,
) {
  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "recently";
  }

  return date.toLocaleString();
}

function formatLabel(
  value?: string,
) {
  if (
    !value
  ) {
    return "";
  }

  return value
    .replace(
      /[-_]/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

function toDateTimeLocal(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
      offset *
        60_000,
    );

  return localDate
    .toISOString()
    .slice(
      0,
      16,
    );
}
