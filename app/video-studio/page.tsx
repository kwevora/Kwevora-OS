"use client";

import { useEffect, useMemo, useState } from "react";
import PlatformConnections from "../components/PlatformConnections";
import PublishingQueue from "../components/PublishingQueue";
import ReviewQueue from "../components/ReviewQueue";
import LiveAIGenerator from "../components/LiveAIGenerator";
import VideoCreationModes from "../components/VideoCreationModes";
import type {
  EditableFieldName,
  EditingField,
} from "../components/EditableField";
import type { KaiContentPackage } from "../core/runtime/contentGenerator";
import {
  getPlatformLabel,
  markFailed,
  markPublished,
  prepareForPublishing,
  type PublishingQueueItem,
} from "../core/runtime/publishingQueue";

const LINK_KEY = "kwevora-money-mode-link";
const PACKAGES_KEY = "kwevora-money-mode-packages";
const PUBLISHING_QUEUE_KEY = "kwevora-publishing-queue";

type RecordedReviewItem = {
  id: string;
  createdAt: string;
  status: "needs_review";
  idea: string;
  hook: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  media?: {
    source: "recording" | "upload";
    fileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
    filePath: string;
  };
};

type ReviewQueueResponse = {
  success: boolean;
  items?: RecordedReviewItem[];
  message?: string;
};

function mapRecordedItemToPackage(
  item: RecordedReviewItem
): KaiContentPackage {
  const fileSize =
    typeof item.media?.size === "number"
      ? `${(item.media.size / 1024 / 1024).toFixed(2)} MB`
      : "File size unavailable";

  return {
    id: item.id,
    createdAt: item.createdAt,
    status: "waiting_review",
    platform: "tiktok" as KaiContentPackage["platform"],
    title: item.title || "New KWEVORA Recording",
    hook:
      item.hook ||
      "KAI needs to prepare this recording for publishing.",
    script: item.script
      ? [item.script]
      : [
          "Original video received. KAI processing has not started yet.",
        ],
    caption:
      item.caption ||
      "KAI is preparing this video for review and publishing.",
    hashtags:
      Array.isArray(item.hashtags) && item.hashtags.length > 0
        ? item.hashtags
        : ["#KWEVORA"],
    thumbnailIdea: item.media
      ? `${item.media.source === "recording" ? "Recorded" : "Uploaded"} video: ${
          item.media.fileName
        } · ${fileSize}`
      : "KAI will prepare a thumbnail recommendation.",
    cta: "Review and approve this video for publishing.",
    destinationLink: "",
    pinnedComment: "",
    reason:
      item.idea ||
      "This video was sent to KAI and is waiting for review.",
    media: item.media,
  };
}

