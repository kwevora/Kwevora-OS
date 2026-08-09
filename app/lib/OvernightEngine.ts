import {
  departmentRegistry,
} from "./DepartmentRegistry";

import {
  decisionCore,
  type DecisionRequest,
} from "./DecisionCore";

import {
  memoryBrain,
  type ActiveWork,
} from "./MemoryBrain";

import {
  contentIntelligenceEngine,
  type ContentPackage,
} from "./ContentIntelligenceEngine";

import {
  executiveBrain,
  type ExecutiveReview,
} from "./ExecutiveBrain";

import {
  organizationMemory,
  type OrganizationSnapshot,
} from "./OrganizationMemory";

import {
  watchtower,
} from "./Watchtower";

import {
  judgmentEngine,
  type Judgment,
} from "./JudgmentEngine";

import {
  executionEngine,
  type ExecutionPlan,
} from "./ExecutionEngine";

import {
  executionPlanRepository,
} from "./database/ExecutionPlanRepository";

import {
  overnightReportRepository,
  type StoredOvernightReport,
} from "./database/OvernightReportRepository";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";

import path from "path";
import { randomUUID } from "crypto";

type ReviewQueueItem = {
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

export type OvernightReport = {
  startedAt: string;
  finishedAt: string;

  summary: string;

  completedWork: string[];

  opportunities: string[];

  warnings: string[];

  nextOwnerDecision: string;

  activeWork: ActiveWork | null;

  contentCreated: boolean;

  createdContentTitle: string;

  executiveReview: ExecutiveReview;

  executivePriority: string;

  ownerTasks: string[];

  kaiTasks: string[];

  biggestRisk: string;

  biggestOpportunity: string;

  cognitiveSessionId: string;

  reasoningTrace: string[];

  uncertainties: string[];

  organizationHealth: number;

  organizationTrend: string;

  judgment: string;

  judgmentConfidence: number;

  executionPlanId: string;

  executionStatus: string;

  executionProgress: number;

  executionNextAction: string;
};

export type OvernightRunResult = {
  report: OvernightReport;
  storedReport: StoredOvernightReport;
  contentPackage: ContentPackage | null;
  reviewItemId: string | null;
  executiveReview: ExecutiveReview;
  organizationSnapshot: OrganizationSnapshot;
  judgment: Judgment;
  executionPlan: ExecutionPlan;
};

const dataFolder = path.join(
  process.cwd(),
  "data",
);

const reviewQueueFile = path.join(
  dataFolder,
  "review-queue.json",
);

function ensureReviewQueueFile() {
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

function readReviewQueue():
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

function saveReviewQueue(
  queue: ReviewQueueItem[],
) {
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

function saveContentToReviewQueue(
  contentPackage: ContentPackage,
): ReviewQueueItem {
  const queue =
    readReviewQueue();

  const reviewItem =
    contentPackageToReviewItem(
      contentPackage,
    );

  queue.unshift(
    reviewItem,
  );

  saveReviewQueue(
    queue,
  );

  return reviewItem;
}

function buildOwnerTasks(
  executiveReview: ExecutiveReview,
): string[] {
  return executiveReview.ownerTasks.map(
    (task) =>
      `${task.title}: ${task.reason}`,
  );
}

function buildKaiTasks(
  executiveReview: ExecutiveReview,
): string[] {
  return executiveReview.kaiTasks.map(
    (task) =>
      `${task.title}: ${task.reason}`,
  );
}

function buildWarnings(
  missingMemory: string[],
  missingBusinessInformation: string[],
  executiveReview: ExecutiveReview,
  uncertainties: string[],
): string[] {
  return Array.from(
    new Set([
      ...missingMemory,

      ...missingBusinessInformation.map(
        (item) =>
          `Business information still needed: ${item}`,
      ),

      ...uncertainties,

      executiveReview.biggestRisk &&
      executiveReview.biggestRisk !==
        "No major risk detected."
        ? `Executive risk: ${executiveReview.biggestRisk}`
        : "",
    ].filter(Boolean)),
  );
}

export class OvernightEngine {
  async run(
    request: DecisionRequest,
  ): Promise<OvernightRunResult> {
    const startedAt =
      new Date().toISOString();

    const activeWork =
      memoryBrain.getActiveWork();

    const result =
      decisionCore.think(
        request,
      );

    const departmentReview =
      await departmentRegistry.reviewAll();

    const organizationSnapshot =
      organizationMemory.recordOrganization(
        departmentReview.reports,
      );

    const executiveReview =
      executiveBrain.review({
        decision: result,
        activeWork,
        departments:
          departmentReview.reports,
      });

    const watchtowerStatus =
      watchtower.summarize();

    const judgment =
      judgmentEngine.evaluate({
        executiveReview,
        organization:
          organizationSnapshot,
        watchtower:
          watchtowerStatus,
      });

    const executionPlan =
      executionEngine.createPlan(
        judgment,
      );

    executionPlanRepository.save(
      executionPlan,
    );

    let contentPackage:
      ContentPackage | null = null;

    let reviewItemId:
      string | null = null;

    if (
      contentIntelligenceEngine
        .shouldGenerate(
          result.decision,
        )
    ) {
      contentPackage =
        contentIntelligenceEngine
          .generate({
            decision:
              result.decision,

            businessName:
              request.businessName ??
              request.businessProfile
                ?.businessName,

            ownerName:
              request.ownerName ??
              request.businessProfile
                ?.ownerName,

            products:
              request.products ??
              request.businessProfile
                ?.products,

            offers:
              request.offers ??
              request.businessProfile
                ?.services,

            targetAudience:
              request.targetAudience ??
              request.businessProfile
                ?.targetAudience,

            connectedPlatforms:
              request.connectedPlatforms ??
              request.businessProfile
                ?.platforms,

            brandVoice:
              request.businessProfile
                ?.brandVoice,

            preferredFormat:
              "faceless_video",
          });

      const reviewItem =
        saveContentToReviewQueue(
          contentPackage,
        );

      reviewItemId =
        reviewItem.id;
    }

    const completedWork = [
      "Reviewed business context.",
      "Recalled relevant long-term memory.",
      "Reviewed active work and the last known stopping point.",
      "Completed KAI's cognitive reasoning process.",
      "Compared the strongest available business opportunities.",
      "Generated today's highest-priority decision.",
      "Completed KAI's executive review.",
      "Recorded the latest organization health snapshot.",
      "Reviewed Watchtower activity and current business changes.",
      "Applied KAI's judgment to the highest-priority action.",
      "Created an execution plan for the next business action.",
      "Saved the execution plan for future outcome measurement.",
      "Separated owner decisions from work KAI can handle.",
      "Saved the completed decision into permanent memory.",
    ];

    if (
      contentPackage
    ) {
      completedWork.push(
        `Created "${contentPackage.title}" as a complete content package.`,
      );

      completedWork.push(
        "Added the finished content package to the Review Queue.",
      );
    }

    const ownerTasks =
      buildOwnerTasks(
        executiveReview,
      );

    const kaiTasks =
      buildKaiTasks(
        executiveReview,
      );

    const warnings =
      buildWarnings(
        result.missingMemory,

        result.businessAssessment
          ?.missingInformation ??
          [],

        executiveReview,

        result.cognitiveSession
          .uncertainties,
      );

    const report: OvernightReport = {
      startedAt,

      finishedAt:
        new Date().toISOString(),

      summary:
        executiveReview.summary,

      completedWork,

      opportunities:
        executiveReview.priorities
          .slice(
            0,
            3,
          )
          .map(
            (priority) =>
              priority.title,
          ),

      warnings,

      nextOwnerDecision:
        result.decision
          .morningQuestion
          .question,

      activeWork,

      contentCreated:
        contentPackage !== null,

      createdContentTitle:
        contentPackage?.title ??
        "",

      executiveReview,

      executivePriority:
        executiveReview
          .biggestOpportunity,

      ownerTasks,

      kaiTasks,

      biggestRisk:
        executiveReview.biggestRisk,

      biggestOpportunity:
        executiveReview
          .biggestOpportunity,

      cognitiveSessionId:
        result.cognitiveSession.id,

      reasoningTrace:
        result.cognitiveSession
          .reasoningTrace,

      uncertainties:
        result.cognitiveSession
          .uncertainties,

      organizationHealth:
        organizationSnapshot
          .overallHealthScore,

      organizationTrend:
        organizationSnapshot
          .overallTrend,

      judgment:
        judgment.conclusion,

      judgmentConfidence:
        judgment.confidence,

      executionPlanId:
        executionPlan.id,

      executionStatus:
        executionPlan.status,

      executionProgress:
        executionPlan.progress,

      executionNextAction:
        executionPlan.nextAction,
    };

    const storedReport =
      overnightReportRepository
        .save(
          report,
        );

    return {
      report,
      storedReport,
      contentPackage,
      reviewItemId,
      executiveReview,
      organizationSnapshot,
      judgment,
      executionPlan,
    };
  }

  latest():
    | StoredOvernightReport
    | null {
    return overnightReportRepository
      .latest();
  }

  history(
    limit = 30,
  ): StoredOvernightReport[] {
    return overnightReportRepository
      .history(
        limit,
      );
  }
}

export const overnightEngine =
  new OvernightEngine();