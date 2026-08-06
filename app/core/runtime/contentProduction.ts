import type { KaiContentIdea } from "./contentGenerator";

export type ContentPlatform =
  | "tiktok"
  | "instagram_reels"
  | "youtube_shorts"
  | "facebook_reels";

export type ContentPackageStatus =
  | "draft"
  | "waiting_review"
  | "approved"
  | "ready_to_publish"
  | "published";

export type PlatformContent = {
  platform: ContentPlatform;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  cta: string;
  pinnedComment: string;
  destinationLink: string;
};

export type ContentPackage = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ContentPackageStatus;
  title: string;
  coreIdea: string;
  offerName: string;
  destinationLink: string;
  thumbnailIdeas: string[];
  productionNotes: string[];
  platformVersions: PlatformContent[];
};

export type WorkQueueStatus =
  | "planned"
  | "queued"
  | "working"
  | "waiting_on_kent"
  | "approved"
  | "completed";

export type WorkQueueItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  status: WorkQueueStatus;
  priority: "high" | "medium" | "low";
  reason: string;
  unlocksNext: string;
  progress: number;
};

export const DEFAULT_OFFER_NAME = "The Escape Plan";
export const DEFAULT_DESTINATION_LINK = "Your Stan Store / link in bio";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function platformLabel(platform: ContentPlatform) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram_reels") return "Instagram Reels";
  if (platform === "youtube_shorts") return "YouTube Shorts";
  return "Facebook Reels";
}

function hashtagsFor(platform: ContentPlatform) {
  const base = ["#onestepcloser", "#digitalproducts", "#sidehustle"];

  if (platform === "tiktok") {
    return [...base, "#tiktokbusiness", "#makemoneyonline"];
  }

  if (platform === "youtube_shorts") {
    return [...base, "#shorts", "#onlinebusiness"];
  }

  if (platform === "facebook_reels") {
    return [...base, "#facebookreels", "#workfromhome"];
  }

  return [...base, "#reels", "#creatorbusiness"];
}

function buildPlatformVersion(
  idea: KaiContentIdea,
  platform: ContentPlatform,
  offerName: string,
  destinationLink: string
): PlatformContent {
  const label = platformLabel(platform);
  const cta =
    platform === "youtube_shorts"
      ? `Check the link connected to this video and grab ${offerName}.`
      : `Grab ${offerName} through the link in my bio.`;

  return {
    platform,
    hook: idea.hook,
    script: `${idea.hook}\n\nMost people stay stuck because they keep waiting for the perfect time.\n\nThe move is smaller than that. Pick one step. Do it today. Then repeat it tomorrow.\n\nThat is how you build your way out, one decision at a time.`,
    caption:
      platform === "tiktok"
        ? `${idea.caption}\n\nIf you are trying to build an online income one step at a time, ${cta}`
        : `${idea.caption}\n\n${cta}`,
    hashtags: hashtagsFor(platform),
    cta,
    pinnedComment: `Start here: ${destinationLink}`,
    destinationLink,
  };
}

export function buildContentPackagesFromIdeas(input: {
  ideas: KaiContentIdea[];
  offerName?: string;
  destinationLink?: string;
}): ContentPackage[] {
  const offerName = input.offerName || DEFAULT_OFFER_NAME;
  const destinationLink = input.destinationLink || DEFAULT_DESTINATION_LINK;

  return input.ideas.slice(0, 3).map((idea) => {
    const createdAt = now();

    return {
      id: id(),
      createdAt,
      updatedAt: createdAt,
      status: "waiting_review",
      title: idea.title,
      coreIdea: idea.reason,
      offerName,
      destinationLink,
      thumbnailIdeas: [
        `Bold text: “${idea.title}” over a dark cinematic background`,
        "Close-up phone/laptop workspace with large white text overlay",
        "Before/after style thumbnail showing overwhelmed vs prepared",
      ],
      productionNotes: [
        "Use 9:16 vertical format.",
        "Keep total length between 20 and 35 seconds.",
        "Use large text overlays so the video works without sound.",
        "Point viewers toward the offer using the CTA and pinned comment.",
      ],
      platformVersions: [
        buildPlatformVersion(idea, "tiktok", offerName, destinationLink),
        buildPlatformVersion(idea, "instagram_reels", offerName, destinationLink),
        buildPlatformVersion(idea, "youtube_shorts", offerName, destinationLink),
        buildPlatformVersion(idea, "facebook_reels", offerName, destinationLink),
      ],
    };
  });
}

export function buildMoneyModeWorkQueue(packages: ContentPackage[]): WorkQueueItem[] {
  const createdAt = now();
  const packageCount = packages.length;

  return [
    {
      id: id(),
      createdAt,
      updatedAt: createdAt,
      title: "Create today’s content packages",
      status: packageCount > 0 ? "completed" : "queued",
      priority: "high",
      reason:
        "Content is the fastest path to attention, clicks, and digital product sales.",
      unlocksNext: "Review and approve the strongest content package.",
      progress: packageCount > 0 ? 100 : 0,
    },
    {
      id: id(),
      createdAt,
      updatedAt: createdAt,
      title: "Review packages for approval",
      status: packageCount > 0 ? "waiting_on_kent" : "planned",
      priority: "high",
      reason:
        "KAI should not publish or prepare final posting assets without Kent’s approval.",
      unlocksNext: "Approved packages move to Ready to Publish.",
      progress: packageCount > 0 ? 60 : 0,
    },
    {
      id: id(),
      createdAt,
      updatedAt: createdAt,
      title: "Prepare publishing assets",
      status: "queued",
      priority: "medium",
      reason:
        "Each platform needs its own caption, CTA, hashtags, and link strategy.",
      unlocksNext: "Kent can post in minutes instead of starting from scratch.",
      progress: 25,
    },
  ];
}

export function updatePackageStatus(
  packages: ContentPackage[],
  packageId: string,
  status: ContentPackageStatus
): ContentPackage[] {
  return packages.map((item) =>
    item.id === packageId
      ? {
          ...item,
          status,
          updatedAt: now(),
        }
      : item
  );
}
