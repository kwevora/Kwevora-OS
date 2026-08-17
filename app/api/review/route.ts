import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { autonomousContentCycleEngine } from "../../lib/AutonomousContentCycleEngine";
import { growthPlanExecutionEngine } from "../../lib/GrowthPlanExecutionEngine";
import type { ContentPackage } from "../../lib/ContentIntelligenceEngine";
import { growthPlanAuthorizationEngine } from "../../lib/GrowthPlanAuthorizationEngine";
import { autonomousPublishingHandoffEngine } from "../../lib/AutonomousPublishingHandoffEngine";
import { DurableQueueRepository } from "../../lib/database/DurableQueueRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
};

type MediaFile = {
  source: "recording" | "upload" | "generated";
  fileName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  filePath: string;
  videoUrl?: string;
};

type ReviewStatus = "needs_review" | "approved";

type ReviewFormat = "faceless_video" | "record_yourself" | "upload_video";

export type ReviewItem = {
  id: string;
  createdAt: string;
  status: ReviewStatus;

  executionPlanId: string;

  idea: string;
  hook: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];

  thumbnailIdea: string;
  callToAction: string;
  audience: string;
  recommendedPlatforms: string[];

  videoPlan: VideoPlan;

  reason: string;

  format: ReviewFormat;

  destinationLink: string;
  pinnedComment: string;

  media?: MediaFile;
  growthPlan?: ContentPackage["growthPlan"];
  adaptiveCreation?: ContentPackage["adaptiveCreation"];
  videoProduction?: {
    videoId: string;
    status: "ready_for_review";
    videoUrl: string;
    direction?: import("../../remotion/types").AdaptiveVideoDirection;
    whyKaiDirectedItThisWay?: string;
    reviewRequired: true;
    currentVersion?: number;
    approvedVersion?: number;
    productionPackage?: import("../../remotion/types").VideoProductionPackage;
    versions?: Array<{
      version: number;
      videoId: string;
      videoUrl: string;
      outputLocation: string;
      createdAt: string;
      changeType: string;
      request: string;
      changes: string[];
      platform: string;
    }>;
  };
  videoDirectionFeedback?: string;
  platformApprovals?: Record<
    string,
    {
      platform: string;
      version: number;
      videoId: string;
      videoUrl: string;
      outputLocation: string;
      approvedAt: string;
    }
  >;
};

type PublishingItem = {
  id: string;
  createdAt: string;
  approvedAt: string;
  updatedAt: string;

  status: "approved" | "ready_to_publish" | "scheduled" | "published";

  executionPlanId: string;

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
  recommendedPlatforms: string[];

  videoPlan: {
    openingText: string;
    scenes: string[];
    endingText: string;
  };

  format: string;

  destinationLink: string;
  pinnedComment: string;

  scheduledFor: string;
  publishedAt: string;

  media?: MediaFile;
  growthPlan?: ContentPackage["growthPlan"];
  videoVersionLock?: {
    version: number;
    videoId: string;
    videoUrl: string;
    lockedAt: string;
  };
  platformApprovals?: ReviewItem["platformApprovals"];
};

const dataFolder = path.join(process.cwd(), "data");

const reviewFile = path.join(dataFolder, "review-queue.json");

const publishingFile = path.join(dataFolder, "publishing-queue.json");

const reviewQueueRepository = new DurableQueueRepository<ReviewItem>(
  "review_queue",
  "review-queue.json",
);

const publishingQueueRepository = new DurableQueueRepository<PublishingItem>(
  "publishing_queue",
  "publishing-queue.json",
);

async function ensureDataFile(file: string) {
  await fs.mkdir(dataFolder, {
    recursive: true,
  });

  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, "[]", "utf8");
  }
}

