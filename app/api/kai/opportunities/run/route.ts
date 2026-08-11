import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoneyModeRequest = {
  niche?: string;
  audience?: string;
  goal?: string;
  notes?: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getBaseUrl(request: NextRequest) {
  return request.nextUrl.origin;
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "KWEVORA received a response it could not read."
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "KWEVORA_MONEY_MODE",
    capability: "opportunity_orchestrator",
    status: "ready",

    pipeline: [
      "Live market research",
      "Source collection",
      "Opportunity evaluation",
      "Opportunity ranking",
      "Best opportunity recommendation",
      "First money action",
    ],

    mission:
      "Research the current market and turn evidence into KAI's best practical money opportunity.",
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as MoneyModeRequest;

    const niche =
      cleanString(body.niche);

    const audience =
      cleanString(body.audience);

    const goal =
      cleanString(body.goal) ||
      "Find the strongest practical opportunity to generate digital or affiliate marketing income.";

    const notes =
      cleanString(body.notes);

    const baseUrl =
      getBaseUrl(request);

    /*
     * STEP 1
     *
     * KAI researches the current outside world.
     */
    const researchResponse =
      await fetch(
        `${baseUrl}/api/kai/opportunities/research`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            niche,
            audience,
            goal,
            notes,
          }),

          cache: "no-store",
        }
      );

    const researchData =
      await readJsonSafely(
        researchResponse
      );

    if (
      !researchResponse.ok ||
      !researchData?.success
    ) {
      throw new Error(
        researchData?.message ||
          "KAI could not complete live market research."
      );
    }

    const research =
      cleanString(
        researchData?.research
      );

    if (!research) {
      throw new Error(
        "KAI's live research returned no usable evidence."
      );
    }

    /*
     * STEP 2
     *
     * The Opportunity Brain receives the
     * research instead of guessing from memory.
     */
    const opportunityResponse =
      await fetch(
        `${baseUrl}/api/kai/opportunities`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            niche,
            audience,
            goal,
            notes,
            research,
          }),

          cache: "no-store",
        }
      );

    const opportunityData =
      await readJsonSafely(
        opportunityResponse
      );

    if (
      !opportunityResponse.ok ||
      !opportunityData?.success
    ) {
      throw new Error(
        opportunityData?.message ||
          "KAI researched the market but could not evaluate the opportunities."
      );
    }

    const report =
      opportunityData?.report;

    if (!report) {
      throw new Error(
        "KAI evaluated the research but returned no opportunity report."
      );
    }

    /*
     * STEP 3
     *
     * Combine the decision with its evidence.
     *
     * We keep the source list attached so KAI's
     * recommendation can be checked later.
     */
    return NextResponse.json({
      success: true,

      mode:
        "KWEVORA_MONEY_MODE",

      runAt:
        new Date().toISOString(),

      pipelineStatus:
        "complete",

      recommendation:
        report.recommendation,

      opportunities:
        report.opportunities,

      researchSummary:
        report.researchSummary,

      businessGoal:
        report.businessGoal,

      evidence: {
        researchedAt:
          researchData?.researchedAt ??
          null,

        sourceCount:
          typeof researchData?.sourceCount ===
          "number"
            ? researchData.sourceCount
            : Array.isArray(
                  researchData?.sources
                )
              ? researchData.sources.length
              : 0,

        sources:
          Array.isArray(
            researchData?.sources
          )
            ? researchData.sources
            : [],

        research,
      },

      nextAction:
        report?.recommendation
          ?.firstAction ||
        "Review KAI's highest-ranked opportunity.",
    });
  } catch (error) {
    console.error(
      "KWEVORA Money Mode opportunity run failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        mode:
          "KWEVORA_MONEY_MODE",

        message:
          error instanceof Error
            ? error.message
            : "KAI could not complete the Money Mode opportunity run.",
      },

      {
        status: 500,
      }
    );
  }
}