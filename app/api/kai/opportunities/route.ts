import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OpportunityRequest = {
  niche?: string;
  audience?: string;
  goal?: string;
  notes?: string;
  research?: string;
};

type Opportunity = {
  rank: number;
  productName: string;
  brand: string;
  category: string;

  opportunityType:
    | "affiliate"
    | "digital_product"
    | "physical_product"
    | "service"
    | "unknown";

  whatItIs: string;
  whyItIsInteresting: string;

  demandEvidence: string[];
  riskFactors: string[];

  targetAudience: string;
  audienceProblem: string;
  buyingReason: string;

  sourceName: string;
  sourceType: string;
  sourceInstructions: string;

  affiliateProgramKnown: boolean;
  affiliateProgramName: string;
  affiliateInstructions: string;

  estimatedPriceRange: string;
  commissionInformation: string;

  trendScore: number;
  monetizationScore: number;
  contentScore: number;
  competitionScore: number;
  overallScore: number;

  recommendedOffer: string;

  stanStorePlan: {
    shouldUseStanStore: boolean;
    productTitle: string;
    productDescription: string;
    callToAction: string;
    destinationStrategy: string;
    setupInstructions: string[];
  };

  marketingPlan: {
    primaryAngle: string;
    hookIdeas: string[];
    contentIdeas: string[];
    recommendedPlatforms: string[];
    callToAction: string;
  };

  nextMove: string;
};

type OpportunityReport = {
  generatedAt: string;
  mode: "KWEVORA_MONEY_MODE";

  businessGoal: string;
  researchSummary: string;

  recommendation: {
    bestOpportunity: string;
    reason: string;
    firstAction: string;
  };

  opportunities: Opportunity[];
};

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function clampScore(value: unknown): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function cleanStringArray(
  value: unknown,
  maximum = 10
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maximum);
}

