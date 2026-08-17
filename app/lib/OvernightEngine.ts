import { departmentRegistry } from "./DepartmentRegistry";

import { decisionCore, type DecisionRequest } from "./DecisionCore";

import { memoryBrain, type ActiveWork } from "./MemoryBrain";

import {
  contentIntelligenceEngine,
  type ContentPackage,
} from "./ContentIntelligenceEngine";

import { executiveBrain, type ExecutiveReview } from "./ExecutiveBrain";

import {
  organizationMemory,
  type OrganizationSnapshot,
} from "./OrganizationMemory";

import { watchtower } from "./Watchtower";

import { judgmentEngine, type Judgment } from "./JudgmentEngine";

import { executionEngine, type ExecutionPlan } from "./ExecutionEngine";

import { executionPlanRepository } from "./database/ExecutionPlanRepository";

import {
  autonomousContentCycleEngine,
  type AutonomousContentCycle,
} from "./AutonomousContentCycleEngine";

import { approvalIntelligenceEngine } from "./ApprovalIntelligenceEngine";

import { revenueAttributionBrain } from "./RevenueAttributionBrain";

import { revenueOptimizationEngine } from "./RevenueOptimizationEngine";

import {
  autonomousGrowthPlanner,
  type AutonomousGrowthPlan,
} from "./AutonomousGrowthPlanner";

import { autonomousGrowthPlanRepository } from "./database/AutonomousGrowthPlanRepository";

import {
  growthPlanExecutionEngine,
  type GrowthPlanProgress,
} from "./GrowthPlanExecutionEngine";

import {
  weeklyRecoveryBrain,
  type WeeklyRecoveryResult,
} from "./WeeklyRecoveryBrain";
import { autonomousVideoQueueEngine } from "./AutonomousVideoQueueEngine";
import { videoExperimentPlanner } from "./VideoExperimentPlanner";
import { creativeWinnerSystem } from "./CreativeWinnerSystem";
import { creativeRefreshEngine } from "./CreativeRefreshEngine";
import { creativePortfolioManager } from "./CreativePortfolioManager";
import { crossPlatformExpansionEngine } from "./CrossPlatformExpansionEngine";
import { campaignSequencingEngine } from "./CampaignSequencingEngine";
import { revenueScalingGovernor } from "./RevenueScalingGovernor";
import { growthOperatingLoop } from "./GrowthOperatingLoop";
import { weeklyLearningLoop } from "./WeeklyLearningLoop";
import { verifiedBusinessLaunchEngine } from "./VerifiedBusinessLaunchEngine";

import {
  overnightReportRepository,
  type StoredOvernightReport,
} from "./database/OvernightReportRepository";

import { supabaseServer } from "./supabaseServer";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

import path from "path";
import { randomUUID } from "crypto";

type ReviewQueueItem = {
  id: string;

  createdAt: string;

  status: "needs_review";

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

  videoPlan: {
    openingText: string;

    scenes: string[];

    endingText: string;

    estimatedLengthSeconds: number;
  };

  reason: string;

  format: "faceless_video" | "record_yourself" | "upload_video";

  destinationLink: string;

  pinnedComment: string;

  suggestedPostingTime?: string;

  confidence?: number;

  estimatedBusinessImpact?: string;

  followUpIdeas?: string[];

  sourceOpportunityId?: string;

  approvalIntelligence?: ContentPackage["approvalIntelligence"];

  growthPlan?: ContentPackage["growthPlan"];

  adaptiveCreation?: ContentPackage["adaptiveCreation"];
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

  growthPlanId: string;
  growthPlanSummary: string;
  weeklyRevenueTarget: number;
  plannedContentCount: number;
  growthPlanProgress: string;
  remainingWeeklyRevenueTarget: number;
  weekOnPace: boolean;
  recoveryDiagnosis: string;
  recoveryBriefing: string;
  recoveryActionsTaken: number;
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

  autonomousCycle: AutonomousContentCycle | null;

  growthPlan: AutonomousGrowthPlan;
};

const dataFolder = path.join(process.cwd(), "data");

const reviewQueueFile = path.join(dataFolder, "review-queue.json");

function ensureReviewQueueFile() {
  mkdirSync(dataFolder, {
    recursive: true,
  });

  if (!existsSync(reviewQueueFile)) {
    writeFileSync(reviewQueueFile, "[]", "utf8");
  }
}

function readReviewQueue(): ReviewQueueItem[] {
  ensureReviewQueueFile();

  try {
    const raw = readFileSync(reviewQueueFile, "utf8");

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as ReviewQueueItem[]) : [];
  } catch {
    return [];
  }
}

