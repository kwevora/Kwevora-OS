import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executionPlanRepository,
} from "@/app/lib/database/ExecutionPlanRepository";

import {
  outcomeEvaluationRepository,
} from "@/app/lib/database/OutcomeEvaluationRepository";

import {
  outcomeEngine,
  type OutcomeMetric,
} from "@/app/lib/OutcomeEngine";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type OutcomeRequestBody = {
  executionPlanId?: unknown;

  metrics?: unknown;

  observations?: unknown;
};

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanStringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item === "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(
      Boolean,
    );
}

function cleanMetric(
  value: unknown,
): OutcomeMetric | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const metric =
    value as Record<
      string,
      unknown
    >;

  const name =
    cleanString(
      metric.name,
    );

  const actual =
    metric.actual;

  if (
    !name ||
    typeof actual !== "number" ||
    !Number.isFinite(
      actual,
    )
  ) {
    return null;
  }

  const target =
    typeof metric.target === "number" &&
    Number.isFinite(
      metric.target,
    )
      ? metric.target
      : undefined;

  const previous =
    typeof metric.previous === "number" &&
    Number.isFinite(
      metric.previous,
    )
      ? metric.previous
      : undefined;

  const higherIsBetter =
    typeof metric.higherIsBetter ===
    "boolean"
      ? metric.higherIsBetter
      : undefined;

  return {
    name,

    actual,

    target,

    previous,

    higherIsBetter,
  };
}

function cleanMetrics(
  value: unknown,
): OutcomeMetric[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      cleanMetric,
    )
    .filter(
      (
        metric,
      ): metric is OutcomeMetric =>
        metric !== null,
    );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const executionPlanId =
      request.nextUrl.searchParams.get(
        "executionPlanId",
      );

    if (
      executionPlanId
    ) {
      const plan =
        executionPlanRepository.get(
          executionPlanId,
        );

      if (
        !plan
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Execution plan not found.",
          },
          {
            status:
              404,
          },
        );
      }

      const outcomes =
        outcomeEvaluationRepository
          .forExecutionPlan(
            executionPlanId,
          );

      return NextResponse.json({
        success:
          true,

        plan,

        outcomes,
      });
    }

    return NextResponse.json({
      success:
        true,

      latest:
        executionPlanRepository.latest(),

      active:
        executionPlanRepository.active(),

      latestOutcome:
        outcomeEvaluationRepository.latest(),

      recentOutcomes:
        outcomeEvaluationRepository.history(
          20,
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Outcome API load failed:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "KWEVORA could not load execution outcome data.",
      },
      {
        status:
          500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (
        await request.json()
      ) as OutcomeRequestBody;

    const executionPlanId =
      cleanString(
        body.executionPlanId,
      );

    if (
      !executionPlanId
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "An execution plan ID is required.",
        },
        {
          status:
            400,
        },
      );
    }

    const executionPlan =
      executionPlanRepository.get(
        executionPlanId,
      );

    if (
      !executionPlan
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Execution plan not found.",
        },
        {
          status:
            404,
        },
      );
    }

    const metrics =
      cleanMetrics(
        body.metrics,
      );

    const observations =
      cleanStringArray(
        body.observations,
      );

    if (
      metrics.length === 0 &&
      observations.length === 0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "KAI needs at least one measured result or observation before learning from this execution.",
        },
        {
          status:
            400,
        },
      );
    }

    const result =
      outcomeEngine.evaluate({
        executionPlan,

        metrics,

        observations,

        completedAt:
          new Date().toISOString(),
      });

    return NextResponse.json({
      success:
        true,

      evaluation:
        result.evaluation,

      storedEvaluation:
        result.storedEvaluation,

      message:
        "KAI measured the result, learned from it, and updated the execution plan.",
    });
  } catch (
    error
  ) {
    console.error(
      "Outcome evaluation failed:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "KWEVORA could not evaluate this outcome.",
      },
      {
        status:
          500,
      },
    );
  }
}