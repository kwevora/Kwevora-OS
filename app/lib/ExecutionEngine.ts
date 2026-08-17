import { randomUUID } from "crypto";

import type { Judgment } from "./JudgmentEngine";

import {
  learningBrain,
  type LearningResult,
  type LearningSummary,
} from "./LearningBrain";

import {
  adaptiveTargetEngine,
  type TargetCalibration,
} from "./AdaptiveTargetEngine";

import { experimentEngine, type ExecutionExperiment } from "./ExperimentEngine";

import type { StrategyDecision } from "./StrategyBrain";

export type ExecutionStatus =
  | "planned"
  | "preparing"
  | "working"
  | "waiting"
  | "blocked"
  | "completed"
  | "failed";

export type ExecutionStep = {
  id: string;

  title: string;

  description: string;

  owner: "KAI" | "Owner" | "Shared";

  status: ExecutionStatus;

  startedAt?: string;

  completedAt?: string;
};

export type MeasurementSource =
  | "youtube"
  | "publishing"
  | "store"
  | "owner"
  | "execution";

export type ExecutionMetricTarget = {
  name: string;
  target: number;
  baseline?: number;
  higherIsBetter: boolean;
  source: MeasurementSource;
  trend?: "improving" | "declining" | "stable" | "building";
  reason: string;
};

export type ExecutionMeasurementPlan = {
  createdAt: string;
  measureAfterHours: number;
  successDefinition: string;
  rationale: string;
  contextTags?: string[];
  calibration?: TargetCalibration;
  relevantOutcomeCount?: number;
  metrics: ExecutionMetricTarget[];
};

export type ExecutionPlan = {
  id: string;

  createdAt: string;

  objective: string;

  status: ExecutionStatus;

  progress: number;

  confidence: number;

  currentStep: string;

  nextAction: string;

  ownerAttentionRequired: boolean;

  autoExecuting: boolean;

  reasoning: string;

  measurementPlan?: ExecutionMeasurementPlan;

  experiment?: ExecutionExperiment;

  experimentReason?: string;

  blockedByExperimentId?: string;

  strategyDecision?: StrategyDecision;

  steps: ExecutionStep[];
};

export type ExecutionOutcomeInput = {
  outcome: LearningResult;

  observations?: string[];

  lessons?: string[];

  recommendations?: string[];

  completedAt?: string;
};

export type ExecutionLearningResult = {
  plan: ExecutionPlan;

  learning: LearningSummary;

  outcome: LearningResult;

  observations: string[];

  lessons: string[];

  recommendations: string[];

  completedAt: string;
};