function saveReviewQueue(queue: ReviewQueueItem[]) {
  ensureReviewQueueFile();

  writeFileSync(reviewQueueFile, JSON.stringify(queue, null, 2), "utf8");
}

function contentPackageToReviewItem(
  contentPackage: ContentPackage,

  executionPlanId: string,
): ReviewQueueItem {
  return {
    id: randomUUID(),

    createdAt: new Date().toISOString(),

    status: "needs_review",

    executionPlanId,

    idea: contentPackage.idea,

    hook: contentPackage.hook,

    title: contentPackage.title,

    script: contentPackage.script,

    caption: contentPackage.caption,

    hashtags: contentPackage.hashtags,

    thumbnailIdea: contentPackage.thumbnailIdea,

    callToAction: contentPackage.callToAction,

    audience: contentPackage.audience,

    recommendedPlatforms: contentPackage.recommendedPlatforms,

    videoPlan: {
      openingText: contentPackage.videoPlan.openingText,

      scenes: contentPackage.videoPlan.scenes,

      endingText: contentPackage.videoPlan.endingText,

      estimatedLengthSeconds: contentPackage.videoPlan.estimatedLengthSeconds,
    },

    reason: contentPackage.reason,

    format: contentPackage.format,

    destinationLink: contentPackage.destinationLink,

    pinnedComment: contentPackage.pinnedComment,

    suggestedPostingTime: contentPackage.suggestedPostingTime,

    confidence: contentPackage.confidence,

    estimatedBusinessImpact: contentPackage.estimatedBusinessImpact,

    followUpIdeas: contentPackage.followUpIdeas,

    sourceOpportunityId: contentPackage.sourceOpportunityId,

    approvalIntelligence: contentPackage.approvalIntelligence,

    growthPlan: contentPackage.growthPlan,

    adaptiveCreation: contentPackage.adaptiveCreation,
  };
}

function saveContentToReviewQueue(
  contentPackage: ContentPackage,

  executionPlanId: string,
): ReviewQueueItem {
  const queue = readReviewQueue();

  const reviewItem = contentPackageToReviewItem(
    contentPackage,
    executionPlanId,
  );

  queue.push(reviewItem);

  queue.sort(
    (left, right) =>
      (right.approvalIntelligence?.reviewPriority ?? 0) -
      (left.approvalIntelligence?.reviewPriority ?? 0),
  );

  saveReviewQueue(queue);

  return reviewItem;
}

function buildOwnerTasks(executiveReview: ExecutiveReview): string[] {
  return executiveReview.ownerTasks.map(
    (task) => `${task.title}: ${task.reason}`,
  );
}

function buildKaiTasks(executiveReview: ExecutiveReview): string[] {
  return executiveReview.kaiTasks.map(
    (task) => `${task.title}: ${task.reason}`,
  );
}

function buildWarnings(
  missingMemory: string[],

  missingBusinessInformation: string[],

  executiveReview: ExecutiveReview,

  uncertainties: string[],
): string[] {
  return Array.from(
    new Set(
      [
        ...missingMemory,

        ...missingBusinessInformation.map(
          (item) => `Business information still needed: ${item}`,
        ),

        ...uncertainties,

        executiveReview.biggestRisk &&
        executiveReview.biggestRisk !== "No major risk detected."
          ? `Executive risk: ${executiveReview.biggestRisk}`
          : "",
      ].filter(Boolean),
    ),
  );
}

function prioritize(
  values: string[] | undefined,
  preferred: string | undefined,
): string[] | undefined {
  if (!values || !preferred) return values;
  const match = values.find(
    (value) => value.toLowerCase() === preferred.toLowerCase(),
  );
  return match
    ? [match, ...values.filter((value) => value !== match)]
    : [preferred, ...values];
}

function optimizedFormat(value: string | undefined): ContentPackage["format"] {
  return value === "record_yourself" || value === "upload_video"
    ? value
    : "faceless_video";
}

async function saveOvernightReportToCloud(
  storedReport: StoredOvernightReport,

  report: OvernightReport,
) {
  const { error } = await supabaseServer.from("kai_overnight_reports").upsert(
    {
      report_id: storedReport.id,

      report,

      created_at: storedReport.createdAt,
    },
    {
      onConflict: "report_id",
    },
  );

  if (error) {
    throw new Error(
      `KAI saved the overnight report locally but could not save it to Supabase: ${error.message}`,
    );
  }
}

