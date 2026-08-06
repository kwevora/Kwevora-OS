import { randomUUID } from "crypto";

export type DepartmentName =
  | "Executive"
  | "Marketing"
  | "Sales"
  | "Finance"
  | "Operations"
  | "Customer Success"
  | "Product"
  | "Research"
  | "Human Resources"
  | "Legal and Compliance";

export type DepartmentStatus =
  | "healthy"
  | "watching"
  | "needs_attention"
  | "blocked";

export type DepartmentTaskOwner =
  | "KAI"
  | "Owner"
  | "Shared";

export type DepartmentPriority = {
  id: string;
  title: string;
  reason: string;
  urgency: number;
  impact: number;
  confidence: number;
  owner: DepartmentTaskOwner;
  canContinueAutomatically: boolean;
  nextAction: string;
};

export type DepartmentSignal = {
  id: string;
  title: string;
  observation: string;
  meaning: string;
  source: string;
  confidence: number;
  detectedAt: string;
};

export type DepartmentReport = {
  id: string;
  department: DepartmentName;
  status: DepartmentStatus;

  healthScore: number;
  confidence: number;

  summary: string;
  biggestRisk: string;
  biggestOpportunity: string;

  signals: DepartmentSignal[];
  priorities: DepartmentPriority[];

  ownerDecisions: DepartmentPriority[];
  kaiWork: DepartmentPriority[];

  whatChanged: string[];
  completedWork: string[];
  lessonsLearned: string[];
  missingInformation: string[];

  canOperateAutomatically: boolean;
  requiresOwnerAttention: boolean;

  nextReviewAt: string;
  createdAt: string;
};

export type DepartmentReviewInput = {
  summary: string;

  status?: DepartmentStatus;
  healthScore?: number;
  confidence?: number;

  biggestRisk?: string;
  biggestOpportunity?: string;

  signals?: DepartmentSignal[];
  priorities?: DepartmentPriority[];

  whatChanged?: string[];
  completedWork?: string[];
  lessonsLearned?: string[];
  missingInformation?: string[];

  canOperateAutomatically?: boolean;
  nextReviewAt?: string;
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
  values: string[] | undefined,
): string[] {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function sortPriorities(
  priorities: DepartmentPriority[],
): DepartmentPriority[] {
  return [...priorities].sort(
    (a, b) => {
      if (b.urgency !== a.urgency) {
        return b.urgency - a.urgency;
      }

      if (b.impact !== a.impact) {
        return b.impact - a.impact;
      }

      return b.confidence - a.confidence;
    },
  );
}

function calculateStatus(
  healthScore: number,
  priorities: DepartmentPriority[],
): DepartmentStatus {
  const blocked =
    priorities.some(
      (priority) =>
        priority.urgency >= 95 &&
        !priority.canContinueAutomatically,
    );

  if (blocked) {
    return "blocked";
  }

  if (healthScore < 50) {
    return "needs_attention";
  }

  if (healthScore < 75) {
    return "watching";
  }

  return "healthy";
}

export abstract class Department {
  abstract readonly name: DepartmentName;

  protected createReport(
    input: DepartmentReviewInput,
  ): DepartmentReport {
    const createdAt =
      new Date().toISOString();

    const priorities =
      sortPriorities(
        input.priorities ?? [],
      );

    const healthScore =
      clampScore(
        input.healthScore ?? 75,
      );

    const confidence =
      clampScore(
        input.confidence ?? 70,
      );

    const ownerDecisions =
      priorities.filter(
        (priority) =>
          priority.owner === "Owner" ||
          priority.owner === "Shared",
      );

    const kaiWork =
      priorities.filter(
        (priority) =>
          priority.owner === "KAI" ||
          priority.owner === "Shared",
      );

    const requiresOwnerAttention =
      ownerDecisions.length > 0;

    const canOperateAutomatically =
      input.canOperateAutomatically ??
      kaiWork.some(
        (priority) =>
          priority.canContinueAutomatically,
      );

    return {
      id:
        randomUUID(),

      department:
        this.name,

      status:
        input.status ??
        calculateStatus(
          healthScore,
          priorities,
        ),

      healthScore,
      confidence,

      summary:
        input.summary.trim(),

      biggestRisk:
        input.biggestRisk?.trim() ||
        "No major risk detected.",

      biggestOpportunity:
        input.biggestOpportunity?.trim() ||
        "No major opportunity detected.",

      signals:
        input.signals ?? [],

      priorities,

      ownerDecisions,
      kaiWork,

      whatChanged:
        cleanValues(
          input.whatChanged,
        ),

      completedWork:
        cleanValues(
          input.completedWork,
        ),

      lessonsLearned:
        cleanValues(
          input.lessonsLearned,
        ),

      missingInformation:
        cleanValues(
          input.missingInformation,
        ),

      canOperateAutomatically,
      requiresOwnerAttention,

      nextReviewAt:
        input.nextReviewAt ??
        new Date(
          Date.now() +
          24 * 60 * 60 * 1000,
        ).toISOString(),

      createdAt,
    };
  }

  abstract review():
    | DepartmentReport
    | Promise<DepartmentReport>;
}