function cleanValues(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function defaultLesson(outcome: LearningResult): string {
  if (outcome === "success") {
    return "The execution produced the intended result. Preserve the strongest parts of this approach when similar situations appear.";
  }

  if (outcome === "partial") {
    return "The execution produced mixed results. Keep what worked and adjust the weakest part before repeating the approach.";
  }

  return "The execution did not produce the intended result. Do not repeat the same approach without a meaningful change.";
}

function defaultRecommendation(outcome: LearningResult): string {
  if (outcome === "success") {
    return "Use this successful result as evidence when KAI evaluates similar future decisions.";
  }

  if (outcome === "partial") {
    return "Adjust the approach using the recorded observations before the next similar execution.";
  }

  return "Choose a different approach before attempting the same objective again.";
}

function completeStep(step: ExecutionStep, completedAt: string): ExecutionStep {
  return {
    ...step,

    status: "completed",

    startedAt: step.startedAt ?? completedAt,

    completedAt,
  };
}

async function buildMeasurementPlan(
  judgment: Judgment,
  createdAt: string,
): Promise<ExecutionMeasurementPlan> {
  const subject = [
    judgment.conclusion,
    judgment.recommendedAction,
    ...judgment.reasons,
  ]
    .join(" ")
    .toLowerCase();

  const metrics: ExecutionMetricTarget[] = [];

  if (/connect.*platform|platform.*connect/.test(subject)) {
    metrics.push({
      name: "Connected Platforms",
      target: 1,
      baseline: 0,
      higherIsBetter: true,
      source: "execution",
      reason:
        "One verified connection is the minimum result required for KAI to use a marketing platform.",
    });
  }

  if (/approv|review/.test(subject)) {
    metrics.push({
      name: "Approved Items",
      target: 1,
      baseline: 0,
      higherIsBetter: true,
      source: "execution",
      reason:
        "One approved item clears the decision blocking the next execution stage.",
    });
  }

  if (/publish|content|video|post|audience|marketing/.test(subject)) {
    metrics.push(
      {
        name: "Views",
        target: 100,
        baseline: 0,
        higherIsBetter: true,
        source: "youtube",
        reason:
          "One hundred views is KAI's initial calibration target—large enough to observe a real response while the business is still building performance history.",
      },
      {
        name: "Clicks",
        target: 1,
        baseline: 0,
        higherIsBetter: true,
        source: "owner",
        reason:
          "At least one click proves the content moved someone beyond passive viewing toward the intended destination.",
      },
    );
  }

  if (/income|revenue|sale|offer|product|store/.test(subject)) {
    metrics.push({
      name: "Sales",
      target: 1,
      baseline: 0,
      higherIsBetter: true,
      source: "store",
      reason:
        "One confirmed sale is the first reliable proof that the execution created income rather than attention alone.",
    });
  }

  const uniqueMetrics = Array.from(
    new Map(metrics.map((metric) => [metric.name, metric])).values(),
  );

  if (uniqueMetrics.length === 0) {
    uniqueMetrics.push({
      name: "Completed Actions",
      target: 1,
      baseline: 0,
      higherIsBetter: true,
      source: "execution",
      reason:
        "A completed, verified action is the minimum measurable proof that this non-numeric plan produced its intended result.",
    });
  }

  const measureAfterHours = uniqueMetrics.some(
    (metric) =>
      metric.source === "youtube" ||
      metric.source === "store" ||
      metric.source === "owner",
  )
    ? 24
    : 0;

  const adaptiveTargets = await adaptiveTargetEngine.adapt({
    subject,
    metrics: uniqueMetrics,
  });

  return {
    createdAt,
    measureAfterHours,
    successDefinition: adaptiveTargets.metrics
      .map((metric) => `${metric.name} reaches ${metric.target}`)
      .join(" and "),
    rationale: `KAI set these targets before execution so the result can be judged against a stated expectation instead of an isolated number. ${adaptiveTargets.explanation}`,
    contextTags: adaptiveTargets.contextTags,
    calibration: adaptiveTargets.calibration,
    relevantOutcomeCount: adaptiveTargets.relevantOutcomeCount,
    metrics: adaptiveTargets.metrics,
  };
}

export class ExecutionEngine {
  async createPlan(judgment: Judgment): Promise<ExecutionPlan> {
    const now = new Date().toISOString();

    const autoExecuting = judgment.canExecuteAutomatically;

    const planId = randomUUID();

    const measurementPlan = await buildMeasurementPlan(judgment, now);

    const experimentDesign = await experimentEngine.design({
      executionPlanId: planId,
      measurementPlan,
    });

    const executeOwner = autoExecuting
      ? "KAI"
      : judgment.ownerShouldBeInterrupted
        ? "Shared"
        : "KAI";

    const steps: ExecutionStep[] = [
      {
        id: randomUUID(),

        title: "Validate Judgment",

        description: "Verify the recommendation before execution.",

        owner: "KAI",

        status: "completed",

        completedAt: now,
      },

      {
        id: randomUUID(),

        title: "Prepare Resources",

        description: "Gather everything needed before execution begins.",

        owner: "KAI",

        status: autoExecuting ? "working" : "preparing",

        startedAt: now,
      },

      {
        id: randomUUID(),

        title: "Execute",

        description: judgment.recommendedAction,

        owner: executeOwner,

        status: autoExecuting
          ? "planned"
          : judgment.ownerShouldBeInterrupted
            ? "waiting"
            : "planned",
      },

      {
        id: randomUUID(),

        title: "Measure Results",

        description: "Measure the business outcome after execution.",

        owner: "KAI",

        status: "planned",
      },

      {
        id: randomUUID(),

        title: "Learn",

        description: "Record the outcome and improve future judgment.",

        owner: "KAI",

        status: "planned",
      },
    ];

    return {
      id: planId,

      createdAt: now,

      objective: judgment.conclusion,

      status: autoExecuting ? "working" : "waiting",

      progress: autoExecuting ? 25 : 20,

      confidence: judgment.confidence,

      currentStep: autoExecuting ? "Prepare Resources" : "Waiting for Owner",

      nextAction: judgment.recommendedAction,

      ownerAttentionRequired: judgment.ownerShouldBeInterrupted,

      autoExecuting,

      reasoning: judgment.executionReason,

      measurementPlan: measurementPlan,

      experiment: experimentDesign.experiment ?? undefined,

      experimentReason: experimentDesign.reason,

      blockedByExperimentId: experimentDesign.blockedByExperimentId,

      strategyDecision: experimentDesign.strategyDecision,

      steps,
    };
  }

  async recordOutcome(
    plan: ExecutionPlan,
    input: ExecutionOutcomeInput,
  ): Promise<ExecutionLearningResult> {
    const completedAt = input.completedAt ?? new Date().toISOString();

    const observations = cleanValues(input.observations ?? []);

    const lessons = cleanValues(input.lessons ?? []);

    const recommendations = cleanValues(input.recommendations ?? []);

    const finalLessons =
      lessons.length > 0 ? lessons : [defaultLesson(input.outcome)];

    const finalRecommendations =
      recommendations.length > 0
        ? recommendations
        : [defaultRecommendation(input.outcome)];

    const learning = await learningBrain.learn({
      id: `execution-${plan.id}`,

      title: plan.nextAction,

      objective: plan.objective,

      outcome: input.outcome,

      observations,

      lessons: finalLessons,

      recommendations: finalRecommendations,

      completedAt,
    });

    const updatedSteps = plan.steps.map((step) => {
      if (
        step.title === "Validate Judgment" ||
        step.title === "Prepare Resources" ||
        step.title === "Execute" ||
        step.title === "Measure Results" ||
        step.title === "Learn"
      ) {
        return completeStep(step, completedAt);
      }

      return step;
    });

    const updatedPlan: ExecutionPlan = {
      ...plan,

      status: input.outcome === "failure" ? "failed" : "completed",

      progress: 100,

      confidence: learning.confidence,

      currentStep: "Learning Complete",

      nextAction: learning.nextImprovement,

      ownerAttentionRequired: false,

      autoExecuting: false,

      reasoning: [
        plan.reasoning,
        `Execution result: ${input.outcome}.`,
        `KAI learned from the completed work.`,
        `Confidence changed by ${learning.confidenceChange} point(s).`,
        `Next improvement: ${learning.nextImprovement}`,
      ].join(" "),

      steps: updatedSteps,
    };

    return {
      plan: updatedPlan,

      learning,

      outcome: input.outcome,

      observations,

      lessons: finalLessons,

      recommendations: finalRecommendations,

      completedAt,
    };
  }
}

export const executionEngine = new ExecutionEngine();
