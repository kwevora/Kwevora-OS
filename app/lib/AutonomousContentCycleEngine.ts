import { randomUUID } from "node:crypto";
import type { ContentPackage } from "./ContentIntelligenceEngine";
import type { OutcomeEvaluation } from "./OutcomeEngine";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";
import { memoryBrain } from "./MemoryBrain";
import { growthPlanExecutionEngine } from "./GrowthPlanExecutionEngine";
import { growthPlanAuthorizationEngine } from "./GrowthPlanAuthorizationEngine";

export type AutonomousCycleStatus =
  | "awaiting_review"
  | "approved"
  | "publishing_blocked"
  | "published"
  | "monitoring"
  | "learned"
  | "stopped";

export type AutonomousCycleEvent = {
  type:
    | "created"
    | "approved"
    | "edited"
    | "blocked"
    | "published"
    | "measured"
    | "learned"
    | "stopped";
  at: string;
  message: string;
};

export type AutonomousContentCycle = {
  id: string;
  executionPlanId: string;
  reviewItemId: string;
  publishingItemId?: string;
  status: AutonomousCycleStatus;
  product: string;
  title: string;
  originalContent: ContentPackage;
  ownerEdits: string[];
  predictedApproval?: number;
  actualApproved?: boolean;
  approvalPredictionError?: number;
  editDetails?: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
  approvedContent?: Record<string, unknown>;
  publication?: {
    platform: string;
    externalId: string;
    url: string;
    publishedAt: string;
  };
  outcome?: { result: string; score: number };
  nextAction: string;
  ownerAttentionRequired: boolean;
  stopReason?: string;
  events: AutonomousCycleEvent[];
  createdAt: string;
  updatedAt: string;
};

function changes(
  original: ContentPackage,
  approved: Record<string, unknown>,
): string[] {
  const fields: Array<keyof ContentPackage> = [
    "title",
    "hook",
    "script",
    "caption",
    "hashtags",
    "thumbnailIdea",
    "callToAction",
    "recommendedPlatforms",
    "format",
    "destinationLink",
    "pinnedComment",
  ];
  return fields
    .filter((field) => {
      if (!(field in approved)) return false;
      return (
        JSON.stringify(original[field]) !== JSON.stringify(approved[field])
      );
    })
    .map((field) => String(field));
}

function editDetails(
  original: ContentPackage,
  approved: Record<string, unknown>,
) {
  return changes(original, approved).map((field) => ({
    field,
    before: original[field as keyof ContentPackage],
    after: approved[field],
  }));
}

