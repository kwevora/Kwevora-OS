import { executionPlanRepository } from "./database/ExecutionPlanRepository";

import { outcomeEvaluationRepository } from "./database/OutcomeEvaluationRepository";

export type AdaptiveMetricTarget = {
  name: string;
  target: number;
  baseline?: number;
  higherIsBetter: boolean;
  source: "youtube" | "publishing" | "store" | "owner" | "execution";
  trend?: "improving" | "declining" | "stable" | "building";
  reason: string;
};

export type TargetCalibration = "initial" | "observed" | "proven";

export type AdaptiveTargetResult = {
  metrics: AdaptiveMetricTarget[];
  contextTags: string[];
  calibration: TargetCalibration;
  relevantOutcomeCount: number;
  explanation: string;
};

type HistoricalMetric = {
  name: string;
  actual: number;
  target?: number;
};

const PLATFORM_TAGS = new Set(["facebook", "instagram", "tiktok", "youtube"]);

const GOAL_TAGS = new Set([
  "approval",
  "audience",
  "connection",
  "product",
  "revenue",
  "sales",
]);

const FORMAT_TAGS = new Set(["email", "post", "short", "video"]);

const STOP_WORDS = new Set([
  "available",
  "business",
  "complete",
  "create",
  "execution",
  "kai",
  "measure",
  "next",
  "result",
  "strongest",
  "today",
]);

function normalizeMetricName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^youtube\s+/, "");
}

function contextTagsFor(value: string): string[] {
  const normalized = value
    .toLowerCase()
    .replace(/connect(ed|ing)?/g, "connection")
    .replace(/\b(?:sell|selling|sale|sales)\b/g, "sales");

  return Array.from(
    new Set(
      normalized
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
    ),
  );
}

function dimensionMismatch(
  first: Set<string>,
  second: Set<string>,
  dimension: Set<string>,
): boolean {
  const firstValues = Array.from(first).filter((tag) => dimension.has(tag));

  const secondValues = Array.from(second).filter((tag) => dimension.has(tag));

  return (
    firstValues.length > 0 &&
    secondValues.length > 0 &&
    !firstValues.some((tag) => secondValues.includes(tag))
  );
}

function contextsMatch(
  currentTags: string[],
  historicalTags: string[],
): boolean {
  const current = new Set(currentTags);

  const historical = new Set(historicalTags);

  if (
    dimensionMismatch(current, historical, PLATFORM_TAGS) ||
    dimensionMismatch(current, historical, GOAL_TAGS) ||
    dimensionMismatch(current, historical, FORMAT_TAGS)
  ) {
    return false;
  }

  const shared = currentTags.filter((tag) => historical.has(tag));

  return shared.length >= 2;
}

function metricsFromObservations(observations: string[]): HistoricalMetric[] {
  const metrics: HistoricalMetric[] = [];

  observations.forEach((observation) => {
    const match = observation.match(
      /^(.+?): actual (-?\d+(?:\.\d+)?)(?:, target (-?\d+(?:\.\d+)?))?/i,
    );

    if (!match) return;

    const actual = Number(match[2]);
    const target = match[3] === undefined ? undefined : Number(match[3]);

    if (!Number.isFinite(actual)) {
      return;
    }

    metrics.push({
      name: match[1].trim(),
      actual,
      target: Number.isFinite(target) ? target : undefined,
    });
  });

  return metrics;
}

function minimumAcceptableTarget(metric: AdaptiveMetricTarget): number {
  const name = normalizeMetricName(metric.name);

  if (name === "views") {
    return 50;
  }

  if (name === "clicks" || name === "sales") {
    return 1;
  }

  return Math.max(1, Math.round(metric.target * 0.5));
}

function roundedTarget(value: number): number {
  if (value < 10) {
    return Number(value.toFixed(2));
  }

  return Math.round(value);
}

function trendFor(
  values: number[],
  higherIsBetter: boolean,
): NonNullable<AdaptiveMetricTarget["trend"]> {
  if (values.length < 2) {
    return "building";
  }

  const newest = values[0];
  const previous = values[1];

  if (newest === previous) {
    return "stable";
  }

  const improved = higherIsBetter ? newest > previous : newest < previous;

  return improved ? "improving" : "declining";
}

