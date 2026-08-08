import { randomUUID } from "crypto";

import type { Judgment } from "./JudgmentEngine";

import {
  learningBrain,
  type LearningResult,
  type LearningSummary,
} from "./LearningBrain";

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

  owner:
    | "KAI"
    | "Owner"
    | "Shared";

  status: ExecutionStatus;

  startedAt?: string;

  completedAt?: string;
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

function cleanValues(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function defaultLesson(
  outcome: LearningResult,
): string {
  if (outcome === "success") {
    return "The execution produced the intended result. Preserve the strongest parts of this approach when similar situations appear.";
  }

  if (outcome === "partial") {
    return "The execution produced mixed results. Keep what worked and adjust the weakest part before repeating the approach.";
  }

  return "The execution did not produce the intended result. Do not repeat the same approach without a meaningful change.";
}

function defaultRecommendation(
  outcome: LearningResult,
): string {
  if (outcome === "success") {
    return "Use this successful result as evidence when KAI evaluates similar future decisions.";
  }

  if (outcome === "partial") {
    return "Adjust the approach using the recorded observations before the next similar execution.";
  }

  return "Choose a different approach before attempting the same objective again.";
}

function completeStep(
  step: ExecutionStep,
  completedAt: string,
): ExecutionStep {
  return {
    ...step,

    status:
      "completed",

    startedAt:
      step.startedAt ??
      completedAt,

    completedAt,
  };
}

export class ExecutionEngine {
  createPlan(
    judgment: Judgment,
  ): ExecutionPlan {
    const now =
      new Date().toISOString();

    const autoExecuting =
      judgment.canExecuteAutomatically;

    const executeOwner =
      autoExecuting
        ? "KAI"
        : judgment.ownerShouldBeInterrupted
          ? "Shared"
          : "KAI";

    const steps: ExecutionStep[] = [
      {
        id:
          randomUUID(),

        title:
          "Validate Judgment",

        description:
          "Verify the recommendation before execution.",

        owner:
          "KAI",

        status:
          "completed",

        completedAt:
          now,
      },

      {
        id:
          randomUUID(),

        title:
          "Prepare Resources",

        description:
          "Gather everything needed before execution begins.",

        owner:
          "KAI",

        status:
          autoExecuting
            ? "working"
            : "preparing",

        startedAt:
          now,
      },

      {
        id:
          randomUUID(),

        title:
          "Execute",

        description:
          judgment.recommendedAction,

        owner:
          executeOwner,

        status:
          autoExecuting
            ? "planned"
            : judgment.ownerShouldBeInterrupted
              ? "waiting"
              : "planned",
      },

      {
        id:
          randomUUID(),

        title:
          "Measure Results",

        description:
          "Measure the business outcome after execution.",

        owner:
          "KAI",

        status:
          "planned",
      },

      {
        id:
          randomUUID(),

        title:
          "Learn",

        description:
          "Record the outcome and improve future judgment.",

        owner:
          "KAI",

        status:
          "planned",
      },
    ];

    return {
      id:
        randomUUID(),

      createdAt:
        now,

      objective:
        judgment.conclusion,

      status:
        autoExecuting
          ? "working"
          : "waiting",

      progress:
        autoExecuting
          ? 25
          : 20,

      confidence:
        judgment.confidence,

      currentStep:
        autoExecuting
          ? "Prepare Resources"
          : "Waiting for Owner",

      nextAction:
        judgment.recommendedAction,

      ownerAttentionRequired:
        judgment.ownerShouldBeInterrupted,

      autoExecuting,

      reasoning:
        judgment.executionReason,

      steps,
    };
  }

  recordOutcome(
    plan: ExecutionPlan,
    input: ExecutionOutcomeInput,
  ): ExecutionLearningResult {
    const completedAt =
      input.completedAt ??
      new Date().toISOString();

    const observations =
      cleanValues(
        input.observations ?? [],
      );

    const lessons =
      cleanValues(
        input.lessons ?? [],
      );

    const recommendations =
      cleanValues(
        input.recommendations ?? [],
      );

    const finalLessons =
      lessons.length > 0
        ? lessons
        : [
            defaultLesson(
              input.outcome,
            ),
          ];

    const finalRecommendations =
      recommendations.length > 0
        ? recommendations
        : [
            defaultRecommendation(
              input.outcome,
            ),
          ];

    const learning =
      learningBrain.learn({
        id:
          `execution-${plan.id}`,

        title:
          plan.nextAction,

        objective:
          plan.objective,

        outcome:
          input.outcome,

        observations,

        lessons:
          finalLessons,

        recommendations:
          finalRecommendations,

        completedAt,
      });

    const updatedSteps =
      plan.steps.map(
        (step) => {
          if (
            step.title ===
              "Validate Judgment" ||
            step.title ===
              "Prepare Resources" ||
            step.title ===
              "Execute" ||
            step.title ===
              "Measure Results" ||
            step.title ===
              "Learn"
          ) {
            return completeStep(
              step,
              completedAt,
            );
          }

          return step;
        },
      );

    const updatedPlan: ExecutionPlan = {
      ...plan,

      status:
        input.outcome === "failure"
          ? "failed"
          : "completed",

      progress:
        100,

      confidence:
        learning.confidence,

      currentStep:
        "Learning Complete",

      nextAction:
        learning.nextImprovement,

      ownerAttentionRequired:
        false,

      autoExecuting:
        false,

      reasoning:
        [
          plan.reasoning,
          `Execution result: ${input.outcome}.`,
          `KAI learned from the completed work.`,
          `Confidence changed by ${learning.confidenceChange} point(s).`,
          `Next improvement: ${learning.nextImprovement}`,
        ].join(
          " ",
        ),

      steps:
        updatedSteps,
    };

    return {
      plan:
        updatedPlan,

      learning,

      outcome:
        input.outcome,

      observations,

      lessons:
        finalLessons,

      recommendations:
        finalRecommendations,

      completedAt,
    };
  }
}

export const executionEngine =
  new ExecutionEngine();