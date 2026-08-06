import type {
  DepartmentName,
  DepartmentStatus,
} from "../Department";

import type {
  OrganizationDepartmentState,
  OrganizationSnapshot,
} from "../OrganizationMemory";

export type DepartmentInsight = {
  department: DepartmentName;

  status: DepartmentStatus;

  healthScore: number;

  healthChange: number;

  trend:
    | "improving"
    | "stable"
    | "declining"
    | "unknown";

  confidence: number;

  priority: number;

  summary: string;

  biggestRisk: string;

  biggestOpportunity: string;

  requiresOwnerAttention: boolean;

  canOperateAutomatically: boolean;

  ownerDecisionCount: number;

  kaiWorkCount: number;

  missingInformationCount: number;
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

  highestPriorityDepartment:
    | DepartmentInsight
    | null;

  ownerAttention: DepartmentInsight[];

  autonomousWork: DepartmentInsight[];

  risks: string[];

  opportunities: string[];

  recommendedFocus: string;

  whatChanged: string[];

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

function statusWeight(
  status: DepartmentStatus,
): number {
  if (
    status === "blocked"
  ) {
    return 35;
  }

  if (
    status === "needs_attention"
  ) {
    return 25;
  }

  if (
    status === "watching"
  ) {
    return 12;
  }

  return 0;
}

function trendWeight(
  state: OrganizationDepartmentState,
): number {
  if (
    state.trend === "declining"
  ) {
    return Math.min(
      25,
      12 +
      Math.abs(
        state.healthChange,
      ) * 2,
    );
  }

  if (
    state.trend === "improving"
  ) {
    return Math.max(
      -15,
      -Math.abs(
        state.healthChange,
      ),
    );
  }

  return 0;
}

function toInsight(
  state: OrganizationDepartmentState,
): DepartmentInsight {
  const healthPenalty =
    100 -
    state.healthScore;

  const ownerAttentionWeight =
    state.requiresOwnerAttention
      ? 18
      : 0;

  const missingInformationWeight =
    Math.min(
      15,
      state.missingInformation.length *
      3,
    );

  const confidencePenalty =
    Math.max(
      0,
      80 -
      state.confidence,
    ) * 0.2;

  return {
    department:
      state.department,

    status:
      state.status,

    healthScore:
      state.healthScore,

    healthChange:
      state.healthChange,

    trend:
      state.trend,

    confidence:
      state.confidence,

    priority:
      clampScore(
        healthPenalty * 0.4 +
        statusWeight(
          state.status,
        ) +
        trendWeight(
          state,
        ) +
        ownerAttentionWeight +
        missingInformationWeight +
        confidencePenalty,
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

    ownerDecisionCount:
      state.ownerDecisionCount,

    kaiWorkCount:
      state.kaiWorkCount,

    missingInformationCount:
      state.missingInformation.length,
  };
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
  highestPriority:
    | DepartmentInsight
    | null,
): string {
  const parts = [
    `Overall organization health is ${snapshot.overallHealthScore}% and the current trend is ${snapshot.overallTrend}.`,
  ];

  if (
    snapshot.previousOverallHealthScore !==
    null
  ) {
    parts.push(
      `Health changed by ${snapshot.overallHealthChange} point(s) since the previous snapshot.`,
    );
  }

  if (
    strongest
  ) {
    parts.push(
      `${strongest.department} is currently strongest at ${strongest.healthScore}%.`,
    );
  }

  if (
    weakest
  ) {
    parts.push(
      `${weakest.department} is currently weakest at ${weakest.healthScore}%.`,
    );
  }

  if (
    highestPriority
  ) {
    parts.push(
      `${highestPriority.department} has the highest executive priority at ${highestPriority.priority}%.`,
    );
  }

  return parts.join(
    " ",
  );
}

function buildRecommendedFocus(
  snapshot: OrganizationSnapshot,
  highestPriority:
    | DepartmentInsight
    | null,
): string {
  if (
    highestPriority
  ) {
    if (
      highestPriority.requiresOwnerAttention
    ) {
      return `Review ${highestPriority.department} first. Owner judgment is required and its current priority is ${highestPriority.priority}%.`;
    }

    if (
      highestPriority.canOperateAutomatically
    ) {
      return `Let KAI continue working inside ${highestPriority.department}. It has the strongest autonomous priority at ${highestPriority.priority}%.`;
    }

    return `Focus on ${highestPriority.department}. It has the highest current operational priority at ${highestPriority.priority}%.`;
  }

  if (
    snapshot.biggestOpportunity.trim()
  ) {
    return snapshot.biggestOpportunity;
  }

  return "Continue monitoring the organization until a stronger priority appears.";
}

function buildWhatChanged(
  snapshot: OrganizationSnapshot,
): string[] {
  const changes = [
    snapshot.previousOverallHealthScore !==
    null
      ? `Overall health changed from ${snapshot.previousOverallHealthScore}% to ${snapshot.overallHealthScore}%.`
      : `The first organization health score was recorded at ${snapshot.overallHealthScore}%.`,
  ];

  for (
    const state of
    snapshot.departmentStates
  ) {
    if (
      state.previousHealthScore ===
      null
    ) {
      changes.push(
        `${state.department} recorded its first health score at ${state.healthScore}%.`,
      );

      continue;
    }

    if (
      state.healthChange !== 0
    ) {
      changes.push(
        `${state.department} changed by ${state.healthChange} point(s) to ${state.healthScore}%.`,
      );
    }
  }

  return uniqueValues(
    changes,
  );
}

function calculateConfidence(
  insights: DepartmentInsight[],
): number {
  if (
    insights.length === 0
  ) {
    return 0;
  }

  const averageConfidence =
    insights.reduce(
      (
        total,
        insight,
      ) =>
        total +
        insight.confidence,
      0,
    ) /
    insights.length;

  const missingInformationCount =
    insights.reduce(
      (
        total,
        insight,
      ) =>
        total +
        insight
          .missingInformationCount,
      0,
    );

  return clampScore(
    averageConfidence -
    Math.min(
      20,
      missingInformationCount *
      2,
    ),
  );
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

        highestPriorityDepartment:
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

        whatChanged:
          [],

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
      [...insights]
        .filter(
          (insight) =>
            insight.trend ===
            "improving",
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.healthChange -
            first.healthChange,
        )[0] ?? null;

    const fastestDecliningDepartment =
      [...insights]
        .filter(
          (insight) =>
            insight.trend ===
            "declining",
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.healthChange -
            second.healthChange,
        )[0] ?? null;

    const highestPriorityDepartment =
      highestBy(
        insights,
        (insight) =>
          insight.priority,
      );

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
          .filter(
            (state) =>
              state.biggestRisk !==
              "No major risk detected.",
          )
          .map(
            (state) =>
              `${state.department}: ${state.biggestRisk}`,
          ),
      );

    const opportunities =
      uniqueValues(
        snapshot.departmentStates
          .filter(
            (state) =>
              state.biggestOpportunity !==
              "No major opportunity detected.",
          )
          .map(
            (state) =>
              `${state.department}: ${state.biggestOpportunity}`,
          ),
      );

    return {
      generatedAt:
        new Date().toISOString(),

      executiveSummary:
        buildExecutiveSummary(
          snapshot,
          strongestDepartment,
          weakestDepartment,
          highestPriorityDepartment,
        ),

      strongestDepartment,

      weakestDepartment,

      fastestImprovingDepartment,

      fastestDecliningDepartment,

      highestPriorityDepartment,

      ownerAttention,

      autonomousWork,

      risks,

      opportunities,

      recommendedFocus:
        buildRecommendedFocus(
          snapshot,
          highestPriorityDepartment,
        ),

      whatChanged:
        buildWhatChanged(
          snapshot,
        ),

      confidence:
        calculateConfidence(
          insights,
        ),
    };
  }
}

export const organizationInsights =
  new OrganizationInsights();