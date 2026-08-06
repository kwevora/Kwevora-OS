import type {
  DecisionResponse,
} from "../DecisionCore";

import type {
  ActiveWork,
} from "../MemoryBrain";

import type {
  ContentPackage,
} from "../ContentIntelligenceEngine";

import type {
  ExecutiveReview,
} from "../ExecutiveBrain";

import type {
  OrganizationSnapshot,
} from "../OrganizationMemory";

import type {
  Judgment,
} from "../JudgmentEngine";

import type {
  ExecutionPlan,
} from "../ExecutionEngine";

export type OvernightReportData = {
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

export type OvernightReportBuilderInput = {
  startedAt: string;

  decisionResult: DecisionResponse;

  activeWork: ActiveWork | null;

  executiveReview: ExecutiveReview;

  organizationSnapshot: OrganizationSnapshot;

  judgment: Judgment;

  executionPlan: ExecutionPlan;

  contentPackage: ContentPackage | null;
};

function uniqueValues(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
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
  decisionResult: DecisionResponse,
  executiveReview: ExecutiveReview,
): string[] {
  const missingBusinessInformation =
    decisionResult.businessAssessment
      ?.missingInformation ??
    [];

  return uniqueValues([
    ...decisionResult.missingMemory,

    ...missingBusinessInformation.map(
      (item) =>
        `Business information still needed: ${item}`,
    ),

    ...decisionResult.cognitiveSession
      .uncertainties,

    executiveReview.biggestRisk !==
    "No major risk detected."
      ? `Executive risk: ${executiveReview.biggestRisk}`
      : "",
  ]);
}

function buildCompletedWork(
  contentPackage: ContentPackage | null,
): string[] {
  const completedWork = [
    "Reviewed business context.",
    "Recalled relevant long-term memory.",
    "Reviewed active work and the last known stopping point.",
    "Completed KAI's cognitive reasoning process.",
    "Reviewed every registered department.",
    "Recorded the latest organization health snapshot.",
    "Completed KAI's executive review.",
    "Reviewed Watchtower activity and current business changes.",
    "Applied KAI's judgment to the highest-priority action.",
    "Created an execution plan for the next business action.",
    "Separated owner decisions from work KAI can handle.",
    "Saved the completed decision into permanent memory.",
  ];

  if (contentPackage) {
    completedWork.push(
      `Created "${contentPackage.title}" as a complete content package.`,
    );

    completedWork.push(
      "Added the finished content package to the Review Queue.",
    );
  }

  return completedWork;
}

export class OvernightReportBuilder {
  build(
    input: OvernightReportBuilderInput,
  ): OvernightReportData {
    const {
      startedAt,
      decisionResult,
      activeWork,
      executiveReview,
      organizationSnapshot,
      judgment,
      executionPlan,
      contentPackage,
    } = input;

    return {
      startedAt,

      finishedAt:
        new Date().toISOString(),

      summary:
        executiveReview.summary,

      completedWork:
        buildCompletedWork(
          contentPackage,
        ),

      opportunities:
        executiveReview.priorities
          .slice(0, 3)
          .map(
            (priority) =>
              priority.title,
          ),

      warnings:
        buildWarnings(
          decisionResult,
          executiveReview,
        ),

      nextOwnerDecision:
        decisionResult.decision
          .morningQuestion.question,

      activeWork,

      contentCreated:
        contentPackage !== null,

      createdContentTitle:
        contentPackage?.title ??
        "",

      executiveReview,

      executivePriority:
        executiveReview.biggestOpportunity,

      ownerTasks:
        buildOwnerTasks(
          executiveReview,
        ),

      kaiTasks:
        buildKaiTasks(
          executiveReview,
        ),

      biggestRisk:
        executiveReview.biggestRisk,

      biggestOpportunity:
        executiveReview.biggestOpportunity,

      cognitiveSessionId:
        decisionResult.cognitiveSession.id,

      reasoningTrace:
        decisionResult.cognitiveSession
          .reasoningTrace,

      uncertainties:
        decisionResult.cognitiveSession
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
  }
}

export const overnightReportBuilder =
  new OvernightReportBuilder();