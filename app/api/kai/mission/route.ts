import {
  NextResponse,
} from "next/server";

import {
  createKaiDailyMission,
} from "../../../lib/kaiDailyMission";

import type {
  BusinessGoal,
  KaiDecisionInput,
} from "../../../lib/kaiDecisionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized || undefined;
}

function normalizeStringArray(
  value: unknown,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items =
    Array.from(
      new Set(
        value
          .filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    );

  return items.length > 0
    ? items
    : undefined;
}

function normalizeNumber(
  value: unknown,
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      value,
    );
  }

  if (
    typeof value === "string"
  ) {
    const cleaned =
      value
        .replace(
          /[$,%\s]/g,
          "",
        )
        .trim();

    if (!cleaned) {
      return undefined;
    }

    const parsed =
      Number(cleaned);

    if (
      Number.isFinite(parsed)
    ) {
      return Math.max(
        0,
        parsed,
      );
    }
  }

  return undefined;
}

function normalizeCount(
  value: unknown,
): number | undefined {
  const normalized =
    normalizeNumber(value);

  if (
    normalized === undefined
  ) {
    return undefined;
  }

  return Math.floor(
    normalized,
  );
}

function normalizeBoolean(
  value: unknown,
): boolean | undefined {
  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    [
      "true",
      "yes",
      "1",
      "on",
      "enabled",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "0",
      "off",
      "disabled",
    ].includes(normalized)
  ) {
    return false;
  }

  return undefined;
}

function normalizeBusinessGoal(
  value: unknown,
): BusinessGoal | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  const goalMap:
    Record<
      string,
      BusinessGoal
    > = {
      revenue: "Revenue",
      income: "Revenue",
      money: "Revenue",

      sales: "Sales",
      sale: "Sales",
      conversion: "Sales",

      audience: "Audience",
      growth: "Audience",
      followers: "Audience",
      reach: "Audience",

      content: "Content",
      video: "Content",
      publishing: "Content",

      product: "Product",
      offer: "Product",

      workload: "Workload",
      automation: "Workload",
      time: "Workload",

      learning: "Learning",
      intelligence: "Learning",
    };

  return goalMap[normalized];
}

function buildDecisionInput(
  body: Record<
    string,
    unknown
  >,
): KaiDecisionInput {
  return {
    businessName:
      normalizeString(
        body.businessName,
      ),

    ownerName:
      normalizeString(
        body.ownerName,
      ),

    primaryGoal:
      normalizeBusinessGoal(
        body.primaryGoal,
      ),

    currentGoals:
      normalizeStringArray(
        body.currentGoals,
      ),

    products:
      normalizeStringArray(
        body.products,
      ),

    offers:
      normalizeStringArray(
        body.offers,
      ),

    targetAudience:
      normalizeStringArray(
        body.targetAudience,
      ),

    ownerPreferences:
      normalizeStringArray(
        body.ownerPreferences,
      ),

    connectedPlatforms:
      normalizeStringArray(
        body.connectedPlatforms,
      ),

    completedWork:
      normalizeStringArray(
        body.completedWork,
      ),

    previousDecisions:
      normalizeStringArray(
        body.previousDecisions,
      ),

    pendingApprovals:
      normalizeCount(
        body.pendingApprovals,
      ),

    videosReady:
      normalizeCount(
        body.videosReady,
      ),

    contentReady:
      normalizeCount(
        body.contentReady,
      ),

    publishingReady:
      normalizeCount(
        body.publishingReady,
      ),

    recentViews:
      normalizeCount(
        body.recentViews,
      ),

    recentClicks:
      normalizeCount(
        body.recentClicks,
      ),

    recentSales:
      normalizeCount(
        body.recentSales,
      ),

    recentRevenue:
      normalizeNumber(
        body.recentRevenue,
      ),

    revenueNeeded:
      normalizeBoolean(
        body.revenueNeeded,
      ),

    audienceGrowthNeeded:
      normalizeBoolean(
        body.audienceGrowthNeeded,
      ),

    productNeedsImprovement:
      normalizeBoolean(
        body.productNeedsImprovement,
      ),

    ownerWorkloadHigh:
      normalizeBoolean(
        body.ownerWorkloadHigh,
      ),
  };
}

function createResponseHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma:
      "no-cache",
    Expires:
      "0",
  };
}

async function generateMission(
  input: KaiDecisionInput,
) {
  const result =
    await createKaiDailyMission(
      input,
    );

  return NextResponse.json(
    {
      success: true,

      /*
       * The complete mission is returned here,
       * including the generated contentPackage.
       */
      mission:
        result.mission,

      decision: {
        recommendation:
          result.decision
            .recommendation,

        reason:
          result.decision
            .reason,

        confidence:
          result.decision
            .confidence,

        expectedOutcome:
          result.decision
            .expectedOutcome,

        whatMattersMost:
          result.decision
            .whatMattersMost,

        changeToday:
          result.decision
            .changeToday,

        prepareNext:
          result.decision
            .prepareNext,

        morningQuestion:
          result.decision
            .morningQuestion,

        topOpportunity:
          result.decision
            .topOpportunity,
      },

      missionSummary:
        result.missionSummary,

      memorySummary:
        result.memorySummary,

      generatedAt:
        result.generatedAt,
    },
    {
      status: 200,
      headers:
        createResponseHeaders(),
    },
  );
}

function createErrorResponse(
  label: string,
  error: unknown,
) {
  console.error(
    label,
    error,
  );

  return NextResponse.json(
    {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "KAI could not prepare today's mission.",
    },
    {
      status: 500,
      headers:
        createResponseHeaders(),
    },
  );
}

export async function GET() {
  try {
    return await generateMission(
      {},
    );
  } catch (error) {
    return createErrorResponse(
      "KAI mission GET error:",
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body: unknown =
      await request
        .json()
        .catch(() => ({}));

    const safeBody:
      Record<
        string,
        unknown
      > =
      body &&
      typeof body === "object" &&
      !Array.isArray(body)
        ? body as Record<
            string,
            unknown
          >
        : {};

    const input =
      buildDecisionInput(
        safeBody,
      );

    return await generateMission(
      input,
    );
  } catch (error) {
    return createErrorResponse(
      "KAI mission POST error:",
      error,
    );
  }
}