async function readJson<T>(file: string): Promise<T[]> {
  if (file === reviewFile) {
    return (await reviewQueueRepository.read()) as T[];
  }

  if (file === publishingFile) {
    return (await publishingQueueRepository.read()) as T[];
  }

  await ensureDataFile(file);

  try {
    const text = await fs.readFile(file, "utf8");

    const parsed: unknown = JSON.parse(text);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`Could not read ${file}:`, error);

    return [];
  }
}

async function writeJson(file: string, data: unknown) {
  if (file === reviewFile && Array.isArray(data)) {
    await reviewQueueRepository.write(data as ReviewItem[]);
    return;
  }

  if (file === publishingFile && Array.isArray(data)) {
    await publishingQueueRepository.write(data as PublishingItem[]);
    return;
  }

  await ensureDataFile(file);

  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanFormat(value: unknown): ReviewFormat {
  if (
    value === "record_yourself" ||
    value === "upload_video" ||
    value === "faceless_video"
  ) {
    return value;
  }

  return "faceless_video";
}

function cleanVideoPlan(value: unknown): VideoPlan {
  if (!value || typeof value !== "object") {
    return {
      openingText: "",
      scenes: [],
      endingText: "",
      estimatedLengthSeconds: 30,
    };
  }

  const plan = value as Record<string, unknown>;

  return {
    openingText: cleanString(plan.openingText),

    scenes: cleanStringArray(plan.scenes),

    endingText: cleanString(plan.endingText),

    estimatedLengthSeconds:
      typeof plan.estimatedLengthSeconds === "number" &&
      Number.isFinite(plan.estimatedLengthSeconds)
        ? plan.estimatedLengthSeconds
        : 30,
  };
}

function cleanMedia(value: unknown): MediaFile | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const media = value as Record<string, unknown>;

  const source =
    media.source === "upload"
      ? "upload"
      : media.source === "generated"
        ? "generated"
        : media.source === "recording"
          ? "recording"
          : null;

  const fileName = cleanString(media.fileName);

  const storedFileName = cleanString(media.storedFileName);

  const mimeType = cleanString(media.mimeType);

  const filePath = cleanString(media.filePath);

  const size =
    typeof media.size === "number" && Number.isFinite(media.size)
      ? media.size
      : 0;

  if (!source || !fileName || !storedFileName || !mimeType || !filePath) {
    return undefined;
  }

  return {
    source,
    fileName,
    storedFileName,
    mimeType,
    size,
    filePath,
  };
}

async function createPublishingItem(item: ReviewItem): Promise<PublishingItem> {
  const now = new Date().toISOString();
  const schedulingPermission = await growthPlanAuthorizationEngine.decision(
    item.executionPlanId,
    "schedule",
  );

  return {
    id: item.id,

    createdAt: item.createdAt,

    approvedAt: now,

    updatedAt: now,

    status:
      item.growthPlan?.scheduledFor && schedulingPermission.allowed
        ? "scheduled"
        : "ready_to_publish",

    executionPlanId: item.executionPlanId,

    idea: item.idea,

    reason: item.reason,

    hook: item.hook,

    title: item.title,

    script: item.script,

    caption: item.caption,

    hashtags: item.hashtags,

    thumbnailIdea: item.thumbnailIdea,

    callToAction: item.callToAction,

    audience: item.audience,

    recommendedPlatforms: item.recommendedPlatforms,

    videoPlan: {
      openingText: item.videoPlan?.openingText ?? "",

      scenes: Array.isArray(item.videoPlan?.scenes)
        ? item.videoPlan.scenes
        : [],

      endingText: item.videoPlan?.endingText ?? "",
    },

    format: item.format,

    destinationLink: item.destinationLink,

    pinnedComment: item.pinnedComment,

    scheduledFor: schedulingPermission.allowed
      ? (item.growthPlan?.scheduledFor ?? "")
      : "",

    publishedAt: "",

    media: item.media,

    growthPlan: item.growthPlan,

    videoVersionLock:
      item.videoProduction && item.media
        ? {
            version: item.videoProduction.currentVersion ?? 1,
            videoId: item.videoProduction.videoId,
            videoUrl: item.media.videoUrl ?? item.videoProduction.videoUrl,
            lockedAt: now,
          }
        : undefined,

    platformApprovals: item.platformApprovals,
  };
}

