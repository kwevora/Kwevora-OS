import type { KaiContentPackage } from "./contentGenerator";

export type PublishingPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube_shorts";

export type PublishingStatus =
  | "ready"
  | "needs_manual_post"
  | "published"
  | "failed";

export type PublishingQueueItem = KaiContentPackage & {
  publishingStatus: PublishingStatus;
  scheduledFor: string;
  publishedAt: string | null;
  publishNote: string;
};

export function prepareForPublishing(
  packages: KaiContentPackage[]
): PublishingQueueItem[] {
  return packages.map((item) => ({
    ...item,
    status: "ready_to_publish",
    publishingStatus: "needs_manual_post",
    scheduledFor: "Today",
    publishedAt: null,
    publishNote:
      "Direct publishing requires platform account connections. For now, KAI prepared this package so Kent can copy and post fast.",
  }));
}

export function markPublished(
  queue: PublishingQueueItem[],
  id: string
): PublishingQueueItem[] {
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          publishingStatus: "published",
          publishedAt: new Date().toISOString(),
          publishNote: "Kent marked this content as published.",
        }
      : item
  );
}

export function markFailed(
  queue: PublishingQueueItem[],
  id: string
): PublishingQueueItem[] {
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          publishingStatus: "failed",
          publishNote: "Publishing needs attention before this can go live.",
        }
      : item
  );
}

export function getPlatformLabel(platform: PublishingPlatform | string) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  if (platform === "facebook") return "Facebook";
  if (platform === "youtube_shorts") return "YouTube Shorts";

  return platform;
}