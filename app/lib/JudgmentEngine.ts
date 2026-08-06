import { randomUUID } from "crypto";

import type { ExecutiveReview } from "./ExecutiveBrain";
import type { OrganizationSnapshot } from "./OrganizationMemory";
import type { WatchtowerStatus } from "./Watchtower";

export type JudgmentLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type Judgment = {
  id: string;

  createdAt: string;

  confidence: number;

  level: JudgmentLevel;

  conclusion: string;

  evidence: string[];

  reasons: string[];

  whatCanWait: string[];

  recommendedAction: string;

  ownerShouldBeInterrupted: boolean;

  canExecuteAutomatically: boolean;

  executionReason: string;
};

export class JudgmentEngine {
  evaluate({
    executiveReview,
    organization,
    watchtower,
  }: {
    executiveReview: ExecutiveReview;
    organization: OrganizationSnapshot | null;
    watchtower: WatchtowerStatus;
  }): Judgment {
    const evidence: string[] = [];

    evidence.push(
      `Executive confidence: ${executiveReview.confidence}%`,
    );

    if (organization) {
      evidence.push(
        `Organization health: ${organization.overallHealthScore}%`,
      );

      evidence.push(
        `Organization trend: ${organization.overallTrend}`,
      );

      evidence.push(
        `Organization health changed by ${organization.overallHealthChange} point(s).`,
      );

      if (
        organization.blockedDepartments.length > 0
      ) {
        evidence.push(
          `Blocked departments: ${organization.blockedDepartments.join(", ")}.`,
        );
      }

      if (
        organization.departmentsNeedingAttention.length > 0
      ) {
        evidence.push(
          `Departments needing attention: ${organization.departmentsNeedingAttention.join(", ")}.`,
        );
      }
    }

    evidence.push(
      `${watchtower.totalEvents} active Watchtower event(s).`,
    );

    if (
      watchtower.criticalEvents > 0
    ) {
      evidence.push(
        `${watchtower.criticalEvents} critical Watchtower event(s) detected.`,
      );
    }

    if (
      watchtower.highPriorityEvents > 0
    ) {
      evidence.push(
        `${watchtower.highPriorityEvents} high-priority Watchtower event(s) detected.`,
      );
    }

    const firstOwnerTask =
      executiveReview.ownerTasks[0];

    const firstKaiTask =
      executiveReview.kaiTasks[0];

    const ownerShouldBeInterrupted =
      watchtower.criticalEvents > 0 ||
      Boolean(firstOwnerTask);

    const canExecuteAutomatically =
      !ownerShouldBeInterrupted &&
      Boolean(firstKaiTask);

    const recommendedAction =
      ownerShouldBeInterrupted
        ? firstOwnerTask?.title ??
          executiveReview.biggestOpportunity
        : firstKaiTask?.title ??
          executiveReview.biggestOpportunity;

    const confidenceValues = [
      executiveReview.confidence,
    ];

    if (organization) {
      confidenceValues.push(
        ...organization.departmentStates.map(
          (state) => state.confidence,
        ),
      );
    }

    const confidence =
      Math.round(
        confidenceValues.reduce(
          (total, value) =>
            total + value,
          0,
        ) /
          confidenceValues.length,
      );

    const level: JudgmentLevel =
      watchtower.criticalEvents > 0
        ? "critical"
        : ownerShouldBeInterrupted
          ? "high"
          : confidence >= 85
            ? "high"
            : confidence >= 65
              ? "medium"
              : "low";

    const whatCanWait =
      executiveReview.priorities
        .filter(
          (priority) =>
            priority.title !==
            recommendedAction,
        )
        .map(
          (priority) =>
            priority.title,
        );

    return {
      id:
        randomUUID(),

      createdAt:
        new Date().toISOString(),

      confidence,

      level,

      conclusion:
        executiveReview.biggestOpportunity,

      evidence,

      reasons: [
        executiveReview.summary,
        `Highest opportunity: ${executiveReview.biggestOpportunity}`,
        `Highest risk: ${executiveReview.biggestRisk}`,
      ],

      whatCanWait,

      recommendedAction,

      ownerShouldBeInterrupted,

      canExecuteAutomatically,

      executionReason:
        canExecuteAutomatically
          ? "KAI has identified executable work that does not currently require owner judgment."
          : ownerShouldBeInterrupted
            ? "KAI should prepare the work but wait for the owner's decision before completing the owner-dependent action."
            : "KAI does not currently have enough executable work to begin automatically.",
    };
  }
}

export const judgmentEngine =
  new JudgmentEngine();