import type {
  DepartmentName,
} from "../Department";

import type {
  OrganizationDepartmentState,
  OrganizationSnapshot,
} from "../OrganizationMemory";

export type DepartmentInsight = {
  department: DepartmentName;

  healthScore: number;

  trend:
    | "improving"
    | "stable"
    | "declining"
    | "unknown";

  priority: number;

  summary: string;

  biggestRisk: string;

  biggestOpportunity: string;

  requiresOwnerAttention: boolean;

  canOperateAutomatically: boolean;
};

export type OrganizationInsightsResult = {
  generatedAt: string;

  executiveSummary: string;

  strongestDepartment:
    | DepartmentInsight
    | null;

  weakestDepartment:
    | DepartmentInsight
    | null;

  fastestImprovingDepartment:
    | DepartmentInsight
    | null;

  fastestDecliningDepartment:
    | DepartmentInsight
    | null;

  ownerAttention: DepartmentInsight[];

  autonomousWork: DepartmentInsight[];

  risks: string[];

  opportunities: string[];

  recommendedFocus: string;

  confidence: number;
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

function toInsight(
  state: OrganizationDepartmentState,
): DepartmentInsight {
  const attentionBonus =
    state.requiresOwnerAttention
      ? 15
      : 0;

  const declineBonus =
    state.trend === "declining"
      ? 20
      : 0;

  const blockedBonus =
    state.status === "blocked"
      ? 30
      : state.status ===
          "needs_attention"
        ? 20
        : state.status ===
            "watching"
          ? 10
          : 0;

  const healthPenalty =
    100 -
    state.healthScore;

  return {
    department:
      state.department,

    healthScore:
      state.healthScore,

    trend:
      state.trend,

    priority:
      clampScore(
        healthPenalty *
          0.45 +
        blockedBonus +
        declineBonus +
        attentionBonus,
      ),

    summary:
      state.summary,

    biggestRisk:
      state.biggestRisk,

    biggestOpportunity:
      state.biggestOpportunity,

    requiresOwnerAttention:
      state.requiresOwnerAttention,

    canOperateAutomatically:
      state.canOperateAutomatically,
  };
}

function uniqueValues(
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

function highestBy(
  insights: DepartmentInsight[],
  selector: (
    insight: DepartmentInsight,
  ) => number,
): DepartmentInsight | null {
  if (
    insights.length === 0
  ) {
    return null;
  }

  return [...insights]
    .sort(
      (
        first,
        second,
      ) =>
        selector(second) -
        selector(first),
    )[0];
}

function lowestBy(
  insights: DepartmentInsight[],
  selector: (
    insight: DepartmentInsight,
  ) => number,
): DepartmentInsight | null {
  if (
    insights.length === 0
  ) {
    return null;
  }

  return [...insights]
    .sort(
      (
        first,
        second,
      ) =>
        selector(first) -
        selector(second),
    )[0];
}

function buildExecutiveSummary(
  snapshot: OrganizationSnapshot,
  strongest:
    | DepartmentInsight
    | null,
  weakest:
    | DepartmentInsight
    | null,
): string {
  const parts: string[] = [
    `Overall organization health is ${snapshot.overallHealthScore} with a ${snapshot.overallTrend} trend.`,
  ];

  if (
    strongest
  ) {
    parts.push(
      `${strongest.department} is currently the healthiest department at ${strongest.healthScore}.`,
    );
  }

  if (
    weakest
  ) {
    parts.push(
      `${weakest.department} needs the most attention at ${weakest.healthScore}.`,
    );
  }

  return parts.join(
    " ",
  );
}

function buildRecommendedFocus(
  snapshot: OrganizationSnapshot,
  insights: DepartmentInsight[],
): string {
  const highestPriority =
    highestBy(
      insights,
      (insight) =>
        insight.priority,
    );

  if (
    highestPriority
  ) {
    if (
      highestPriority.requiresOwnerAttention
    ) {
      return `Review ${highestPriority.department} first because owner attention is required.`;
    }

    if (
      highestPriority.canOperateAutomatically
    ) {
      return `Let KAI continue working inside ${highestPriority.department} because it has the strongest autonomous opportunity.`;
    }

    return `Focus on ${highestPriority.department} because it has the highest current operational priority.`;
  }

  if (
    snapshot.biggestOpportunity
  ) {
    return snapshot.biggestOpportunity;
  }

  return "Continue monitoring the organization until a stronger priority appears.";
}

export class OrganizationInsights {
  analyze(
    snapshot:
      | OrganizationSnapshot
      | null,
  ): OrganizationInsightsResult {
    if (
      !snapshot
    ) {
      return {
        generatedAt:
          new Date().toISOString(),

        executiveSummary:
          "No organization snapshot is available yet.",

        strongestDepartment:
          null,

        weakestDepartment:
          null,

        fastestImprovingDepartment:
          null,

        fastestDecliningDepartment:
          null,

        ownerAttention:
          [],

        autonomousWork:
          [],

        risks:
          [],

        opportunities:
          [],

        recommendedFocus:
          "Record the first organization snapshot.",

        confidence:
          0,
      };
    }

    const insights =
      snapshot.departmentStates.map(
        toInsight,
      );

    const strongestDepartment =
      highestBy(
        insights,
        (insight) =>
          insight.healthScore,
      );

    const weakestDepartment =
      lowestBy(
        insights,
        (insight) =>
          insight.healthScore,
      );

    const fastestImprovingDepartment =
      snapshot.departmentStates
        .filter(
          (state) =>
            state.trend ===
            "improving",
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.healthChange -
            first.healthChange,
        )
        .map(
          toInsight,
        )[0] ??
      null;

    const fastestDecliningDepartment =
      snapshot.departmentStates
        .filter(
          (state) =>
            state.trend ===
            "declining",
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.healthChange -
            second.healthChange,
        )
        .map(
          toInsight,
        )[0] ??
      null;

    const ownerAttention =
      insights
        .filter(
          (insight) =>
            insight.requiresOwnerAttention,
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.priority -
            first.priority,
        );

    const autonomousWork =
      insights
        .filter(
          (insight) =>
            insight.canOperateAutomatically,
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.priority -
            first.priority,
        );

    const risks =
      uniqueValues(
        snapshot.departmentStates
          .map(
            (state) =>
              `${state.department}: ${state.biggestRisk}`,
          ),
      );

    const opportunities =
      uniqueValues(
        snapshot.departmentStates
          .map(
            (state) =>
              `${state.department}: ${state.biggestOpportunity}`,
          ),
      );

    const confidence =
      insights.length > 0
        ? clampScore(
            insights.reduce(
              (
                total,
                insight,
              ) =>
                total +
                snapshot.departmentStates.find(
                  (state) =>
                    state.department ===
                    insight.department,
                )!.confidence,
              0,
            ) /
              insights.length,
          )
        : 0;

    return {
      generatedAt:
        new Date().toISOString(),

      executiveSummary:
        buildExecutiveSummary(
          snapshot,
          strongestDepartment,
          weakestDepartment,
        ),

      strongestDepartment,

      weakestDepartment,

      fastestImprovingDepartment,

      fastestDecliningDepartment,

      ownerAttention,

      autonomousWork,

      risks,

      opportunities,

      recommendedFocus:
        buildRecommendedFocus(
          snapshot,
          insights,
        ),

      confidence,
    };
  }
}

export const organizationInsights =
  new OrganizationInsights();