export async function GET() {
  try {
    const queue = await readJson<ReviewItem>(reviewFile);

    return NextResponse.json({
      success: true,
      items: queue,
    });
  } catch (error) {
    console.error("Review Queue load failed:", error);

    return NextResponse.json(
      {
        success: false,

        message: "KWEVORA could not load the Review Queue.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const action = cleanString(body.action);

    if (action === "reject") {
      const reviewQueue = await readJson<ReviewItem>(reviewFile);
      const id = cleanString(body.id);
      const item = reviewQueue.find((entry) => entry.id === id);
      if (!item) {
        return NextResponse.json(
          { success: false, message: "Review item not found." },
          { status: 404 },
        );
      }
      const reason =
        cleanString(body.reason) ||
        "The owner rejected this content direction during review.";
      await writeJson(
        reviewFile,
        reviewQueue.filter((entry) => entry.id !== id),
      );
      await autonomousContentCycleEngine.stop(item.executionPlanId, reason);
      return NextResponse.json({
        success: true,
        message:
          "Rejected. KAI stopped this cycle and recorded the direction to avoid repeating it unchanged.",
      });
    }

    if (action === "edit") {
      const reviewQueue = await readJson<ReviewItem>(reviewFile);
      const id = cleanString(body.id);
      const index = reviewQueue.findIndex((entry) => entry.id === id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: "Review item not found." },
          { status: 404 },
        );
      }
      const current = reviewQueue[index];
      const updated: ReviewItem = {
        ...current,
        title: cleanString(body.title) || current.title,
        hook: cleanString(body.hook) || current.hook,
        caption: cleanString(body.caption) || current.caption,
        callToAction: cleanString(body.callToAction) || current.callToAction,
        videoDirectionFeedback:
          cleanString(body.videoDirectionFeedback) ||
          current.videoDirectionFeedback,
      };
      reviewQueue[index] = updated;
      await writeJson(reviewFile, reviewQueue);
      return NextResponse.json({
        success: true,
        item: updated,
        message:
          "Edits saved. KAI will learn them when you approve this package.",
      });
    }

    if (action === "approve_platform") {
      const reviewQueue = await readJson<ReviewItem>(reviewFile);
      const id = cleanString(body.id);
      const platform = cleanString(body.platform).toLowerCase();
      const versionNumber =
        typeof body.version === "number" ? Math.floor(body.version) : 0;
      const index = reviewQueue.findIndex((entry) => entry.id === id);
      const item = index >= 0 ? reviewQueue[index] : undefined;
      const version = item?.videoProduction?.versions?.find(
        (entry) => entry.version === versionNumber,
      );
      if (!item || !version || !platform)
        return NextResponse.json(
          {
            success: false,
            message:
              "That video version could not be approved for the selected platform.",
          },
          { status: 404 },
        );
      item.platformApprovals = {
        ...(item.platformApprovals ?? {}),
        [platform]: {
          platform,
          version: version.version,
          videoId: version.videoId,
          videoUrl: version.videoUrl,
          outputLocation: version.outputLocation,
          approvedAt: new Date().toISOString(),
        },
      };
      reviewQueue[index] = item;
      await writeJson(reviewFile, reviewQueue);
      return NextResponse.json({
        success: true,
        item,
        message: `Version ${version.version} locked for ${platform}. Other platform versions can still be revised.`,
      });
    }

    if (action === "approve") {
      const reviewQueue = await readJson<ReviewItem>(reviewFile);

      const publishingQueue = await readJson<PublishingItem>(publishingFile);

      const id = cleanString(body.id);

      const index = reviewQueue.findIndex((item) => item.id === id);

      if (index === -1) {
        return NextResponse.json(
          {
            success: false,

            message: "Review item not found.",
          },
          {
            status: 404,
          },
        );
      }

      const reviewItem = reviewQueue[index];

      const publishingItem = await createPublishingItem(reviewItem);

      const existingPublishingIndex = publishingQueue.findIndex(
        (item) => item.id === publishingItem.id,
      );

      if (existingPublishingIndex >= 0) {
        publishingQueue[existingPublishingIndex] = publishingItem;
      } else {
        publishingQueue.unshift(publishingItem);
      }

      reviewQueue.splice(index, 1);

      await writeJson(reviewFile, reviewQueue);

      await writeJson(publishingFile, publishingQueue);

      const publishingHandoffs = autonomousPublishingHandoffEngine.enqueue({
        publishingItemId: publishingItem.id,
        executionPlanId: publishingItem.executionPlanId,
        recommendedPlatforms: publishingItem.recommendedPlatforms,
        scheduledFor: publishingItem.scheduledFor,
        title: publishingItem.title,
        caption: publishingItem.caption,
        hashtags: publishingItem.hashtags,
        callToAction: publishingItem.callToAction,
        destinationLink: publishingItem.destinationLink,
        media: publishingItem.media,
        platformMedia: publishingItem.platformApprovals
          ? Object.fromEntries(
              Object.entries(publishingItem.platformApprovals).map(
                ([platform, approval]) => [
                  platform,
                  {
                    filePath: approval.outputLocation,
                    mimeType: "video/mp4",
                    version: approval.version,
                    videoId: approval.videoId,
                  },
                ],
              ),
            )
          : undefined,
      });

      await autonomousContentCycleEngine.approve(
        reviewItem.executionPlanId,
        reviewItem as unknown as Record<string, unknown>,
      );

      if (publishingItem.status === "scheduled") {
        await growthPlanExecutionEngine.transition(
          reviewItem.executionPlanId,
          "scheduled",
        );
      }

      return NextResponse.json({
        success: true,

        item: publishingItem,

        publishingHandoffs,

        message:
          "Approved and moved to the Publishing Queue with its platform handoff prepared.",
      });
    }

    const reason = cleanString(body.reason) || cleanString(body.idea);

    const newItem: ReviewItem = {
      id: crypto.randomUUID(),

      createdAt: new Date().toISOString(),

      status: "needs_review",

      executionPlanId: cleanString(body.executionPlanId),

      idea: cleanString(body.idea) || reason,

      hook: cleanString(body.hook),

      title: cleanString(body.title) || "Untitled content package",

      script: cleanString(body.script),

      caption: cleanString(body.caption),

      hashtags: cleanStringArray(body.hashtags),

      thumbnailIdea: cleanString(body.thumbnailIdea),

      callToAction: cleanString(body.callToAction),

      audience: cleanString(body.audience),

      recommendedPlatforms: cleanStringArray(body.recommendedPlatforms),

      videoPlan: cleanVideoPlan(body.videoPlan),

      reason,

      format: cleanFormat(body.format),

      destinationLink: cleanString(body.destinationLink),

      pinnedComment:
        cleanString(body.pinnedComment) || cleanString(body.callToAction),

      media: cleanMedia(body.media),

      growthPlan:
        body.growthPlan && typeof body.growthPlan === "object"
          ? (body.growthPlan as ContentPackage["growthPlan"])
          : undefined,

      adaptiveCreation:
        body.adaptiveCreation && typeof body.adaptiveCreation === "object"
          ? (body.adaptiveCreation as ContentPackage["adaptiveCreation"])
          : undefined,
    };

    const queue = await readJson<ReviewItem>(reviewFile);

    queue.unshift(newItem);

    await writeJson(reviewFile, queue);

    return NextResponse.json({
      success: true,

      item: newItem,

      message: "Content package added to the Review Queue.",
    });
  } catch (error) {
    console.error("Review Queue operation failed:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Review Queue operation failed.",
      },
      {
        status: 500,
      },
    );
  }
}
