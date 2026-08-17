import { promises as fs } from "fs";
import path from "path";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  POST as runOutcomeFollowUp,
} from "@/app/api/kai/follow-up/route";

import {
  POST as processPublishingHandoff,
} from "@/app/api/kai/publishing-handoff/route";

import {
  POST as collectPerformanceLearning,
} from "@/app/api/kai/performance-learning/route";

import {
  overnightEngine,
} from "@/app/lib/OvernightEngine";

import type {
  DecisionRequest,
} from "@/app/lib/DecisionCore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OvernightMoneyHuntResult = {
  success: boolean;

  completedAt: string;

  pipelineStatus: string;

  readyToAct: boolean;

  bestOpportunity: string;

  result: unknown;
};

type AutomatedFollowUpResult = {
  success: boolean;
  learned: boolean;
  message: string;
  result?: unknown;
};

type AutomatedPublishingResult = {
  assessed: number;
  executed: number;
  blocked: number;
  results: unknown[];
};

type AutomatedPerformanceLearningResult = {
  success: boolean;
  collected: boolean;
  message: string;
  result?: unknown;
};

const kwevoraDataFolder =
  path.join(
    process.cwd(),
    ".kwevora",
  );

const overnightMoneyHuntFile =
  path.join(
    kwevoraDataFolder,
    "overnight-money-hunt.json",
  );

async function readLatestMoneyHunt():
Promise<OvernightMoneyHuntResult | null> {
  try {
    const contents =
      await fs.readFile(
        overnightMoneyHuntFile,
        "utf8",
      );

    const parsed =
      JSON.parse(contents);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    return parsed as
      OvernightMoneyHuntResult;
  } catch {
    return null;
  }
}

async function saveLatestMoneyHunt(
  result: OvernightMoneyHuntResult,
) {
  await fs.mkdir(
    kwevoraDataFolder,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    overnightMoneyHuntFile,
    JSON.stringify(
      result,
      null,
      2,
    ),
    "utf8",
  );
}

async function runMoneyHunt(
  request: Request,
): Promise<OvernightMoneyHuntResult> {
  const origin =
    new URL(
      request.url,
    ).origin;

  try {
    const response =
      await fetch(
        `${origin}/api/kai/opportunities/run`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            niche: "",

            audience: "",

            goal:
              "Find a strong existing digital product with current buyer demand that can legally be purchased or licensed and resold for profit.",

            notes: [
              "This is KWEVORA's overnight autonomous Money Hunt.",
              "Demand comes first.",
              "Search for existing quality digital products with explicit resale rights.",
              "Keep startup cost low.",
              "Prefer products with strong faceless short-form marketing potential.",
              "Do not prioritize affiliate marketing.",
              "Do not require creating a large original product from scratch.",
              "Remember previously rejected products and continue with fresh opportunities.",
              "Never lower KWEVORA's resale-license, quality, demand, pricing, or verification standards just to produce a winner.",
              "If this cycle does not find a verified product, preserve the search state so the next autonomous cycle can continue instead of starting over.",
            ].join(" "),
          }),

          cache: "no-store",
        },
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.success
    ) {
      const failedResult:
        OvernightMoneyHuntResult = {
          success: false,

          completedAt:
            new Date()
              .toISOString(),

          pipelineStatus:
            "money_hunt_failed",

          readyToAct: false,

          bestOpportunity: "",

          result: {
            message:
              data?.message ||
              "KAI could not complete the overnight Money Hunt.",
          },
        };

      await saveLatestMoneyHunt(
        failedResult,
      );

      return failedResult;
    }

    const readyToAct =
      data
        ?.recommendation
        ?.readyToAct ===
      true;

    const bestOpportunity =
      typeof data
        ?.recommendation
        ?.bestOpportunity ===
      "string"
        ? data
            .recommendation
            .bestOpportunity
            .trim()
        : "";

    const completed:
      OvernightMoneyHuntResult = {
        success: true,

        completedAt:
          new Date()
            .toISOString(),

        pipelineStatus:
          typeof data
            ?.pipelineStatus ===
          "string"
            ? data.pipelineStatus
            : readyToAct
              ? "verified_resellable_product_ready"
              : "continue_autonomous_search",

        readyToAct,

        bestOpportunity,

        result: data,
      };

    await saveLatestMoneyHunt(
      completed,
    );

    return completed;
  } catch (error) {
    const failedResult:
      OvernightMoneyHuntResult = {
        success: false,

        completedAt:
          new Date()
            .toISOString(),

        pipelineStatus:
          "money_hunt_failed",

        readyToAct: false,

        bestOpportunity: "",

        result: {
          message:
            error instanceof Error
              ? error.message
              : "KAI could not complete the overnight Money Hunt.",
        },
      };

    await saveLatestMoneyHunt(
      failedResult,
    );

    return failedResult;
  }
}

async function runAutomatedFollowUp(
  request: Request,
): Promise<AutomatedFollowUpResult> {
  try {
    const response =
      await runOutcomeFollowUp(
        new NextRequest(
          new URL(
            "/api/kai/follow-up",
            request.url,
          ),
          {
            method: "POST",
            headers:
              request.headers,
            body: "{}",
          },
        ),
      );

    const result =
      (await response.json()) as {
        success?: boolean;
        learned?: boolean;
        message?: string;
      };

    return {
      success:
        result.success === true,
      learned:
        result.learned === true,
      message:
        cleanFollowUpMessage(
          result.message,
        ),
      result,
    };
  } catch (error) {
    return {
      success: false,
      learned: false,
      message:
        error instanceof Error
          ? error.message
          : "KAI could not run the automatic outcome follow-up.",
    };
  }
}

