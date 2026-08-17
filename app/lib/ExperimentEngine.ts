import { randomUUID } from "node:crypto";

import type { ExecutionMeasurementPlan } from "./ExecutionEngine";

import type { LearningResult } from "./LearningBrain";

import { experimentRepository } from "./database/ExperimentRepository";

import { strategyBrain, type StrategyDecision } from "./StrategyBrain";

export type ExperimentVariable =
  | "hook"
  | "call_to_action"
  | "offer"
  | "platform"
  | "format"
  | "approach";

export type ExperimentStatus = "planned" | "running" | "completed";

export type ExperimentVerdict = "keep" | "revise" | "stop";

export type ExecutionExperiment = {
  id: string;
  executionPlanId: string;
  createdAt: string;
  completedAt?: string;
  contextKey: string;
  contextTags: string[];
  variable: ExperimentVariable;
  control: string;
  variation: string;
  hypothesis: string;
  baseline: number;
  target: number;
  metricName: string;
  status: ExperimentStatus;
  verdict?: ExperimentVerdict;
  outcome?: LearningResult;
  score?: number;
  resultExplanation?: string;
};

export type ExperimentDesignResult = {
  experiment: ExecutionExperiment | null;
  strategyDecision: StrategyDecision;
  blockedByExperimentId?: string;
  reason: string;
};

function contextKeyFor(tags: string[]): string {
  return [...tags].sort().join("|") || "general";
}

function contextsConflict(left: string[], right: string[]): boolean {
  const platforms = [
    "youtube",
    "tiktok",
    "instagram",
    "linkedin",
    "pinterest",
    "facebook",
    "x",
  ];

  const leftPlatform = platforms.find((tag) => left.includes(tag));

  const rightPlatform = platforms.find((tag) => right.includes(tag));

  if (leftPlatform && rightPlatform && leftPlatform !== rightPlatform) {
    return false;
  }

  const shared = left.filter((tag) => right.includes(tag));

  return shared.length >= 2;
}

function chooseVariable(measurementPlan: ExecutionMeasurementPlan): {
  variable: ExperimentVariable;
  metricName: string;
  control: string;
  variation: string;
} {
  const declining = measurementPlan.metrics.find(
    (metric) => metric.trend === "declining",
  );

  const metric =
    declining ??
    measurementPlan.metrics.find((candidate) => candidate.name === "Views") ??
    measurementPlan.metrics.find((candidate) => candidate.name === "Clicks") ??
    measurementPlan.metrics.find((candidate) => candidate.name === "Sales") ??
    measurementPlan.metrics[0];

  if (metric.name === "Views") {
    return {
      variable: "hook",
      metricName: metric.name,
      control: "Current opening hook",
      variation: "Use one more direct problem-first opening hook",
    };
  }

  if (metric.name === "Clicks") {
    return {
      variable: "call_to_action",
      metricName: metric.name,
      control: "Current call to action",
      variation: "Use one clearer action-and-destination call to action",
    };
  }

  if (metric.name === "Sales") {
    return {
      variable: "offer",
      metricName: metric.name,
      control: "Current offer presentation",
      variation: "Use one clearer outcome-focused offer presentation",
    };
  }

  return {
    variable: "approach",
    metricName: metric.name,
    control: "Current execution approach",
    variation: "Change one execution step while preserving the objective",
  };
}

export class ExperimentEngine {
  async design({
    executionPlanId,
    measurementPlan,
  }: {
    executionPlanId: string;
    measurementPlan: ExecutionMeasurementPlan;
  }): Promise<ExperimentDesignResult> {
    const contextTags = measurementPlan.contextTags ?? [];

    const contextKey = contextKeyFor(contextTags);

    const active = (await experimentRepository.active()).find(
      (candidate) =>
        candidate.contextKey === contextKey ||
        contextsConflict(candidate.contextTags, contextTags),
    );

    if (active) {
      return {
        experiment: null,
        strategyDecision: await strategyBrain.recommend(contextTags),
        blockedByExperimentId: active.id,
        reason:
          "KAI did not start a duplicate or conflicting test because one experiment is already active for this context.",
      };
    }

    const choice = chooseVariable(measurementPlan);

    const strategyDecision = await strategyBrain.recommend(
      contextTags,
      choice.variable,
    );

    const metric =
      measurementPlan.metrics.find(
        (candidate) => candidate.name === choice.metricName,
      ) ?? measurementPlan.metrics[0];

    const experiment: ExecutionExperiment = {
      id: randomUUID(),
      executionPlanId,
      createdAt: new Date().toISOString(),
      contextKey,
      contextTags,
      variable: choice.variable,
      control: choice.control,
      variation: choice.variation,
      hypothesis: `If KAI changes only the ${choice.variable.replaceAll("_", " ")}, then ${choice.metricName} should reach or exceed ${metric.target} without changing the other parts of the plan.`,
      baseline: metric.baseline ?? 0,
      target: metric.target,
      metricName: choice.metricName,
      status: "planned",
    };

    return {
      experiment,
      strategyDecision,
      reason: `KAI created one controlled ${choice.variable.replaceAll("_", " ")} test and kept every other meaningful variable unchanged. ${strategyDecision.explanation}`,
    };
  }

  async complete({
    experiment,
    outcome,
    score,
    completedAt,
  }: {
    experiment: ExecutionExperiment;
    outcome: LearningResult;
    score: number;
    completedAt: string;
  }): Promise<ExecutionExperiment> {
    const verdict: ExperimentVerdict =
      outcome === "success"
        ? "keep"
        : outcome === "partial"
          ? "revise"
          : "stop";

    const resultExplanation =
      verdict === "keep"
        ? `Keep the ${experiment.variable.replaceAll("_", " ")} variation. It met the experiment's success standard.`
        : verdict === "revise"
          ? `Revise the ${experiment.variable.replaceAll("_", " ")} variation. It produced mixed evidence and should not become the default yet.`
          : `Stop the ${experiment.variable.replaceAll("_", " ")} variation. It failed the experiment's success standard.`;

    const completed: ExecutionExperiment = {
      ...experiment,
      status: "completed",
      verdict,
      outcome,
      score,
      completedAt,
      resultExplanation,
    };

    await experimentRepository.save(completed);

    await strategyBrain.recordResult(completed);

    return completed;
  }
}

export const experimentEngine = new ExperimentEngine();