export class AdaptiveTargetEngine {
  async adapt({
    subject,
    metrics,
  }: {
    subject: string;
    metrics: AdaptiveMetricTarget[];
  }): Promise<AdaptiveTargetResult> {
    const contextTags = contextTagsFor(subject);

    const storedHistory = await outcomeEvaluationRepository.history(200);
    const relevantHistory = (
      await Promise.all(
        storedHistory.map(async (storedOutcome) => {
          const plan = await executionPlanRepository.get(
            storedOutcome.executionPlanId,
          );

          if (!plan) return null;

          const historicalTags =
            plan.measurementPlan?.contextTags ??
            contextTagsFor(`${plan.objective} ${plan.nextAction}`);

          if (!contextsMatch(contextTags, historicalTags)) {
            return null;
          }

          return {
            outcome: storedOutcome.outcome,
            metrics: storedOutcome.evaluation.metrics?.length
              ? storedOutcome.evaluation.metrics
              : metricsFromObservations(storedOutcome.evaluation.observations),
          };
        }),
      )
    )
      .filter(
        (
          value,
        ): value is {
          outcome: string;
          metrics: HistoricalMetric[];
        } => value !== null,
      )
      .slice(0, 10);

    const adaptedMetrics = metrics.map((metric) => {
      const matchingHistory = relevantHistory
        .map((history) => ({
          outcome: history.outcome,
          metric: history.metrics.find(
            (candidate) =>
              normalizeMetricName(candidate.name) ===
              normalizeMetricName(metric.name),
          ),
        }))
        .filter(
          (
            value,
          ): value is {
            outcome: string;
            metric: HistoricalMetric;
          } => value.metric !== undefined,
        );

      if (matchingHistory.length === 0) {
        return {
          ...metric,
          trend: "building" as const,
        };
      }

      const recent = matchingHistory.slice(0, 5);

      const average =
        recent.reduce((total, history) => total + history.metric.actual, 0) /
        recent.length;

      const trend = trendFor(
        recent.map((history) => history.metric.actual),
        metric.higherIsBetter,
      );

      const repeatedSuccess =
        recent.length >= 2 &&
        recent.slice(0, 2).every((history) => history.outcome === "success");

      const repeatedFailure =
        recent.length >= 2 &&
        recent.slice(0, 2).every((history) => history.outcome === "failure");

      if (repeatedSuccess) {
        const target = roundedTarget(Math.max(metric.target, average * 1.1));

        return {
          ...metric,
          target,
          baseline: roundedTarget(average),
          trend,
          reason: `${metric.reason} KAI raised this target from ${metric.target} to ${target} after repeated relevant success established an average result of ${roundedTarget(average)}. Recent performance is ${trend}.`,
        };
      }

      if (repeatedFailure) {
        const minimum = minimumAcceptableTarget(metric);

        const target = roundedTarget(
          Math.max(minimum, Math.min(metric.target, average * 1.15)),
        );

        return {
          ...metric,
          target,
          baseline: roundedTarget(average),
          trend,
          reason: `${metric.reason} KAI adjusted this target from ${metric.target} to ${target} after repeated relevant failure, but kept it above the minimum acceptable result of ${minimum}. Recent performance is ${trend}.`,
        };
      }

      return {
        ...metric,
        baseline: roundedTarget(average),
        trend,
        reason: `${metric.reason} KAI kept the target at ${metric.target} while it builds a reliable baseline from ${matchingHistory.length} relevant result${matchingHistory.length === 1 ? "" : "s"}. Recent performance is ${trend}.`,
      };
    });

    const relevantOutcomeCount = relevantHistory.length;

    const calibration: TargetCalibration =
      relevantOutcomeCount === 0
        ? "initial"
        : relevantOutcomeCount >= 2
          ? "proven"
          : "observed";

    return {
      metrics: adaptedMetrics,
      contextTags,
      calibration,
      relevantOutcomeCount,
      explanation:
        relevantOutcomeCount === 0
          ? "KAI found no comparable measured history, so this plan uses transparent initial calibration targets."
          : `KAI used ${relevantOutcomeCount} relevant measured outcome${relevantOutcomeCount === 1 ? "" : "s"} and excluded results from mismatched platforms, formats, and objectives.`,
    };
  }
}

export const adaptiveTargetEngine = new AdaptiveTargetEngine();