async function runAutomatedPublishing(
  request: Request,
): Promise<AutomatedPublishingResult> {
  try {
    const response = await processPublishingHandoff(new NextRequest(
      new URL("/api/kai/publishing-handoff", request.url),
      { method: "POST", headers: request.headers, body: "{}" },
    ));
    const result = await response.json() as {
      executed?: boolean;
      publishing?: { total?: number; counts?: Record<string, number> };
    };
    const total = result.publishing?.total ?? 0;
    const blocked = (result.publishing?.counts?.blocked ?? 0) +
      (result.publishing?.counts?.stopped ?? 0);

    return {
      assessed: total,
      executed: result.executed ? 1 : 0,
      blocked,
      results: [result],
    };
  } catch (error) {
    return {
      assessed: 0,
      executed: 0,
      blocked: 0,
      results: [{
        executed: false,
        message: error instanceof Error
          ? error.message
          : "KAI could not assess approved publishing items during this cycle.",
      }],
    };
  }
}

async function runPerformanceLearning(request: Request): Promise<AutomatedPerformanceLearningResult> {
  try {
    const response = await collectPerformanceLearning(new NextRequest(
      new URL("/api/kai/performance-learning", request.url),
      { method: "POST", headers: request.headers, body: JSON.stringify({ action: "collect_next" }) },
    ));
    const result = await response.json() as { success?: boolean; collected?: boolean; message?: string };
    return {
      success: result.success === true,
      collected: result.collected === true,
      message: cleanFollowUpMessage(result.message),
      result,
    };
  } catch (error) {
    return {
      success: false,
      collected: false,
      message: error instanceof Error ? error.message : "KAI could not collect verified performance learning.",
    };
  }
}

function cleanFollowUpMessage(
  value: unknown,
): string {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : "KAI completed the automatic outcome follow-up scan.";
}

export async function GET() {
  try {
    const latestReport =
      await overnightEngine.latest();

    const latestMoneyHunt =
      await readLatestMoneyHunt();

    if (
      !latestReport &&
      !latestMoneyHunt
    ) {
      return NextResponse.json(
        {
          success: false,

          report: null,

          moneyHunt: null,

          message:
            "KAI has not completed an overnight shift yet.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      report:
        latestReport
          ?.report ??
        null,

      reportId:
        latestReport
          ?.id ??
        null,

      createdAt:
        latestReport
          ?.createdAt ??
        latestMoneyHunt
          ?.completedAt ??
        null,

      moneyHunt:
        latestMoneyHunt,

      message:
        latestMoneyHunt
          ?.readyToAct
          ? "KAI loaded the latest overnight report and found a verified money opportunity."
          : "KAI loaded the latest overnight work.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not load the latest overnight report.";

    return NextResponse.json(
      {
        success: false,

        report: null,

        moneyHunt: null,

        message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const rawBody =
      await request.text();

    let decisionRequest:
      DecisionRequest = {};

    if (rawBody.trim()) {
      const parsed: unknown =
        JSON.parse(rawBody);

      if (
        !parsed ||
        typeof parsed !==
          "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "The overnight request must be a JSON object.",
          },
          {
            status: 400,
          },
        );
      }

      decisionRequest =
        parsed as
          DecisionRequest;
    }

    /*
     * PART 1
     *
     * Run KWEVORA's existing overnight
     * operating engine exactly as before.
     */
    const result =
      await overnightEngine.run(
        decisionRequest,
      );

    /*
     * PART 2
     *
     * KAI now performs the persistent
     * Money Hunt during the same
     * overnight shift.
     *
     * Money Mode v5 remembers rejected
     * products across cycles, so this
     * does not restart the search from
     * scratch each night.
     */
    const moneyHunt =
      await runMoneyHunt(
        request,
      );

    const autonomousPublishing =
      await runAutomatedPublishing(
        request,
      );

    const performanceLearning =
      await runPerformanceLearning(request);

    const outcomeFollowUp =
      await runAutomatedFollowUp(
        request,
      );

    return NextResponse.json({
      success: true,

      report:
        result.report,

      reportId:
        result
          .storedReport
          .id,

      createdAt:
        result
          .storedReport
          .createdAt,

      executiveReview:
        result
          .executiveReview,

      organizationSnapshot:
        result
          .organizationSnapshot,

      judgment:
        result
          .judgment,

      executionPlan:
        result
          .executionPlan,

      contentPackage:
        result
          .contentPackage,

      reviewItemId:
        result
          .reviewItemId,

      autonomousCycle:
        result.autonomousCycle,

      autonomousPublishing,

      performanceLearning,

      /*
       * NEW:
       * Overnight Money Mode result.
       */
      moneyHunt,

      outcomeFollowUp,

      overnightJobs: {
        businessOperations:
          "complete",

        moneyHunt:
          moneyHunt.success
            ? moneyHunt
                .readyToAct
              ? "verified_product_found"
              : "search_continues"
            : "failed",

        outcomeFollowUp:
          outcomeFollowUp.learned
            ? "learned"
            : outcomeFollowUp.success
              ? "checked"
              : "needs_attention",

        performanceLearning:
          performanceLearning.collected
            ? "verified_result_learned"
            : performanceLearning.success
              ? "checked"
              : "needs_attention",
      },

      message:
        moneyHunt
          .readyToAct
          ? `KAI completed the overnight shift and found a verified product: ${moneyHunt.bestOpportunity}.`
          : moneyHunt.success
            ? "KAI completed the overnight shift. The Money Hunt did not find a product strong enough yet, so the persistent search will continue with fresh opportunities."
            : "KAI completed the main overnight shift, but the Money Hunt encountered an error.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not complete the overnight shift.";

    return NextResponse.json(
      {
        success: false,

        message,
      },
      {
        status: 500,
      },
    );
  }
}
