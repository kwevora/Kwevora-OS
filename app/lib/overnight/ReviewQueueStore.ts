import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";

import { randomUUID } from "crypto";
import path from "path";

import type {
  ContentPackage,
} from "../ContentIntelligenceEngine";

export type ReviewQueueItem = {
  id: string;
  createdAt: string;
  status: "needs_review";

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

  videoPlan: {
    openingText: string;
    scenes: string[];
    endingText: string;
    estimatedLengthSeconds: number;
  };

  reason: string;

  format:
    | "faceless_video"
    | "record_yourself"
    | "upload_video";

  destinationLink: string;
  pinnedComment: string;

  suggestedPostingTime?: string;
  confidence?: number;
  estimatedBusinessImpact?: string;
  followUpIdeas?: string[];
  sourceOpportunityId?: string;
};

const dataFolder = path.join(
  process.cwd(),
  "data",
);

const reviewQueueFile = path.join(
  dataFolder,
  "review-queue.json",
);

function ensureReviewQueueFile(): void {
  mkdirSync(
    dataFolder,
    {
      recursive: true,
    },
  );

  if (
    !existsSync(
      reviewQueueFile,
    )
  ) {
    writeFileSync(
      reviewQueueFile,
      "[]",
      "utf8",
    );
  }
}

function contentPackageToReviewItem(
  contentPackage: ContentPackage,
): ReviewQueueItem {
  return {
    id:
      randomUUID(),

    createdAt:
      new Date().toISOString(),

    status:
      "needs_review",

    idea:
      contentPackage.idea,

    hook:
      contentPackage.hook,

    title:
      contentPackage.title,

    script:
      contentPackage.script,

    caption:
      contentPackage.caption,

    hashtags:
      contentPackage.hashtags,

    thumbnailIdea:
      contentPackage.thumbnailIdea,

    callToAction:
      contentPackage.callToAction,

    audience:
      contentPackage.audience,

    recommendedPlatforms:
      contentPackage.recommendedPlatforms,

    videoPlan: {
      openingText:
        contentPackage.videoPlan
          .openingText,

      scenes:
        contentPackage.videoPlan
          .scenes,

      endingText:
        contentPackage.videoPlan
          .endingText,

      estimatedLengthSeconds:
        contentPackage.videoPlan
          .estimatedLengthSeconds,
    },

    reason:
      contentPackage.reason,

    format:
      contentPackage.format,

    destinationLink:
      contentPackage.destinationLink,

    pinnedComment:
      contentPackage.pinnedComment,

    suggestedPostingTime:
      contentPackage
        .suggestedPostingTime,

    confidence:
      contentPackage.confidence,

    estimatedBusinessImpact:
      contentPackage
        .estimatedBusinessImpact,

    followUpIdeas:
      contentPackage.followUpIdeas,

    sourceOpportunityId:
      contentPackage
        .sourceOpportunityId,
  };
}

export class ReviewQueueStore {
  read():
    ReviewQueueItem[] {
    ensureReviewQueueFile();

    try {
      const raw =
        readFileSync(
          reviewQueueFile,
          "utf8",
        );

      const parsed: unknown =
        JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed as ReviewQueueItem[]
        : [];
    } catch {
      return [];
    }
  }

  write(
    queue: ReviewQueueItem[],
  ): void {
    ensureReviewQueueFile();

    writeFileSync(
      reviewQueueFile,
      JSON.stringify(
        queue,
        null,
        2,
      ),
      "utf8",
    );
  }

  addContentPackage(
    contentPackage: ContentPackage,
  ): ReviewQueueItem {
    const queue =
      this.read();

    const reviewItem =
      contentPackageToReviewItem(
        contentPackage,
      );

    queue.unshift(
      reviewItem,
    );

    this.write(
      queue,
    );

    return reviewItem;
  }
}

export const reviewQueueStore =
  new ReviewQueueStore();