export class AutonomousContentCycleEngine {
  async start({
    executionPlanId,
    reviewItemId,
    contentPackage,
  }: {
    executionPlanId: string;
    reviewItemId: string;
    contentPackage: ContentPackage;
  }) {
    const now = new Date().toISOString();
    const cycle = await autonomousCycleRepository.save({
      id: randomUUID(),
      executionPlanId,
      reviewItemId,
      status: "awaiting_review",
      product:
        contentPackage.attributionContext?.product ??
        contentPackage.strategyApplication.contextTags.find((tag) =>
          tag.includes("planner"),
        ) ??
        contentPackage.idea,
      title: contentPackage.title,
      originalContent: contentPackage,
      ownerEdits: [],
      predictedApproval: contentPackage.approvalIntelligence?.predictedApproval,
      nextAction:
        "Review and approve, edit, or reject the prepared content package.",
      ownerAttentionRequired: true,
      events: [
        {
          type: "created",
          at: now,
          message:
            "KAI created strategy-guided content and placed it in the Review Queue.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    if (contentPackage.growthPlan) {
      await growthPlanExecutionEngine.claim(
        contentPackage.growthPlan.planId,
        contentPackage.growthPlan.slotId,
        executionPlanId,
        reviewItemId,
      );
    }
    return cycle;
  }

  async approve(executionPlanId: string, item: Record<string, unknown>) {
    const cycle =
      await autonomousCycleRepository.forExecutionPlan(executionPlanId);
    if (!cycle) return null;
    const now = new Date().toISOString();
    const ownerEdits = changes(cycle.originalContent, item);
    const details = editDetails(cycle.originalContent, item);
    const videoDirectionFeedback =
      typeof item.videoDirectionFeedback === "string"
        ? item.videoDirectionFeedback.trim()
        : "";
    if (ownerEdits.length > 0) {
      await memoryBrain.remember({
        id: `content-edit-${cycle.id}`,
        type: "preference",
        title: "Owner content edits",
        description: `The owner changed ${ownerEdits.join(", ")} before approving ${cycle.title}. Treat these edits as preference evidence in similar future content.`,
        importance: "high",
        learnedAt: now,
        tags: ["content", "owner-edit", ...ownerEdits],
      });
    }
    if (videoDirectionFeedback) {
      await memoryBrain.remember({
        id: `video-direction-feedback-${cycle.id}`,
        type: "preference",
        title: "Owner video direction feedback",
        description: videoDirectionFeedback,
        importance: "high",
        learnedAt: now,
        tags: [
          "content",
          "video",
          "video-direction",
          "owner-edit",
          ...cycle.originalContent.strategyApplication.contextTags,
        ],
      });
    }
    const updated = await autonomousCycleRepository.save({
      ...cycle,
      status: "approved",
      publishingItemId: String(item.id ?? cycle.reviewItemId),
      ownerEdits,
      actualApproved: true,
      approvalPredictionError:
        typeof cycle.predictedApproval === "number"
          ? Math.abs(100 - cycle.predictedApproval)
          : undefined,
      editDetails: details,
      approvedContent: item,
      nextAction:
        "KAI will verify access, media, and platform requirements before publishing.",
      ownerAttentionRequired: false,
      events: [
        ...cycle.events,
        ...(ownerEdits.length || videoDirectionFeedback
          ? [
              {
                type: "edited" as const,
                at: now,
                message: `Owner changed: ${[...ownerEdits, ...(videoDirectionFeedback ? ["video direction"] : [])].join(", ")}. KAI will use these edits as preference evidence.`,
              },
            ]
          : []),
        {
          type: "approved",
          at: now,
          message: "Owner approved the content package for publishing.",
        },
      ],
      updatedAt: now,
    });
    await growthPlanExecutionEngine.transition(executionPlanId, "approved");
    await growthPlanAuthorizationEngine.propagateOwnerEdits(
      executionPlanId,
      details,
    );
    return updated;
  }

  async blocked(executionPlanId: string, reason: string) {
    const cycle = await this.update(
      executionPlanId,
      "publishing_blocked",
      "blocked",
      reason,
      reason,
      true,
    );
    await growthPlanExecutionEngine.transition(
      executionPlanId,
      "publishing_blocked",
    );
    return cycle;
  }

  async stop(executionPlanId: string, reason: string) {
    const cycle = await this.update(
      executionPlanId,
      "stopped",
      "stopped",
      reason,
      "KAI will not repeat this exact content direction without new evidence.",
      true,
    );
    if (cycle) {
      await growthPlanExecutionEngine.transition(executionPlanId, "rejected");
      cycle.stopReason = reason;
      cycle.actualApproved = false;
      cycle.approvalPredictionError =
        typeof cycle.predictedApproval === "number"
          ? Math.abs(cycle.predictedApproval)
          : undefined;
      await autonomousCycleRepository.save(cycle);
      await memoryBrain.remember({
        id: `content-rejection-${cycle.id}`,
        type: "preference",
        title: "Rejected content direction",
        description: reason,
        importance: "high",
        learnedAt: new Date().toISOString(),
        tags: [
          "content",
          "rejected",
          ...cycle.originalContent.strategyApplication.contextTags,
        ],
      });
    }
    return cycle;
  }

  async published(
    executionPlanId: string,
    publication: AutonomousContentCycle["publication"],
  ) {
    const cycle =
      await autonomousCycleRepository.forExecutionPlan(executionPlanId);
    if (!cycle || !publication) return null;
    const now = new Date().toISOString();
    const updated = await autonomousCycleRepository.save({
      ...cycle,
      status: "monitoring",
      publication,
      nextAction:
        "KAI is waiting for the measurement window, then will collect results automatically.",
      ownerAttentionRequired: false,
      events: [
        ...cycle.events,
        {
          type: "published",
          at: now,
          message: `KAI published the approved content to ${publication.platform}.`,
        },
        {
          type: "measured",
          at: now,
          message: "KAI opened the automatic outcome-monitoring window.",
        },
      ],
      updatedAt: now,
    });
    await growthPlanExecutionEngine.transition(executionPlanId, "published");
    return updated;
  }

  async learn(executionPlanId: string, evaluation: OutcomeEvaluation) {
    const cycle =
      await autonomousCycleRepository.forExecutionPlan(executionPlanId);
    if (!cycle) return null;
    const now = new Date().toISOString();
    const updated = await autonomousCycleRepository.save({
      ...cycle,
      status: "learned",
      outcome: { result: evaluation.outcome, score: evaluation.score },
      nextAction:
        "Use this measured result and experiment verdict in the next content cycle.",
      ownerAttentionRequired: false,
      events: [
        ...cycle.events,
        {
          type: "learned",
          at: now,
          message: `KAI scored the result ${evaluation.score}% (${evaluation.outcome}) and applied it to future strategy.`,
        },
      ],
      updatedAt: now,
    });
    await growthPlanExecutionEngine.transition(executionPlanId, "measured");
    return updated;
  }

  private async update(
    executionPlanId: string,
    status: AutonomousCycleStatus,
    type: AutonomousCycleEvent["type"],
    message: string,
    nextAction: string,
    ownerAttentionRequired: boolean,
  ) {
    const cycle =
      await autonomousCycleRepository.forExecutionPlan(executionPlanId);
    if (!cycle) return null;
    const now = new Date().toISOString();
    return autonomousCycleRepository.save({
      ...cycle,
      status,
      nextAction,
      ownerAttentionRequired,
      events: [...cycle.events, { type, at: now, message }],
      updatedAt: now,
    });
  }
}

export const autonomousContentCycleEngine = new AutonomousContentCycleEngine();
