import { randomUUID } from "crypto";

import type {
  ExecutivePriority,
  ExecutiveReview,
} from "./ExecutiveBrain";

import type {
  OrganizationSnapshot,
} from "./OrganizationMemory";

import type {
  WatchtowerStatus,
} from "./Watchtower";

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

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

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

function chooseHighestPriority(
  priorities: ExecutivePriority[],
): ExecutivePriority | null {
  return [...priorities]
    .sort(
      (
        first,
        second,
      ) =>
        second.urgency -
        first.urgency,
    )[0] ?? null;
}

function calculateConfidence(
  executiveReview: ExecutiveReview,
  organization: OrganizationSnapshot | null,
  selectedPriority: ExecutivePriority | null,
): number {
  const values = [
    executiveReview.confidence,
    selectedPriority?.urgency,
    ...(
      organization?.departmentStates.map(
        (state) =>
          state.confidence,
      ) ?? []
    ),
  ].filter(
    (
      value,
    ): value is number =>
      typeof value === "number" &&
      Number.isFinite(value),
  );

  if (
    values.length === 0
  ) {
    return 0;
  }

  const average =
    values.reduce(
      (
        total,
        value,
      ) =>
        total + value,
      0,
    ) /
    values.length;

  const uncertaintyPenalty =
    organization
      ? Math.min(
          15,
          organization.departmentStates.reduce(
            (
              total,
              state,
            ) =>
              total +
              state.missingInformation.length,
            0,
          ) * 2,
        )
      : 5;

  return clampScore(
    average -
    uncertaintyPenalty,
  );
}

function determineLevel({
  watchtower,
  ownerShouldBeInterrupted,
  confidence,
  urgency,
}: {
  watchtower: WatchtowerStatus;
  ownerShouldBeInterrupted: boolean;
  confidence: number;
  urgency: number;
}): JudgmentLevel {
  if (
    watchtower.criticalEvents > 0 ||
    urgency >= 95
  ) {
    return "critical";
  }

  if (
    ownerShouldBeInterrupted ||
    urgency >= 80 ||
    confidence >= 85
  ) {
    return "high";
  }

  if (
    urgency >= 60 ||
    confidence >= 65
  ) {
    return "medium";
  }

  return "low";
}

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
    const topOwnerTask =
      chooseHighestPriority(
        executiveReview.ownerTasks,
      );

    const topKaiTask =
      chooseHighestPriority(
        executiveReview.kaiTasks,
      );

    const topPriority =
      chooseHighestPriority(
        executiveReview.priorities,
      );

    const ownerShouldBeInterrupted =
      watchtower.criticalEvents > 0 ||
      Boolean(
        topOwnerTask &&
        topOwnerTask.urgency >= 85,
      );

    const selectedPriority =
      ownerShouldBeInterrupted
        ? topOwnerTask ?? topPriority
        : topKaiTask ??
          topOwnerTask ??
          topPriority;

    const canExecuteAutomatically =
      !ownerShouldBeInterrupted &&
      Boolean(
        selectedPriority &&
        !selectedPriority.ownerRequired,
      );

    const recommendedAction =
      selectedPriority?.title ??
      executiveReview.biggestOpportunity;

    const confidence =
      calculateConfidence(
        executiveReview,
        organization,
        selectedPriority,
      );

    const urgency =
      selectedPriority?.urgency ??
      0;

    const level =
      determineLevel({
        watchtower,
        ownerShouldBeInterrupted,
        confidence,
        urgency,
      });

    const evidence =
      cleanValues([
        `Executive confidence: ${executiveReview.confidence}%.`,
        selectedPriority
          ? `Selected priority urgency: ${selectedPriority.urgency}%.`
          : "No executable priority was available.",
        organization
          ? `Organization health: ${organization.overallHealthScore}%.`
          : "No organization snapshot was available.",
        organization
          ? `Organization trend: ${organization.overallTrend}.`
          : "Organization trend is unknown.",
        organization
          ? `Organization health changed by ${organization.overallHealthChange} point(s).`
          : "No organization health change was available.",
        organization &&
        organization.blockedDepartments.length > 0
          ? `Blocked departments: ${organization.blockedDepartments.join(", ")}.`
          : "No department is currently blocked.",
        organization &&
        organization.departmentsNeedingAttention.length > 0
          ? `Departments needing attention: ${organization.departmentsNeedingAttention.join(", ")}.`
          : "No department is currently marked as needing attention.",
        `${watchtower.totalEvents} active Watchtower event(s).`,
        `${watchtower.highPriorityEvents} high-priority Watchtower event(s).`,
        `${watchtower.criticalEvents} critical Watchtower event(s).`,
      ]);

    const reasons =
      cleanValues([
        selectedPriority?.reason ??
        executiveReview.summary,
        `Highest opportunity: ${executiveReview.biggestOpportunity}`,
        `Highest risk: ${executiveReview.biggestRisk}`,
        ownerShouldBeInterrupted
          ? "The selected action requires owner judgment before completion."
          : canExecuteAutomatically
            ? "The selected action can continue without interrupting the owner."
            : "KAI can prepare the work, but no fully autonomous action is currently available.",
      ]);

    const whatCanWait =
      executiveReview.priorities
        .filter(
          (priority) =>
            priority.id !==
            selectedPriority?.id,
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
        selectedPriority
          ? `${selectedPriority.title} is the strongest available move right now.`
          : executiveReview.biggestOpportunity,

      evidence,

      reasons,

      whatCanWait,

      recommendedAction,

      ownerShouldBeInterrupted,

      canExecuteAutomatically,

      executionReason:
        canExecuteAutomatically
          ? `KAI can begin ${recommendedAction} immediately because the action does not require owner judgment.`
          : ownerShouldBeInterrupted
            ? `KAI should prepare ${recommendedAction}, then wait for the owner's decision before completing it.`
            : `KAI should prepare ${recommendedAction} while continuing to gather the information needed for execution.`,
    };
  }
}

export const judgmentEngine =
  new JudgmentEngine();