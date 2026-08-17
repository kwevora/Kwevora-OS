import { NextRequest, NextResponse } from "next/server";

import { growthPlanExecutionEngine } from "../../lib/GrowthPlanExecutionEngine";
import { growthPlanAuthorizationEngine } from "../../lib/GrowthPlanAuthorizationEngine";
import { autonomousPublishingHandoffEngine } from "../../lib/AutonomousPublishingHandoffEngine";
import { DurableQueueRepository } from "../../lib/database/DurableQueueRepository";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type VideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
};

type MediaFile = {
  source: "recording" | "upload" | "generated";

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

export type PlatformPublication = {
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | string;

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

  status: PublishingStatus;

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

  videoPlan: VideoPlan;

  format: string;

  destinationLink: string;

  pinnedComment: string;

  scheduledFor: string;

  publishedAt: string;

  media?: MediaFile;

  publications?: PlatformPublication[];
};

const publishingQueueRepository = new DurableQueueRepository<PublishingItem>(
  "publishing_queue",
  "publishing-queue.json",
);

async function readPublishingQueue(): Promise<PublishingItem[]> {
  return publishingQueueRepository.read();
}

async function writePublishingQueue(items: PublishingItem[]) {
  await publishingQueueRepository.write(items);
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

function cleanVideoPlan(value: unknown): VideoPlan {
  if (!value || typeof value !== "object") {
    return {
      openingText: "",
      scenes: [],
      endingText: "",
    };
  }

  const plan = value as Record<string, unknown>;

  return {
    openingText: cleanString(plan.openingText),

    scenes: cleanStringArray(plan.scenes),

    endingText: cleanString(plan.endingText),
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

function cleanStatus(value: unknown): PublishingStatus {
  if (
    value === "approved" ||
    value === "ready_to_publish" ||
    value === "scheduled" ||
    value === "published"
  ) {
    return value;
  }

  return "ready_to_publish";
}

function cleanPublication(value: unknown): PlatformPublication | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const publication = value as Record<string, unknown>;

  const platform = cleanString(publication.platform);

  const externalId = cleanString(publication.externalId);

  const url = cleanString(publication.url);

  if (!platform || !externalId) {
    return null;
  }

  return {
    platform,

    externalId,

    url,

    publishedAt:
      cleanString(publication.publishedAt) || new Date().toISOString(),

    channelId: cleanString(publication.channelId) || undefined,

    channelName: cleanString(publication.channelName) || undefined,

    privacyStatus: cleanString(publication.privacyStatus) || undefined,
  };
}

function cleanPublications(value: unknown): PlatformPublication[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanPublication)
    .filter(
      (publication): publication is PlatformPublication => publication !== null,
    );
}

function createPublishingItem(value: Record<string, unknown>): PublishingItem {
  const now = new Date().toISOString();

  return {
    id: cleanString(value.id) || crypto.randomUUID(),

    createdAt: cleanString(value.createdAt) || now,

    approvedAt: cleanString(value.approvedAt) || now,

    updatedAt: now,

    status: cleanStatus(value.status),

    executionPlanId: cleanString(value.executionPlanId),

    idea: cleanString(value.idea),

    reason: cleanString(value.reason),

    hook: cleanString(value.hook),

    title: cleanString(value.title),

    script: cleanString(value.script),

    caption: cleanString(value.caption),

    hashtags: cleanStringArray(value.hashtags),

    thumbnailIdea: cleanString(value.thumbnailIdea),

    callToAction: cleanString(value.callToAction),

    audience: cleanString(value.audience),

    recommendedPlatforms: cleanStringArray(value.recommendedPlatforms),

    videoPlan: cleanVideoPlan(value.videoPlan),

    format: cleanString(value.format),

    destinationLink: cleanString(value.destinationLink),

    pinnedComment: cleanString(value.pinnedComment),

    scheduledFor: cleanString(value.scheduledFor),

    publishedAt: cleanString(value.publishedAt),

    media: cleanMedia(value.media),

    publications: cleanPublications(value.publications),
  };
}

export async function GET() {
  try {
    const items = await readPublishingQueue();

    for (const item of items) {
      if (item.status === "published") continue;
      autonomousPublishingHandoffEngine.enqueue({
        publishingItemId: item.id,
        executionPlanId: item.executionPlanId,
        recommendedPlatforms: item.recommendedPlatforms,
        scheduledFor: item.scheduledFor,
        title: item.title,
        caption: item.caption,
        hashtags: item.hashtags,
        callToAction: item.callToAction,
        destinationLink: item.destinationLink,
        media: item.media,
      });
    }

    return NextResponse.json({
      success: true,

      items,
    });
  } catch (error) {
    console.error("Publishing Queue load failed:", error);

    return NextResponse.json(
      {
        success: false,

        message: "KWEVORA could not load the Publishing Queue.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const action = cleanString(body.action);

    const items = await readPublishingQueue();

    if (action === "add") {
      const sourceItem =
        body.item && typeof body.item === "object"
          ? (body.item as Record<string, unknown>)
          : body;

      const newItem = createPublishingItem(sourceItem);

      const existingIndex = items.findIndex((item) => item.id === newItem.id);

      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],

          ...newItem,

          updatedAt: new Date().toISOString(),
        };
      } else {
        items.unshift(newItem);
      }

      await writePublishingQueue(items);

      return NextResponse.json({
        success: true,

        item: newItem,

        message: "Content package added to the Publishing Queue.",
      });
    }

    if (action === "schedule") {
      const id = cleanString(body.id);

      const scheduledFor = cleanString(body.scheduledFor);

      if (!id || !scheduledFor) {
        return NextResponse.json(
          {
            success: false,

            message: "A content package and publishing time are required.",
          },
          {
            status: 400,
          },
        );
      }

      const itemIndex = items.findIndex((item) => item.id === id);

      if (itemIndex < 0) {
        return NextResponse.json(
          {
            success: false,

            message: "That publishing package could not be found.",
          },
          {
            status: 404,
          },
        );
      }

      const schedulingAuthorization =
        await growthPlanAuthorizationEngine.decision(
          items[itemIndex].executionPlanId,
          "schedule",
        );

      if (!schedulingAuthorization.allowed) {
        return NextResponse.json({
          success: true,
          scheduled: false,
          authorization: schedulingAuthorization,
          message: schedulingAuthorization.reason,
        });
      }

      items[itemIndex] = {
        ...items[itemIndex],

        status: "scheduled",

        scheduledFor,

        updatedAt: new Date().toISOString(),
      };

      await writePublishingQueue(items);

      await growthPlanExecutionEngine.transition(
        items[itemIndex].executionPlanId,
        "scheduled",
      );
      autonomousPublishingHandoffEngine.rescheduleItem(id, scheduledFor);

      return NextResponse.json({
        success: true,

        item: items[itemIndex],

        message: "Content package scheduled.",
      });
    }

    if (action === "mark_published") {
      const id = cleanString(body.id);

      if (!id) {
        return NextResponse.json(
          {
            success: false,

            message: "A content package is required.",
          },
          {
            status: 400,
          },
        );
      }

      const itemIndex = items.findIndex((item) => item.id === id);

      if (itemIndex < 0) {
        return NextResponse.json(
          {
            success: false,

            message: "That publishing package could not be found.",
          },
          {
            status: 404,
          },
        );
      }

      const now = new Date().toISOString();

      const incomingPublication = cleanPublication(body.publication);

      const existingPublications = items[itemIndex].publications ?? [];

      let publications = existingPublications;

      if (incomingPublication) {
        const existingPublicationIndex = existingPublications.findIndex(
          (publication) =>
            publication.platform === incomingPublication.platform &&
            publication.externalId === incomingPublication.externalId,
        );

        if (existingPublicationIndex >= 0) {
          publications = existingPublications.map((publication, index) =>
            index === existingPublicationIndex
              ? incomingPublication
              : publication,
          );
        } else {
          publications = [...existingPublications, incomingPublication];
        }
      }

      items[itemIndex] = {
        ...items[itemIndex],

        status: "published",

        publishedAt: now,

        updatedAt: now,

        publications,
      };

      await writePublishingQueue(items);

      await growthPlanExecutionEngine.transition(
        items[itemIndex].executionPlanId,
        "published",
      );

      if (incomingPublication) {
        autonomousPublishingHandoffEngine.markItemPublished(
          id,
          incomingPublication.platform,
          {
            externalId: incomingPublication.externalId,
            url: incomingPublication.url,
            publishedAt: incomingPublication.publishedAt,
          },
        );
      }

      return NextResponse.json({
        success: true,

        item: items[itemIndex],

        message: incomingPublication
          ? "Content package marked as published and platform publication saved."
          : "Content package marked as published.",
      });
    }

    if (action === "remove") {
      const id = cleanString(body.id);

      if (!id) {
        return NextResponse.json(
          {
            success: false,

            message: "A content package is required.",
          },
          {
            status: 400,
          },
        );
      }

      const updatedItems = items.filter((item) => item.id !== id);

      if (updatedItems.length === items.length) {
        return NextResponse.json(
          {
            success: false,

            message: "That publishing package could not be found.",
          },
          {
            status: 404,
          },
        );
      }

      await writePublishingQueue(updatedItems);

      return NextResponse.json({
        success: true,

        message: "Content package removed from the Publishing Queue.",
      });
    }

    return NextResponse.json(
      {
        success: false,

        message: "That Publishing Queue action is not supported.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("Publishing Queue update failed:", error);

    return NextResponse.json(
      {
        success: false,

        message: "KWEVORA could not update the Publishing Queue.",
      },
      {
        status: 500,
      },
    );
  }
}
