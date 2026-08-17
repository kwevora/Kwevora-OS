import type {
  AutonomousContentCycle,
  AutonomousCycleStatus,
} from "./AutonomousContentCycleEngine";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";
import { executionPlanRepository } from "./database/ExecutionPlanRepository";
import { outcomeEvaluationRepository } from "./database/OutcomeEvaluationRepository";
import { experimentRepository } from "./database/ExperimentRepository";
import {
  revenueAttributionBrain,
  type RevenueAttribution,
} from "./RevenueAttributionBrain";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";

export type CommandCenterMetric = {
  name: string;
  target: number;
  actual: number | null;
  percent: number | null;
};

export type CommandCenterItem = {
  id: string;
  executionPlanId: string;
  title: string;
  product: string;
  status: AutonomousCycleStatus;
  stageLabel: string;
  stageNumber: number;
  ownerAttentionRequired: boolean;
  attentionRank: number;
  nextAction: string;
  blocker: string | null;
  predictedApproval: number | null;
  approvalPredictionAccuracy: number | null;
  correctionsApplied: string[];
  familiarIssues: string[];
  ownerEdits: string[];
  metrics: CommandCenterMetric[];
  experiment: {
    variable: string;
    hypothesis: string;
    status: string;
    verdict: string | null;
    explanation: string;
  } | null;
  learning: {
    result: string;
    score: number;
    changeNext: string;
  } | null;
  revenueAttribution: RevenueAttribution | null;
  history: Array<{ type: string; at: string; message: string }>;
  updatedAt: string;
};

export type PerformanceCommandCenterReport = {
  generatedAt: string;
  summary: {
    total: number;
    needsAttention: number;
    awaitingApproval: number;
    blocked: number;
    publishingOrMonitoring: number;
    learned: number;
  };
  topAttention: CommandCenterItem[];
  active: CommandCenterItem[];
  history: CommandCenterItem[];
};

const STAGES: Record<AutonomousCycleStatus, { label: string; number: number }> =
  {
    awaiting_review: { label: "Awaiting approval", number: 2 },
    approved: { label: "Approved", number: 3 },
    publishing_blocked: { label: "Publishing blocked", number: 3 },
    published: { label: "Published", number: 4 },
    monitoring: { label: "Measuring results", number: 5 },
    learned: { label: "Learned", number: 6 },
    stopped: { label: "Stopped", number: 6 },
  };

function metricActual(
  name: string,
  metrics: Array<{ name: string; actual: number }> | undefined,
): number | null {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/^youtube\s+/, "");
  return (
    metrics?.find(
      (metric) =>
        metric.name
          .trim()
          .toLowerCase()
          .replace(/^youtube\s+/, "") === normalized,
    )?.actual ?? null
  );
}