export class OvernightEngine {
  async run(request: DecisionRequest): Promise<OvernightRunResult> {
    const startedAt = new Date().toISOString();

    const activeWork = await memoryBrain.getActiveWork();

    const overnightVideoJob = await autonomousVideoQueueEngine.processNext();

    const revenueSummary = await revenueAttributionBrain.summary();

    const revenueOptimization = revenueOptimizationEngine.optimize(
      revenueSummary.ranked,
    );

    const launchDirective =
      await verifiedBusinessLaunchEngine.activeDirective();
    const requestProducts = launchDirective
      ? [launchDirective.product]
      : (request.products ?? request.businessProfile?.products);
    const requestOffers = launchDirective
      ? [launchDirective.offer]
      : (request.offers ?? request.businessProfile?.services);
    const requestPlatforms = launchDirective?.platform
      ? [launchDirective.platform]
      : (request.connectedPlatforms ?? request.businessProfile?.platforms);
    const proposedGrowthPlan = autonomousGrowthPlanner.plan(
      revenueOptimization,
      {
        postsPerWeek:
          launchDirective?.contentCount ??
          (await revenueScalingGovernor.suggestedWeeklyPosts()),
        fallback: {
          product: requestProducts?.[0],
          offer: requestOffers?.[0] ?? requestProducts?.[0],
          platform: requestPlatforms?.[0],
          format: "faceless_video",
        },
      },
    );
    const storedGrowthPlan =
      (await autonomousGrowthPlanRepository.forWeek(
        proposedGrowthPlan.weekStart,
      )) ?? (await autonomousGrowthPlanRepository.save(proposedGrowthPlan));
    let growthProgress: GrowthPlanProgress =
      await growthPlanExecutionEngine.progress(storedGrowthPlan);
    const recovery: WeeklyRecoveryResult = await weeklyRecoveryBrain.recover({
      plan: growthProgress.plan,
      progress: growthProgress,
      optimization: revenueOptimization,
    });
    let growthPlan = await autonomousGrowthPlanRepository.save(recovery.plan);
    if (launchDirective)
      await verifiedBusinessLaunchEngine.markActive(growthPlan.id);
    await creativeWinnerSystem.sync();
    await weeklyLearningLoop.reconcilePrevious(growthPlan);
    await weeklyLearningLoop.reconcile(growthPlan);
    await growthOperatingLoop.prepare(growthPlan);
    await creativePortfolioManager.plan(growthPlan);
    await campaignSequencingEngine.plan(growthPlan);
    growthProgress = await growthPlanExecutionEngine.progress(growthPlan);
    const nextGrowthSlot = growthProgress.nextSlot;

    const attributedRequest: DecisionRequest = {
      ...request,
      recentViews: request.recentViews ?? revenueSummary.totals.views,
      recentClicks: request.recentClicks ?? revenueSummary.totals.clicks,
      recentSales: request.recentSales ?? revenueSummary.totals.sales,
      recentRevenue: request.recentRevenue ?? revenueSummary.totals.revenue,
      revenueNeeded: request.revenueNeeded ?? revenueSummary.totals.sales === 0,
      previousDecisions: [
        ...(request.previousDecisions ?? []),
        ...(revenueSummary.topRevenueCycle
          ? [
              `Prioritize the proven revenue-producing combination from ${revenueSummary.topRevenueCycle.title}: ${revenueSummary.topRevenueCycle.platform}, ${revenueSummary.topRevenueCycle.format}, and its measured offer path produced ${revenueSummary.topRevenueCycle.sales} sale${revenueSummary.topRevenueCycle.sales === 1 ? "" : "s"} and $${revenueSummary.topRevenueCycle.revenue.toFixed(2)} revenue.`,
            ]
          : []),
        ...(revenueSummary.attentionOnly.length > 0
          ? [
              `Do not prioritize views alone: ${revenueSummary.attentionOnly.length} content cycle${revenueSummary.attentionOnly.length === 1 ? "" : "s"} earned attention without producing a click, lead, or sale.`,
            ]
          : []),
        revenueOptimization.priorityReason,
        growthPlan.approvalBrief,
        recovery.briefing,
      ],
    };

    const result = await decisionCore.think(attributedRequest);

    const departmentReview = await departmentRegistry.reviewAll();

    const organizationSnapshot = await organizationMemory.recordOrganization(
      departmentReview.reports,
    );

    const executiveReview = executiveBrain.review({
      decision: result,

      activeWork,

      departments: departmentReview.reports,
    });

    const watchtowerStatus = watchtower.summarize();

    const judgment = judgmentEngine.evaluate({
      executiveReview,

      organization: organizationSnapshot,

      watchtower: watchtowerStatus,
    });

    const executionPlan = await executionEngine.createPlan(judgment);

    await executionPlanRepository.save(executionPlan);

    let contentPackage: ContentPackage | null = null;

    let reviewItemId: string | null = null;

    let autonomousCycle: AutonomousContentCycle | null = null;

    if (contentIntelligenceEngine.shouldGenerate(result.decision)) {
      contentPackage = await contentIntelligenceEngine.generate({
        decision: result.decision,

        businessName:
          request.businessName ?? request.businessProfile?.businessName,

        ownerName: request.ownerName ?? request.businessProfile?.ownerName,

        products: prioritize(
          requestProducts,
          nextGrowthSlot?.product ?? revenueOptimization.winner?.product,
        ),

        offers: prioritize(
          requestOffers,
          nextGrowthSlot?.offer ?? revenueOptimization.winner?.offer,
        ),

        targetAudience:
          request.targetAudience ?? request.businessProfile?.targetAudience,

        connectedPlatforms: prioritize(
          requestPlatforms,
          nextGrowthSlot?.platform ?? revenueOptimization.winner?.platform,
        ),

        brandVoice: request.businessProfile?.brandVoice,

        destinationLink: launchDirective?.destinationLink,

        preferredFormat: optimizedFormat(
          nextGrowthSlot?.format ?? revenueOptimization.winner?.format,
        ),

        ...(nextGrowthSlot
          ? {
              growthDirective: {
                product: nextGrowthSlot.product,
                platform: nextGrowthSlot.platform,
                format: optimizedFormat(nextGrowthSlot.format),
                hook: nextGrowthSlot.hook,
                callToAction: nextGrowthSlot.callToAction,
                offer: nextGrowthSlot.offer,
                campaign:
                  (await campaignSequencingEngine.directiveForSlot(
                    growthPlan,
                    nextGrowthSlot.id,
                  )) ?? undefined,
              },
            }
          : {}),
      });

      contentPackage = {
        ...contentPackage,
        reason: `${contentPackage.reason} ${revenueOptimization.priorityReason} ${growthPlan.approvalBrief}`,
        revenueOptimization: {
          action: revenueOptimization.winner?.action ?? "learning",
          allocationPercent: revenueOptimization.winner?.allocationPercent ?? 0,
          nextRevenueTarget: revenueOptimization.nextRevenueTarget,
          priorityReason: revenueOptimization.priorityReason,
          challenger: revenueOptimization.challenger
            ? `${revenueOptimization.challenger.variable}: ${revenueOptimization.challenger.variation}`
            : null,
        },
        ...(nextGrowthSlot
          ? {
              growthPlan: {
                planId: growthPlan.id,
                slotId: nextGrowthSlot.id,
                position: nextGrowthSlot.position,
                bucket: nextGrowthSlot.bucket,
                scheduledFor: nextGrowthSlot.scheduledFor,
                weeklyRevenueTarget: growthPlan.weeklyRevenueTarget,
                expectedOutcome: nextGrowthSlot.expectedOutcome,
                stopRule: nextGrowthSlot.stopRule,
              },
            }
          : {}),
        ...(launchDirective
          ? {
              businessLaunch: {
                launchId: launchDirective.launchId,
                product: launchDirective.product,
                destinationLink: launchDirective.destinationLink,
                revenueGoal: launchDirective.revenueGoal,
              },
            }
          : {}),
      };

      contentPackage = await approvalIntelligenceEngine.prepare(contentPackage);

      contentPackage = revenueAttributionBrain.instrument(
        contentPackage,
        executionPlan.id,
      );

      const reviewItem = saveContentToReviewQueue(
        contentPackage,
        executionPlan.id,
      );

      reviewItemId = reviewItem.id;

      autonomousCycle = await autonomousContentCycleEngine.start({
        executionPlanId: executionPlan.id,
        reviewItemId: reviewItem.id,
        contentPackage,
      });

      if (
        contentPackage &&
        contentPackage.format === "faceless_video" &&
        contentPackage.growthPlan
      ) {
        const contentGrowthPlan = contentPackage.growthPlan;
        const assignedGrowthSlot = growthPlan.slots.find(
          (slot) => slot.id === contentGrowthPlan.slotId,
        );
        const assignedExperiment =
          await videoExperimentPlanner.directiveForSlot(
            contentGrowthPlan.slotId,
          );
        const audienceMatchedExperiment =
          assignedExperiment &&
          (assignedExperiment.matchedConditions.audience ===
            "same approved target audience" ||
            assignedExperiment.matchedConditions.audience ===
              contentPackage.audience)
            ? assignedExperiment
            : null;
        await autonomousVideoQueueEngine.enqueue({
          executionPlanId: executionPlan.id,
          growthPlanId: contentPackage.growthPlan.planId,
          slotId: contentPackage.growthPlan.slotId,
          reviewItemId: reviewItem.id,
          topic: `${contentPackage.hook}\n\n${contentPackage.script}\n\n${contentPackage.callToAction}`,
          adaptiveCreation: contentPackage.adaptiveCreation,
          videoExperiment: audienceMatchedExperiment,
          creativeWinner: assignedGrowthSlot
            ? await creativePortfolioManager.directiveForSlot(
                growthPlan,
                assignedGrowthSlot,
                contentPackage.audience,
              )
            : null,
          creativePortfolio: assignedGrowthSlot
            ? await creativePortfolioManager.portfolioDirectiveForSlot(
                growthPlan,
                assignedGrowthSlot,
                contentPackage.audience,
              )
            : null,
        });
      }

      growthPlan =
        (await autonomousGrowthPlanRepository.byId(growthPlan.id)) ??
        growthPlan;
      growthProgress = await growthPlanExecutionEngine.progress(growthPlan);
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

      `Prepared a ${growthPlan.postsPlanned}-post autonomous growth plan for owner approval.`,

      ...(overnightVideoJob
        ? [
            `Advanced video production for ${overnightVideoJob.topic.slice(0, 80)} to ${overnightVideoJob.status.replaceAll("_", " ")}.`,
          ]
        : []),
    ];

    if (contentPackage) {
      completedWork.push(
        `Created "${contentPackage.title}" as a complete content package.`,
      );

      completedWork.push("Linked the content package to its execution plan.");

      completedWork.push(
        "Added the finished content package to the Review Queue.",
      );
    }

    const ownerTasks = buildOwnerTasks(executiveReview);

    ownerTasks.push(...recovery.ownerApprovals);

    const kaiTasks = buildKaiTasks(executiveReview);

    const warnings = buildWarnings(
      result.missingMemory,

      result.businessAssessment?.missingInformation ?? [],

      executiveReview,

      result.cognitiveSession.uncertainties,
    );

    const report: OvernightReport = {
      startedAt,

      finishedAt: new Date().toISOString(),

      summary: executiveReview.summary,

      completedWork,

      opportunities: executiveReview.priorities
        .slice(0, 3)
        .map((priority) => priority.title),

      warnings,

      nextOwnerDecision: result.decision.morningQuestion.question,

      activeWork,

      contentCreated: contentPackage !== null,

      createdContentTitle: contentPackage?.title ?? "",

      executiveReview,

      executivePriority: executiveReview.biggestOpportunity,

      ownerTasks,

      kaiTasks,

      biggestRisk: executiveReview.biggestRisk,

      biggestOpportunity: executiveReview.biggestOpportunity,

      cognitiveSessionId: result.cognitiveSession.id,

      reasoningTrace: result.cognitiveSession.reasoningTrace,

      uncertainties: result.cognitiveSession.uncertainties,

      organizationHealth: organizationSnapshot.overallHealthScore,

      organizationTrend: organizationSnapshot.overallTrend,

      judgment: judgment.conclusion,

      judgmentConfidence: judgment.confidence,

      executionPlanId: executionPlan.id,

      executionStatus: executionPlan.status,

      executionProgress: executionPlan.progress,

      executionNextAction: executionPlan.nextAction,

      growthPlanId: growthPlan.id,

      growthPlanSummary: growthPlan.approvalBrief,

      weeklyRevenueTarget: growthPlan.weeklyRevenueTarget,

      plannedContentCount: growthPlan.postsPlanned,

      growthPlanProgress: growthProgress.summary,

      remainingWeeklyRevenueTarget: growthProgress.remainingRevenueTarget,

      weekOnPace: growthProgress.onPace,

      recoveryDiagnosis: recovery.diagnosis,

      recoveryBriefing: recovery.briefing,

      recoveryActionsTaken: recovery.actions.filter(
        (item) => !item.ownerApprovalRequired,
      ).length,
    };

    const storedReport = await overnightReportRepository.save(report);

    await saveOvernightReportToCloud(storedReport, report);

    return {
      report,

      storedReport,

      contentPackage,

      reviewItemId,

      executiveReview,

      organizationSnapshot,

      judgment,

      executionPlan,

      autonomousCycle,

      growthPlan,
    };
  }

  async latest(): Promise<StoredOvernightReport | null> {
    return overnightReportRepository.latest();
  }

  async history(limit = 30): Promise<StoredOvernightReport[]> {
    return overnightReportRepository.history(limit);
  }
}

export const overnightEngine = new OvernightEngine();
