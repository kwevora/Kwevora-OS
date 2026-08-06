import { randomUUID } from "crypto";

import type { Judgment } from "./JudgmentEngine";

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
}

export const executionEngine =
  new ExecutionEngine();