export default function VideoStudioPage() {
  const [destinationLink, setDestinationLink] = useState("");
  const [packages, setPackages] = useState<KaiContentPackage[]>([]);
  const [recordedPackages, setRecordedPackages] = useState<
    KaiContentPackage[]
  >([]);
  const [publishingQueue, setPublishingQueue] = useState<
    PublishingQueueItem[]
  >([]);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewQueueLoading, setReviewQueueLoading] =
    useState(true);
  const [editing, setEditing] = useState<EditingField | null>(
    null
  );

  const allReviewPackages = useMemo(() => {
    const recordedIds = new Set(
      recordedPackages.map((item) => item.id)
    );

    return [
      ...recordedPackages,
      ...packages.filter((item) => !recordedIds.has(item.id)),
    ];
  }, [packages, recordedPackages]);

  useEffect(() => {
    const savedLink = window.localStorage.getItem(LINK_KEY) ?? "";
    const savedPackages =
      window.localStorage.getItem(PACKAGES_KEY);
    const savedQueue = window.localStorage.getItem(
      PUBLISHING_QUEUE_KEY
    );

    setDestinationLink(savedLink);

    try {
      setPackages(savedPackages ? JSON.parse(savedPackages) : []);
    } catch {
      setPackages([]);
    }

    try {
      setPublishingQueue(
        savedQueue ? JSON.parse(savedQueue) : []
      );
    } catch {
      setPublishingQueue([]);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecordedReviewItems(
      showLoading = false
    ) {
      if (showLoading) {
        setReviewQueueLoading(true);
      }

      try {
        const response = await fetch("/api/kai/review-queue", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const data =
          (await response.json()) as ReviewQueueResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Review Queue could not be loaded."
          );
        }

        if (!active) {
          return;
        }

        const incomingPackages = (data.items ?? []).map(
          mapRecordedItemToPackage
        );

        setRecordedPackages((currentPackages) => {
          const currentById = new Map(
            currentPackages.map((item) => [item.id, item])
          );

          return incomingPackages.map((incomingItem) => {
            const currentItem = currentById.get(incomingItem.id);

            if (!currentItem) {
              return incomingItem;
            }

            return {
              ...incomingItem,
              status: currentItem.status,
              title: currentItem.title,
              hook: currentItem.hook,
              script: currentItem.script,
              caption: currentItem.caption,
              hashtags: currentItem.hashtags,
              thumbnailIdea: currentItem.thumbnailIdea,
              cta: currentItem.cta,
              destinationLink: currentItem.destinationLink,
              pinnedComment: currentItem.pinnedComment,
              media: incomingItem.media,
            };
          });
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "Review Queue could not be loaded."
        );
      } finally {
        if (active) {
          setReviewQueueLoading(false);
        }
      }
    }

    loadRecordedReviewItems(true);

    const refreshTimer = window.setInterval(() => {
      loadRecordedReviewItems(false);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  function savePackages(next: KaiContentPackage[]) {
    setPackages(next);
    window.localStorage.setItem(
      PACKAGES_KEY,
      JSON.stringify(next)
    );
  }

  function saveQueue(next: PublishingQueueItem[]) {
    setPublishingQueue(next);
    window.localStorage.setItem(
      PUBLISHING_QUEUE_KEY,
      JSON.stringify(next)
    );
  }

  async function generatePackages() {
    setLoading(true);
    setMessage("KAI is creating fresh Money Mode content...");

    try {
      window.localStorage.setItem(
        LINK_KEY,
        destinationLink
      );

      const response = await fetch("/api/kai/money-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationLink,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Money Mode generation failed."
        );
      }

      const nextPackages: KaiContentPackage[] = (
        data.packages ?? []
      ).map((item: any) => ({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "waiting_review",
        platform: item.platform,
        title: item.title ?? "Untitled content package",
        hook: item.hook ?? "",
        script: Array.isArray(item.script)
          ? item.script
          : [],
        caption: item.caption ?? "",
        hashtags: Array.isArray(item.hashtags)
          ? item.hashtags
          : [],
        thumbnailIdea: item.thumbnailIdea ?? "",
        cta: item.cta ?? "",
        destinationLink:
          item.destinationLink || destinationLink,
        pinnedComment: item.pinnedComment ?? "",
        reason:
          item.reason ??
          "KAI created this package to support today’s goal.",
      }));

      savePackages(nextPackages);
      setEditing(null);

      setMessage(
        `KAI created ${nextPackages.length} fresh content package${
          nextPackages.length === 1 ? "" : "s"
        }.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Money Mode generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function updatePackageField(
    packageId: string,
    field: EditableFieldName,
    value: string
  ) {
    function updateItem(
      item: KaiContentPackage
    ): KaiContentPackage {
      if (item.id !== packageId) {
        return item;
      }

      if (field === "hashtags") {
        return {
          ...item,
          hashtags: value
            .split(/\s+/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        };
      }

      if (field === "script") {
        return {
          ...item,
          script: value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        };
      }

      return {
        ...item,
        [field]: value,
      };
    }

    const isRecordedPackage = recordedPackages.some(
      (item) => item.id === packageId
    );

    if (isRecordedPackage) {
      setRecordedPackages((current) =>
        current.map(updateItem)
      );
      return;
    }

    savePackages(packages.map(updateItem));
  }

  function approvePackage(id: string) {
    const approvedPackage = allReviewPackages.find(
      (item) => item.id === id
    );

    if (!approvedPackage) {
      return;
    }

    const updatedPackage: KaiContentPackage = {
      ...approvedPackage,
      status: "ready_to_publish",
    };

    const publishingItem =
      prepareForPublishing([updatedPackage])[0];

    if (recordedPackages.some((item) => item.id === id)) {
      setRecordedPackages((current) =>
        current.map((item) =>
          item.id === id ? updatedPackage : item
        )
      );
    } else {
      savePackages(
        packages.map((item) =>
          item.id === id ? updatedPackage : item
        )
      );
    }

    const queueWithoutDuplicate = publishingQueue.filter(
      (item) => item.id !== id
    );

    saveQueue([publishingItem, ...queueWithoutDuplicate]);
    setEditing(null);

    setMessage(
      `${getPlatformLabel(
        updatedPackage.platform
      )} package moved to the Publishing Queue.`
    );
  }

  function approveAll() {
    const approvedPackages: KaiContentPackage[] =
      allReviewPackages.map((item) => ({
        ...item,
        status: "ready_to_publish",
      }));

    const approvedRecordedIds = new Set(
      recordedPackages.map((item) => item.id)
    );

    const nextRecordedPackages = approvedPackages.filter(
      (item) => approvedRecordedIds.has(item.id)
    );

    const nextLocalPackages = approvedPackages.filter(
      (item) => !approvedRecordedIds.has(item.id)
    );

    const nextQueue = prepareForPublishing(approvedPackages);

    setRecordedPackages(nextRecordedPackages);
    savePackages(nextLocalPackages);
    saveQueue(nextQueue);
    setEditing(null);

    setMessage(
      "All content packages were added to the Publishing Queue."
    );
  }

  function rejectPackage(id: string) {
    const rejected = allReviewPackages.find(
      (item) => item.id === id
    );

    if (recordedPackages.some((item) => item.id === id)) {
      setRecordedPackages((current) =>
        current.filter((item) => item.id !== id)
      );
    } else {
      savePackages(
        packages.filter((item) => item.id !== id)
      );
    }

    setEditing(null);

    setMessage(
      rejected
        ? `${getPlatformLabel(
            rejected.platform
          )} package removed from review.`
        : "Package removed from review."
    );
  }

  function markQueueItemPublished(id: string) {
    saveQueue(markPublished(publishingQueue, id));
    setMessage("Publishing item marked as published.");
  }

  function markQueueItemFailed(id: string) {
    saveQueue(markFailed(publishingQueue, id));
    setMessage(
      "Publishing item marked as needing attention."
    );
  }

  function clearQueue() {
    saveQueue([]);
    setMessage("Publishing Queue cleared.");
  }

  function buildFullPublishingPackage(
    item: KaiContentPackage
  ) {
    return [
      `PLATFORM: ${getPlatformLabel(
        item.platform
      ).toUpperCase()}`,
      "",
      `TITLE: ${item.title}`,
      "",
      `HOOK: ${item.hook}`,
      "",
      "SCRIPT:",
      item.script
        .map((line, index) => `${index + 1}. ${line}`)
        .join("\n"),
      "",
      `CAPTION: ${item.caption}`,
      "",
      `HASHTAGS: ${item.hashtags.join(" ")}`,
      "",
      `THUMBNAIL IDEA: ${item.thumbnailIdea}`,
      "",
      `CTA: ${item.cta}`,
      "",
      `DESTINATION LINK: ${item.destinationLink}`,
      "",
      `PINNED COMMENT: ${item.pinnedComment}`,
    ].join("\n");
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(label);
      setMessage(`${label} copied.`);

      window.setTimeout(() => {
        setCopied("");
      }, 1500);
    } catch {
      setMessage(
        "Copy failed. Please copy the text manually."
      );
    }
  }

  function copyReviewPackage(item: KaiContentPackage) {
    copyText(
      `Full ${getPlatformLabel(item.platform)} Package`,
      buildFullPublishingPackage(item)
    );
  }

  function copyPublishingPackage(
    item: PublishingQueueItem
  ) {
    copyText(
      `Full ${getPlatformLabel(item.platform)} Package`,
      buildFullPublishingPackage(item)
    );
  }

  return (
    <main className="min-h-screen bg-[#07040f] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-green-500/30 bg-green-950/10 p-8">
          <p className="text-sm font-bold tracking-[0.35em] text-green-300">
            LIVE MONEY MODE VIDEO STUDIO
          </p>

          <h1 className="mt-4 text-5xl font-black">
            Generate fresh content that points to your offer.
          </h1>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-300">
            KAI creates platform-ready content, lets you
            review and edit it, then moves approved packages
            into the Publishing Queue.
          </p>

          <VideoCreationModes />

          <div className="mt-10" />

          <LiveAIGenerator />

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
            <label className="text-sm font-bold tracking-[0.25em] text-green-300">
              PRODUCT / STAN STORE / FREE GUIDE LINK
            </label>

            <input
              value={destinationLink}
              onChange={(event) =>
                setDestinationLink(event.target.value)
              }
              placeholder="Paste your Stan Store, free guide, or product link here"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-green-400"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generatePackages}
                disabled={loading}
                className="rounded-xl bg-green-600 px-6 py-4 font-black transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "KAI Is Generating..."
                  : "Generate With Live AI"}
              </button>

              {allReviewPackages.length > 0 && (
                <button
                  type="button"
                  onClick={approveAll}
                  className="rounded-xl bg-cyan-600 px-6 py-4 font-black transition hover:bg-cyan-500"
                >
                  Approve All For Publishing
                </button>
              )}
            </div>

            {reviewQueueLoading && (
              <p className="mt-5 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 font-bold text-purple-300">
                KAI is loading the Review Queue...
              </p>
            )}

            {message && (
              <p className="mt-5 rounded-xl border border-green-500/30 bg-green-950/20 p-4 font-bold text-green-300">
                {message}
              </p>
            )}
          </div>
        </section>

        <PlatformConnections />

        <PublishingQueue
          items={publishingQueue}
          copied={copied}
          onClear={clearQueue}
          onCopyPackage={copyPublishingPackage}
          onMarkPublished={markQueueItemPublished}
          onMarkFailed={markQueueItemFailed}
        />

        <ReviewQueue
          packages={allReviewPackages}
          editing={editing}
          onStartEdit={setEditing}
          onChange={updatePackageField}
          onApprove={approvePackage}
          onApproveAll={approveAll}
          onReject={rejectPackage}
          onCopyEverything={copyReviewPackage}
        />
      </div>
    </main>
  );
}