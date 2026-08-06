import {
  watchtower,
} from "../Watchtower";

import {
  judgmentEngine,
  type Judgment,
} from "../JudgmentEngine";

import {
  executionEngine,
  type ExecutionPlan,
} from "../ExecutionEngine";

import type {
  ExecutiveReview,
} from "../ExecutiveBrain";

import type {
  OrganizationSnapshot,
} from "../OrganizationMemory";

export type OvernightExecutionInput = {
  executiveReview: ExecutiveReview;
  organizationSnapshot: OrganizationSnapshot;
};

export type OvernightExecutionResult = {
  judgment: Judgment;
  executionPlan: ExecutionPlan;
};

export class OvernightExecution {
  run(
    input: OvernightExecutionInput,
  ): OvernightExecutionResult {
    const watchtowerStatus =
      watchtower.summarize();

    const judgment =
      judgmentEngine.evaluate({
        executiveReview:
          input.executiveReview,

        organization:
          input.organizationSnapshot,

        watchtower:
          watchtowerStatus,
      });

    const executionPlan =
      executionEngine.createPlan(
        judgment,
      );

    return {
      judgment,
      executionPlan,
    };
  }
}

export const overnightExecution =
  new OvernightExecution();