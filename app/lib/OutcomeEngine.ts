import {
  executionEngine,
  type ExecutionLearningResult,
  type ExecutionPlan,
} from "./ExecutionEngine";

import type { LearningResult } from "./LearningBrain";

import { executionPlanRepository } from "./database/ExecutionPlanRepository";

import {
  outcomeEvaluationRepository,
  type StoredOutcomeEvaluation,
} from "./database/OutcomeEvaluationRepository";

import { experimentEngine, type ExecutionExperiment } from "./ExperimentEngine";

import { autonomousContentCycleEngine } from "./AutonomousContentCycleEngine";

export type OutcomeMetric = {
  name: string;

  actual: number;

  target?: number;

  previous?: number;

  higherIsBetter?: boolean;
};

export type OutcomeInput = {
  executionPlan: ExecutionPlan;

  metrics?: OutcomeMetric[];

  observations?: string[];

  completedAt?: string;
};

export type OutcomeEvaluation = {
  outcome: LearningResult;

  score: number;

  metrics?: OutcomeMetric[];

  observations: string[];

  lessons: string[];

  recommendations: string[];

  learningResult: ExecutionLearningResult;

  experimentResult?: ExecutionExperiment;
};

export type PersistedOutcomeEvaluation = {
  evaluation: OutcomeEvaluation;

  storedEvaluation: StoredOutcomeEvaluation;
};

type MetricEvaluation = {
  name: string;

  score: number;

  observation: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanValues(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function canonicalMetricName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^youtube\s+/, "");
}

function applyExecutionTargets(
  metrics: OutcomeMetric[],
  executionPlan: ExecutionPlan,
): OutcomeMetric[] {
  const targets = executionPlan.measurementPlan?.metrics ?? [];

  if (targets.length === 0) {
    return metrics;
  }

  return metrics.map((metric) => {
    const target = targets.find(
      (candidate) =>
        canonicalMetricName(candidate.name) ===
        canonicalMetricName(metric.name),
    );

    return target
      ? {
          ...metric,
          name: target.name,
          target: target.target,
          previous: target.baseline,
          higherIsBetter: target.higherIsBetter,
        }
      : metric;
  });
}

function evaluateMetric(metric: OutcomeMetric): MetricEvaluation | null {
  if (!Number.isFinite(metric.actual)) {
    return null;
  }

  const higherIsBetter = metric.higherIsBetter ?? true;

  if (typeof metric.target === "number" && Number.isFinite(metric.target)) {
    if (metric.target === 0) {
      const achieved = higherIsBetter ? metric.actual >= 0 : metric.actual <= 0;

      return {
        name: metric.name,

        score: achieved ? 100 : 0,

        observation: `${metric.name}: actual ${metric.actual}, target ${metric.target}.`,
      };
    }

    const ratio = higherIsBetter
      ? metric.actual / metric.target
      : metric.actual === 0
        ? 1
        : metric.target / metric.actual;

    return {
      name: metric.name,

      score: clampScore(ratio * 100),

      observation: `${metric.name}: actual ${metric.actual}, target ${metric.target}.`,
    };
  }

  if (typeof metric.previous === "number" && Number.isFinite(metric.previous)) {
    if (metric.previous === 0) {
      const improved = higherIsBetter ? metric.actual > 0 : metric.actual <= 0;

      return {
        name: metric.name,

        score: improved ? 100 : 50,

        observation: `${metric.name}: actual ${metric.actual}, previous ${metric.previous}.`,
      };
    }

    const change = higherIsBetter
      ? (metric.actual - metric.previous) / Math.abs(metric.previous)
      : (metric.previous - metric.actual) / Math.abs(metric.previous);

    return {
      name: metric.name,

      score: clampScore(50 + change * 100),

      observation: `${metric.name}: actual ${metric.actual}, previous ${metric.previous}.`,
    };
  }

  return {
    name: metric.name,

    score: 50,

    observation: `${metric.name}: actual ${metric.actual}. No target or previous result was available yet.`,
  };
}

function classifyOutcome(score: number): LearningResult {
  if (score >= 75) {
    return "success";
  }

  if (score >= 40) {
    return "partial";
  }

  return "failure";
}

function buildLesson(outcome: LearningResult, score: number): string {
  if (outcome === "success") {
    return `The execution produced a strong measured result with an outcome score of ${score}%. Preserve the parts of this approach that contributed to the result.`;
  }

  if (outcome === "partial") {
    return `The execution produced mixed measured results with an outcome score of ${score}%. Keep what worked and improve the weaker parts before repeating it.`;
  }

  return `The execution produced a weak measured result with an outcome score of ${score}%. KAI should change the approach before repeating similar work.`;
}

function buildRecommendation(outcome: LearningResult): string {
  if (outcome === "success") {
    return "Use this result as positive evidence when KAI evaluates similar future actions.";
  }

  if (outcome === "partial") {
    return "Compare the strongest and weakest metrics before the next similar execution and adjust the approach.";
  }

  return "Do not repeat the same approach unchanged. Use the measured result to choose a different strategy.";
}

export class OutcomeEngine {
  async evaluate(input: OutcomeInput): Promise<PersistedOutcomeEvaluation> {
    const measuredMetrics = applyExecutionTargets(
      input.metrics ?? [],
      input.executionPlan,
    );

    const metricEvaluations = measuredMetrics
      .map(evaluateMetric)
      .filter((value): value is MetricEvaluation => value !== null);

    const score =
      metricEvaluations.length > 0
        ? clampScore(
            metricEvaluations.reduce(
              (total, metric) => total + metric.score,
              0,
            ) / metricEvaluations.length,
          )
        : 50;

    const outcome = classifyOutcome(score);

    const observations = cleanValues([
      ...metricEvaluations.map((metric) => metric.observation),

      ...(input.observations ?? []),
    ]);

    const lessons = [buildLesson(outcome, score)];

    const recommendations = [buildRecommendation(outcome)];

    let learningResult = await executionEngine.recordOutcome(
      input.executionPlan,
      {
        outcome,

        observations,

        lessons,

        recommendations,

        completedAt: input.completedAt,
      },
    );

    const experimentResult = input.executionPlan.experiment
      ? await experimentEngine.complete({
          experiment: input.executionPlan.experiment,
          outcome,
          score,
          completedAt: input.completedAt ?? new Date().toISOString(),
        })
      : undefined;

    if (experimentResult) {
      learningResult = {
        ...learningResult,
        plan: {
          ...learningResult.plan,
          experiment: experimentResult,
        },
      };
    }

    await executionPlanRepository.save(learningResult.plan);

    const evaluation: OutcomeEvaluation = {
      outcome,

      score,

      metrics: measuredMetrics,

      observations,

      lessons,

      recommendations,

      learningResult,

      experimentResult,
    };

    const storedEvaluation = await outcomeEvaluationRepository.save(evaluation);

    await autonomousContentCycleEngine.learn(
      input.executionPlan.id,
      evaluation,
    );

    return {
      evaluation,

      storedEvaluation,
    };
  }
}

export const outcomeEngine = new OutcomeEngine();