function snapshotMetricActual(
  name: string,
  metrics: Record<string, number | null> | undefined,
): number | null {
  if (!metrics) return null;
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/^youtube\s+/, "")
    .replace(/[^a-z0-9]/g, "");
  const match = Object.entries(metrics).find(
    ([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
  );
  return match?.[1] ?? null;
}

function attentionRank(cycle: AutonomousContentCycle): number {
  const reviewPriority =
    cycle.originalContent.approvalIntelligence?.reviewPriority ?? 0;
  const statusWeight =
    cycle.status === "publishing_blocked"
      ? 100
      : cycle.status === "awaiting_review"
        ? 85
        : cycle.ownerAttentionRequired
          ? 70
          : 0;
  return Math.round(statusWeight + reviewPriority * 0.2);
}

async function buildItem(
  cycle: AutonomousContentCycle,
): Promise<CommandCenterItem> {
  const plan = await executionPlanRepository.get(cycle.executionPlanId);
  const outcome =
    (
      await outcomeEvaluationRepository.forExecutionPlan(cycle.executionPlanId)
    )[0] ?? null;
  const performance =
    await contentPerformanceSnapshotRepository.latestForExecution(
      cycle.executionPlanId,
    );
  const experiment = await experimentRepository.forExecutionPlan(
    cycle.executionPlanId,
  );
  const measuredMetrics = outcome?.evaluation.metrics;
  const metrics = (plan?.measurementPlan?.metrics ?? []).map((metric) => {
    const actual =
      metricActual(metric.name, measuredMetrics) ??
      snapshotMetricActual(metric.name, performance?.metrics);
    return {
      name: metric.name,
      target: metric.target,
      actual,
      percent:
        actual === null || metric.target === 0
          ? null
          : Math.max(0, Math.round((actual / metric.target) * 100)),
    };
  });
  const stage = STAGES[cycle.status];
  const approval = cycle.originalContent.approvalIntelligence;
  const lastEvent = cycle.events.at(-1);
  const revenueAttribution = await revenueAttributionBrain.forCycle(
    cycle.executionPlanId,
  );

  return {
    id: cycle.id,
    executionPlanId: cycle.executionPlanId,
    title: cycle.title,
    product: cycle.product,
    status: cycle.status,
    stageLabel: stage.label,
    stageNumber: stage.number,
    ownerAttentionRequired: cycle.ownerAttentionRequired,
    attentionRank: attentionRank(cycle),
    nextAction: cycle.nextAction,
    blocker:
      cycle.status === "publishing_blocked"
        ? (lastEvent?.message ?? cycle.nextAction)
        : cycle.status === "stopped"
          ? (cycle.stopReason ?? lastEvent?.message ?? null)
          : null,
    predictedApproval:
      cycle.predictedApproval ?? approval?.predictedApproval ?? null,
    approvalPredictionAccuracy: approval?.predictionAccuracy ?? null,
    correctionsApplied: approval?.correctionsApplied ?? [],
    familiarIssues: approval?.familiarIssues ?? [],
    ownerEdits: cycle.ownerEdits,
    metrics,
    experiment: experiment
      ? {
          variable: experiment.variable.replaceAll("_", " "),
          hypothesis: experiment.hypothesis,
          status: experiment.status,
          verdict: experiment.verdict ?? null,
          explanation:
            experiment.resultExplanation ??
            "KAI is waiting for a measured result before deciding whether to keep, revise, or stop this variation.",
        }
      : null,
    learning: outcome
      ? {
          result: outcome.outcome,
          score: outcome.score,
          changeNext: outcome.evaluation.recommendations[0] ?? cycle.nextAction,
        }
      : performance
        ? {
            result: performance.decision,
            score: performance.confidence,
            changeNext: performance.recommendation,
          }
        : null,
    revenueAttribution,
    history: cycle.events,
    updatedAt: cycle.updatedAt,
  };
}

export class PerformanceCommandCenter {
  async build(): Promise<PerformanceCommandCenterReport> {
    const items = (
      await Promise.all(
        (await autonomousCycleRepository.history(200)).map(buildItem),
      )
    ).sort(
      (left, right) =>
        right.attentionRank - left.attentionRank ||
        new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
    );
    const active = items.filter(
      (item) => item.status !== "learned" && item.status !== "stopped",
    );
    const history = items.filter(
      (item) => item.status === "learned" || item.status === "stopped",
    );
    const topAttention = items
      .filter((item) => item.ownerAttentionRequired)
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: items.length,
        needsAttention: items.filter((item) => item.ownerAttentionRequired)
          .length,
        awaitingApproval: items.filter(
          (item) => item.status === "awaiting_review",
        ).length,
        blocked: items.filter((item) => item.status === "publishing_blocked")
          .length,
        publishingOrMonitoring: items.filter(
          (item) =>
            item.status === "approved" ||
            item.status === "published" ||
            item.status === "monitoring",
        ).length,
        learned: items.filter((item) => item.status === "learned").length,
      },
      topAttention,
      active,
      history: history.slice(0, 30),
    };
  }
}

export const performanceCommandCenter = new PerformanceCommandCenter();