function extractOutputText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  for (const outputItem of data.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const content of outputItem.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function normalizeOpportunity(
  value: any,
  rank: number
): Opportunity {
  const stanStorePlan =
    value?.stanStorePlan ?? {};

  const marketingPlan =
    value?.marketingPlan ?? {};

  return {
    rank,

    productName:
      cleanString(value?.productName) ||
      "Unknown opportunity",

    brand:
      cleanString(value?.brand) ||
      "Unknown",

    category:
      cleanString(value?.category) ||
      "Unknown",

    opportunityType:
      [
        "affiliate",
        "digital_product",
        "physical_product",
        "service",
        "unknown",
      ].includes(value?.opportunityType)
        ? value.opportunityType
        : "unknown",

    whatItIs:
      cleanString(value?.whatItIs),

    whyItIsInteresting:
      cleanString(
        value?.whyItIsInteresting
      ),

    demandEvidence:
      cleanStringArray(
        value?.demandEvidence,
        8
      ),

    riskFactors:
      cleanStringArray(
        value?.riskFactors,
        8
      ),

    targetAudience:
      cleanString(
        value?.targetAudience
      ),

    audienceProblem:
      cleanString(
        value?.audienceProblem
      ),

    buyingReason:
      cleanString(
        value?.buyingReason
      ),

    sourceName:
      cleanString(value?.sourceName),

    sourceType:
      cleanString(value?.sourceType),

    sourceInstructions:
      cleanString(
        value?.sourceInstructions
      ),

    affiliateProgramKnown:
      value?.affiliateProgramKnown ===
      true,

    affiliateProgramName:
      cleanString(
        value?.affiliateProgramName
      ),

    affiliateInstructions:
      cleanString(
        value?.affiliateInstructions
      ),

    estimatedPriceRange:
      cleanString(
        value?.estimatedPriceRange
      ),

    commissionInformation:
      cleanString(
        value?.commissionInformation
      ),

    trendScore:
      clampScore(value?.trendScore),

    monetizationScore:
      clampScore(
        value?.monetizationScore
      ),

    contentScore:
      clampScore(value?.contentScore),

    competitionScore:
      clampScore(
        value?.competitionScore
      ),

    overallScore:
      clampScore(value?.overallScore),

    recommendedOffer:
      cleanString(
        value?.recommendedOffer
      ),

    stanStorePlan: {
      shouldUseStanStore:
        stanStorePlan
          ?.shouldUseStanStore === true,

      productTitle:
        cleanString(
          stanStorePlan?.productTitle
        ),

      productDescription:
        cleanString(
          stanStorePlan
            ?.productDescription
        ),

      callToAction:
        cleanString(
          stanStorePlan?.callToAction
        ),

      destinationStrategy:
        cleanString(
          stanStorePlan
            ?.destinationStrategy
        ),

      setupInstructions:
        cleanStringArray(
          stanStorePlan
            ?.setupInstructions,
          10
        ),
    },

    marketingPlan: {
      primaryAngle:
        cleanString(
          marketingPlan
            ?.primaryAngle
        ),

      hookIdeas:
        cleanStringArray(
          marketingPlan?.hookIdeas,
          6
        ),

      contentIdeas:
        cleanStringArray(
          marketingPlan
            ?.contentIdeas,
          6
        ),

      recommendedPlatforms:
        cleanStringArray(
          marketingPlan
            ?.recommendedPlatforms,
          6
        ),

      callToAction:
        cleanString(
          marketingPlan
            ?.callToAction
        ),
    },

    nextMove:
      cleanString(value?.nextMove),
  };
}

async function analyzeOpportunities({
  apiKey,
  niche,
  audience,
  goal,
  notes,
  research,
}: {
  apiKey: string;
  niche: string;
  audience: string;
  goal: string;
  notes: string;
  research: string;
}): Promise<OpportunityReport> {
  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          process.env.KAI_TEXT_MODEL ||
          "gpt-4o-mini",

        instructions: [
          "You are KAI, the operating intelligence inside KWEVORA OS.",
          "The brand name is KWEVORA. Always spell it exactly K-W-E-V-O-R-A.",
          "You are operating in KWEVORA MONEY MODE.",
          "Your current mission is to help operate and grow a real digital and affiliate marketing business.",
          "Your job is not to produce generic business ideas.",
          "Your job is to evaluate supplied current research and identify practical opportunities that could realistically be monetized.",
          "Never claim something is trending, viral, bestselling, or hot unless the supplied research provides evidence for that claim.",
          "Never invent sales numbers, search volume, commission rates, affiliate programs, product prices, brand partnerships, supplier relationships, or marketplace availability.",
          "If a fact is unknown, clearly mark it unknown or say it needs verification.",
          "Never tell the user they are allowed to resell a product unless the supplied research establishes that right.",
          "Affiliate promotion and product resale are different business models. Keep them separate.",
          "A Stan Store listing must not falsely imply that an affiliate product belongs to the user.",
          "When Stan Store is useful, explain whether it should function as a destination, lead magnet, digital product storefront, or bridge to a legitimate affiliate destination.",
          "Prioritize opportunities using evidence, monetization potential, content potential, competition, audience fit, and practical difficulty.",
          "High trend interest does not automatically mean high monetization potential.",
          "Prefer opportunities that can be tested quickly and cheaply.",
          "Protect KWEVORA's credibility. Avoid deceptive claims, fake scarcity, fake testimonials, copied products, trademark misuse, or misleading advertising.",
          "Marketing recommendations must be specific to the opportunity.",
          "Return the strongest opportunities first.",
          "Return no more than five opportunities.",
          "Scores must be integers from 0 to 100.",
          "For competitionScore, a higher number means a more favorable competitive situation, not more competition.",
          "Use plain conversational language.",
          "Return only the required structured JSON.",
        ].join(" "),

        input: [
          {
            role: "user",

            content: [
              {
                type: "input_text",

                text: [
                  "KWEVORA MONEY MODE RESEARCH REQUEST",
                  "",
                  `Niche: ${niche || "Open — find the strongest opportunity."}`,
                  `Audience: ${audience || "Not predetermined."}`,
                  `Business goal: ${goal}`,
                  `Additional notes: ${notes || "None."}`,
                  "",
                  "CURRENT RESEARCH:",
                  research ||
                    "No current research was supplied. Do not pretend to know what is currently hot. Return no opportunities and explain that live research is required.",
                ].join("\n"),
              },
            ],
          },
        ],

        text: {
          format: {
            type: "json_schema",

            name:
              "kwevora_money_mode_opportunity_report",

            strict: true,

            schema: {
              type: "object",

              additionalProperties:
                false,

              properties: {
                researchSummary: {
                  type: "string",
                },

                recommendation: {
                  type: "object",

                  additionalProperties:
                    false,

                  properties: {
                    bestOpportunity: {
                      type: "string",
                    },

                    reason: {
                      type: "string",
                    },

                    firstAction: {
                      type: "string",
                    },
                  },

                  required: [
                    "bestOpportunity",
                    "reason",
                    "firstAction",
                  ],
                },

                opportunities: {
                  type: "array",

                  maxItems: 5,

                  items: {
                    type: "object",

                    additionalProperties:
                      false,

                    properties: {
                      productName: {
                        type: "string",
                      },

                      brand: {
                        type: "string",
                      },

                      category: {
                        type: "string",
                      },

                      opportunityType: {
                        type: "string",

                        enum: [
                          "affiliate",
                          "digital_product",
                          "physical_product",
                          "service",
                          "unknown",
                        ],
                      },

                      whatItIs: {
                        type: "string",
                      },

                      whyItIsInteresting: {
                        type: "string",
                      },

                      demandEvidence: {
                        type: "array",

                        items: {
                          type: "string",
                        },
                      },

                      riskFactors: {
                        type: "array",

                        items: {
                          type: "string",
                        },
                      },

                      targetAudience: {
                        type: "string",
                      },

                      audienceProblem: {
                        type: "string",
                      },

                      buyingReason: {
                        type: "string",
                      },

                      sourceName: {
                        type: "string",
                      },

                      sourceType: {
                        type: "string",
                      },

                      sourceInstructions: {
                        type: "string",
                      },

                      affiliateProgramKnown: {
                        type: "boolean",
                      },

                      affiliateProgramName: {
                        type: "string",
                      },

                      affiliateInstructions: {
                        type: "string",
                      },

                      estimatedPriceRange: {
                        type: "string",
                      },

                      commissionInformation: {
                        type: "string",
                      },

                      trendScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      monetizationScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      contentScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      competitionScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      overallScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      recommendedOffer: {
                        type: "string",
                      },

                      stanStorePlan: {
                        type: "object",

                        additionalProperties:
                          false,

                        properties: {
                          shouldUseStanStore: {
                            type: "boolean",
                          },

                          productTitle: {
                            type: "string",
                          },

                          productDescription: {
                            type: "string",
                          },

                          callToAction: {
                            type: "string",
                          },

                          destinationStrategy: {
                            type: "string",
                          },

                          setupInstructions: {
                            type: "array",

                            items: {
                              type: "string",
                            },
                          },
                        },

                        required: [
                          "shouldUseStanStore",
                          "productTitle",
                          "productDescription",
                          "callToAction",
                          "destinationStrategy",
                          "setupInstructions",
                        ],
                      },

                      marketingPlan: {
                        type: "object",

                        additionalProperties:
                          false,

                        properties: {
                          primaryAngle: {
                            type: "string",
                          },

                          hookIdeas: {
                            type: "array",

                            items: {
                              type: "string",
                            },
                          },

                          contentIdeas: {
                            type: "array",

                            items: {
                              type: "string",
                            },
                          },

                          recommendedPlatforms: {
                            type: "array",

                            items: {
                              type: "string",
                            },
                          },

                          callToAction: {
                            type: "string",
                          },
                        },

                        required: [
                          "primaryAngle",
                          "hookIdeas",
                          "contentIdeas",
                          "recommendedPlatforms",
                          "callToAction",
                        ],
                      },

                      nextMove: {
                        type: "string",
                      },
                    },

                    required: [
                      "productName",
                      "brand",
                      "category",
                      "opportunityType",
                      "whatItIs",
                      "whyItIsInteresting",
                      "demandEvidence",
                      "riskFactors",
                      "targetAudience",
                      "audienceProblem",
                      "buyingReason",
                      "sourceName",
                      "sourceType",
                      "sourceInstructions",
                      "affiliateProgramKnown",
                      "affiliateProgramName",
                      "affiliateInstructions",
                      "estimatedPriceRange",
                      "commissionInformation",
                      "trendScore",
                      "monetizationScore",
                      "contentScore",
                      "competitionScore",
                      "overallScore",
                      "recommendedOffer",
                      "stanStorePlan",
                      "marketingPlan",
                      "nextMove",
                    ],
                  },
                },
              },

              required: [
                "researchSummary",
                "recommendation",
                "opportunities",
              ],
            },
          },
        },
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not analyze the opportunity research."
    );
  }

  const outputText =
    extractOutputText(data);

  if (!outputText) {
    throw new Error(
      "KAI returned no opportunity analysis."
    );
  }

  let parsed: any;

  try {
    parsed =
      JSON.parse(outputText);
  } catch {
    throw new Error(
      "KAI returned opportunity research that could not be read."
    );
  }

  const opportunities =
    Array.isArray(
      parsed?.opportunities
    )
      ? parsed.opportunities
          .map(
            (
              opportunity: any,
              index: number
            ) =>
              normalizeOpportunity(
                opportunity,
                index + 1
              )
          )
          .sort(
            (
              first: Opportunity,
              second: Opportunity
            ) =>
              second.overallScore -
              first.overallScore
          )
          .map(
            (
              opportunity: Opportunity,
              index: number
            ) => ({
              ...opportunity,
              rank: index + 1,
            })
          )
      : [];

  return {
    generatedAt:
      new Date().toISOString(),

    mode:
      "KWEVORA_MONEY_MODE",

    businessGoal: goal,

    researchSummary:
      cleanString(
        parsed?.researchSummary
      ),

    recommendation: {
      bestOpportunity:
        cleanString(
          parsed?.recommendation
            ?.bestOpportunity
        ),

      reason:
        cleanString(
          parsed?.recommendation
            ?.reason
        ),

      firstAction:
        cleanString(
          parsed?.recommendation
            ?.firstAction
        ),
    },

    opportunities,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,

    mode:
      "KWEVORA_MONEY_MODE",

    status: "ready",

    mission:
      "Find, evaluate, and turn real market opportunities into income-producing actions.",

    liveResearchConnected:
      false,

    nextCapability:
      "Connect current market research sources.",
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as OpportunityRequest;

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,

          message:
            "OPENAI_API_KEY is missing from the KWEVORA environment.",
        },

        {
          status: 500,
        }
      );
    }

    const niche =
      cleanString(body.niche);

    const audience =
      cleanString(body.audience);

    const goal =
      cleanString(body.goal) ||
      "Find the strongest practical opportunity to generate digital or affiliate marketing income.";

    const notes =
      cleanString(body.notes);

    const research =
      cleanString(body.research);

    /*
     * IMPORTANT:
     *
     * KAI does not pretend its model knowledge
     * represents today's market.
     *
     * Live research will be connected next.
     */
    if (!research) {
      return NextResponse.json({
        success: true,

        mode:
          "KWEVORA_MONEY_MODE",

        liveResearchRequired:
          true,

        message:
          "KAI is ready to evaluate opportunities, but current market research must be collected before it can truthfully identify what is hot right now.",

        nextAction:
          "Run KWEVORA live opportunity research.",
      });
    }

    const report =
      await analyzeOpportunities({
        apiKey,
        niche,
        audience,
        goal,
        notes,
        research,
      });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(
      "KWEVORA opportunity analysis failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "KAI could not evaluate the opportunities.",
      },

      {
        status: 500,
      }
    );
  }
}