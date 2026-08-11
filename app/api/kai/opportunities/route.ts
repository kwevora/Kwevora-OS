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

type VerificationStatus =
  | "verified"
  | "partially_verified"
  | "unverified";

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

  targetAudience: string;
  audienceProblem: string;
  buyingReason: string;

  demandEvidence: string[];
  monetizationEvidence: string[];
  competitionEvidence: string[];
  verificationGaps: string[];
  riskFactors: string[];

  sourceName: string;
  sourceType: string;
  sourceInstructions: string;

  affiliateProgramKnown: boolean;
  affiliateProgramName: string;
  affiliateProgramUrl: string;
  affiliateInstructions: string;

  commissionInformation: string;
  commissionVerified: boolean;

  estimatedPriceRange: string;
  startupCost: string;
  approvalRequirements: string;
  expectedLaunchDifficulty: string;
  speedToLaunch: string;

  verificationStatus: VerificationStatus;

  facelessVideoFit: {
    score: number;
    reason: string;
    demoPossible: boolean;
    productVisualsAvailable: boolean;
    contentAngles: string[];
  };

  scores: {
    demand: number;
    monetization: number;
    contentPotential: number;
    competition: number;
    audienceFit: number;
    startupEase: number;
    speedToLaunch: number;
    verificationConfidence: number;
    overall: number;
  };

  recommendedOffer: string;

  stanStorePlan: {
    shouldUseStanStore: boolean;
    role:
      | "affiliate_bridge"
      | "lead_magnet"
      | "digital_product"
      | "direct_offer"
      | "not_needed";

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

  firstMoneyTest: {
    objective: string;
    contentCount: number;
    testPeriod: string;
    successSignal: string;
    stopSignal: string;
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
    whyItWon: string[];
    firstAction: string;
    confidence: number;
    readyToAct: boolean;
    blockingVerification: string[];
  };

  opportunities: Opportunity[];
};

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanBoolean(value: unknown): boolean {
  return value === true;
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

function cleanPositiveInteger(
  value: unknown,
  fallback: number
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    1,
    Math.round(number)
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

  const parts: string[] = [];

  for (const outputItem of data.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const content of outputItem.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

function getVerificationStatus(
  value: unknown
): VerificationStatus {
  if (
    value === "verified" ||
    value === "partially_verified" ||
    value === "unverified"
  ) {
    return value;
  }

  return "unverified";
}

/*
 * KWEVORA owns the final score.
 *
 * KAI supplies evidence-based component scores,
 * but it does NOT get to simply declare its own
 * winner with an arbitrary overall number.
 */
function calculateOverallScore(scores: {
  demand: number;
  monetization: number;
  contentPotential: number;
  competition: number;
  audienceFit: number;
  startupEase: number;
  speedToLaunch: number;
  verificationConfidence: number;
}) {
  const weighted =
    scores.demand * 0.16 +
    scores.monetization * 0.2 +
    scores.contentPotential * 0.16 +
    scores.competition * 0.08 +
    scores.audienceFit * 0.1 +
    scores.startupEase * 0.1 +
    scores.speedToLaunch * 0.08 +
    scores.verificationConfidence * 0.12;

  return clampScore(weighted);
}

function applyVerificationPenalty(
  score: number,
  verificationStatus: VerificationStatus,
  affiliateProgramKnown: boolean,
  commissionVerified: boolean,
  opportunityType: Opportunity["opportunityType"]
) {
  let penalty = 0;

  if (verificationStatus === "partially_verified") {
    penalty += 8;
  }

  if (verificationStatus === "unverified") {
    penalty += 20;
  }

  if (
    opportunityType === "affiliate" &&
    !affiliateProgramKnown
  ) {
    penalty += 15;
  }

  if (
    opportunityType === "affiliate" &&
    !commissionVerified
  ) {
    penalty += 5;
  }

  return clampScore(score - penalty);
}

function normalizeOpportunity(
  value: any,
  rank: number
): Opportunity {
  const stanStorePlan =
    value?.stanStorePlan ?? {};

  const marketingPlan =
    value?.marketingPlan ?? {};

  const facelessVideoFit =
    value?.facelessVideoFit ?? {};

  const rawScores =
    value?.scores ?? {};

  const firstMoneyTest =
    value?.firstMoneyTest ?? {};

  const opportunityType:
    Opportunity["opportunityType"] =
      [
        "affiliate",
        "digital_product",
        "physical_product",
        "service",
        "unknown",
      ].includes(value?.opportunityType)
        ? value.opportunityType
        : "unknown";

  const verificationStatus =
    getVerificationStatus(
      value?.verificationStatus
    );

  const affiliateProgramKnown =
    cleanBoolean(
      value?.affiliateProgramKnown
    );

  const commissionVerified =
    cleanBoolean(
      value?.commissionVerified
    );

  const scores = {
    demand:
      clampScore(rawScores?.demand),

    monetization:
      clampScore(
        rawScores?.monetization
      ),

    contentPotential:
      clampScore(
        rawScores?.contentPotential
      ),

    competition:
      clampScore(
        rawScores?.competition
      ),

    audienceFit:
      clampScore(
        rawScores?.audienceFit
      ),

    startupEase:
      clampScore(
        rawScores?.startupEase
      ),

    speedToLaunch:
      clampScore(
        rawScores?.speedToLaunch
      ),

    verificationConfidence:
      clampScore(
        rawScores?.verificationConfidence
      ),

    overall: 0,
  };

  const calculatedOverall =
    calculateOverallScore(scores);

  scores.overall =
    applyVerificationPenalty(
      calculatedOverall,
      verificationStatus,
      affiliateProgramKnown,
      commissionVerified,
      opportunityType
    );

  const stanRole =
    [
      "affiliate_bridge",
      "lead_magnet",
      "digital_product",
      "direct_offer",
      "not_needed",
    ].includes(stanStorePlan?.role)
      ? stanStorePlan.role
      : "not_needed";

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

    opportunityType,

    whatItIs:
      cleanString(value?.whatItIs),

    whyItIsInteresting:
      cleanString(
        value?.whyItIsInteresting
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

    demandEvidence:
      cleanStringArray(
        value?.demandEvidence,
        10
      ),

    monetizationEvidence:
      cleanStringArray(
        value?.monetizationEvidence,
        10
      ),

    competitionEvidence:
      cleanStringArray(
        value?.competitionEvidence,
        8
      ),

    verificationGaps:
      cleanStringArray(
        value?.verificationGaps,
        10
      ),

    riskFactors:
      cleanStringArray(
        value?.riskFactors,
        10
      ),

    sourceName:
      cleanString(value?.sourceName),

    sourceType:
      cleanString(value?.sourceType),

    sourceInstructions:
      cleanString(
        value?.sourceInstructions
      ),

    affiliateProgramKnown,

    affiliateProgramName:
      cleanString(
        value?.affiliateProgramName
      ),

    affiliateProgramUrl:
      cleanString(
        value?.affiliateProgramUrl
      ),

    affiliateInstructions:
      cleanString(
        value?.affiliateInstructions
      ),

    commissionInformation:
      cleanString(
        value?.commissionInformation
      ),

    commissionVerified,

    estimatedPriceRange:
      cleanString(
        value?.estimatedPriceRange
      ),

    startupCost:
      cleanString(value?.startupCost),

    approvalRequirements:
      cleanString(
        value?.approvalRequirements
      ),

    expectedLaunchDifficulty:
      cleanString(
        value?.expectedLaunchDifficulty
      ),

    speedToLaunch:
      cleanString(
        value?.speedToLaunch
      ),

    verificationStatus,

    facelessVideoFit: {
      score:
        clampScore(
          facelessVideoFit?.score
        ),

      reason:
        cleanString(
          facelessVideoFit?.reason
        ),

      demoPossible:
        cleanBoolean(
          facelessVideoFit?.demoPossible
        ),

      productVisualsAvailable:
        cleanBoolean(
          facelessVideoFit
            ?.productVisualsAvailable
        ),

      contentAngles:
        cleanStringArray(
          facelessVideoFit
            ?.contentAngles,
          8
        ),
    },

    scores,

    recommendedOffer:
      cleanString(
        value?.recommendedOffer
      ),

    stanStorePlan: {
      shouldUseStanStore:
        cleanBoolean(
          stanStorePlan
            ?.shouldUseStanStore
        ),

      role: stanRole,

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
          8
        ),

      contentIdeas:
        cleanStringArray(
          marketingPlan
            ?.contentIdeas,
          8
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

    firstMoneyTest: {
      objective:
        cleanString(
          firstMoneyTest?.objective
        ),

      contentCount:
        cleanPositiveInteger(
          firstMoneyTest?.contentCount,
          5
        ),

      testPeriod:
        cleanString(
          firstMoneyTest?.testPeriod
        ),

      successSignal:
        cleanString(
          firstMoneyTest?.successSignal
        ),

      stopSignal:
        cleanString(
          firstMoneyTest?.stopSignal
        ),
    },

    nextMove:
      cleanString(value?.nextMove),
  };
}

function buildRecommendation(
  opportunities: Opportunity[],
  parsedRecommendation: any
): OpportunityReport["recommendation"] {
  const winner =
    opportunities[0];

  if (!winner) {
    return {
      bestOpportunity: "",
      reason:
        "KAI did not find an opportunity with enough evidence to recommend.",
      whyItWon: [],
      firstAction:
        "Run additional live research before choosing an offer.",
      confidence: 0,
      readyToAct: false,
      blockingVerification: [
        "No qualified opportunity was returned.",
      ],
    };
  }

  const blockingVerification =
    winner.verificationGaps;

  const readyToAct =
    winner.verificationStatus ===
      "verified" &&
    (
      winner.opportunityType !==
        "affiliate" ||
      winner.affiliateProgramKnown
    ) &&
    winner.scores.overall >= 65;

  return {
    bestOpportunity:
      winner.productName,

    reason:
      cleanString(
        parsedRecommendation?.reason
      ) ||
      winner.whyItIsInteresting,

    whyItWon:
      cleanStringArray(
        parsedRecommendation?.whyItWon,
        8
      ),

    firstAction:
      cleanString(
        parsedRecommendation
          ?.firstAction
      ) ||
      winner.nextMove,

    confidence:
      winner.scores
        .verificationConfidence,

    readyToAct,

    blockingVerification,
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
          "Always spell KWEVORA exactly K-W-E-V-O-R-A.",
          "You are operating in KWEVORA MONEY MODE.",
          "Your mission is to help run a real digital and affiliate marketing business that needs to reach revenue as efficiently as reasonably possible.",
          "",
          "You are evaluating CURRENT RESEARCH gathered by KWEVORA.",
          "Do not rely on model memory for claims about what is currently trending, selling, priced, available, or accepting affiliates.",
          "Every important factual claim must be supported by the supplied research.",
          "If the research does not establish a fact, mark it unknown and add it to verificationGaps.",
          "",
          "Do not invent affiliate programs.",
          "Do not invent commission rates.",
          "Do not invent cookie windows.",
          "Do not invent prices.",
          "Do not invent sales volume.",
          "Do not invent search volume.",
          "Do not invent approval requirements.",
          "Do not invent reseller rights.",
          "",
          "Affiliate promotion and product resale are different. Never blur them.",
          "Never tell the user to list an affiliate company's product in Stan Store as though the product belongs to the user.",
          "For affiliate offers, Stan Store may be useful as a bridge, lead magnet, or owned digital-product destination when appropriate.",
          "",
          "KWEVORA is currently being used by a new digital/affiliate marketer who wants low startup cost and strong faceless short-form video potential.",
          "Prefer opportunities that can be tested without buying inventory.",
          "Prefer opportunities with a clear legitimate monetization path.",
          "Prefer opportunities that can be launched quickly.",
          "Prefer opportunities capable of producing multiple distinct short-form video angles.",
          "Penalize opportunities that depend on unverified affiliate availability.",
          "Penalize opportunities with weak evidence of buyer demand.",
          "Penalize opportunities requiring large upfront cost.",
          "Penalize opportunities that are difficult to demonstrate or market faceless.",
          "Penalize opportunities where trademark, copyright, advertising, health, financial, or platform-policy risks are unusually high.",
          "",
          "Do not recommend a product simply because it is popular.",
          "The question is whether this user can realistically monetize attention around it.",
          "",
          "SCORING RULES:",
          "All component scores are integers from 0 to 100.",
          "demand = strength and freshness of evidence that buyers care.",
          "monetization = clarity and attractiveness of the legitimate earning path.",
          "contentPotential = ability to make persuasive varied marketing content.",
          "competition = higher is BETTER; score high when a new marketer has a realistic angle despite competition.",
          "audienceFit = clarity of buyer and problem/desire.",
          "startupEase = higher when little money, setup, or inventory is required.",
          "speedToLaunch = higher when the opportunity can realistically be promoted quickly.",
          "verificationConfidence = how much of the important business information is actually supported by supplied research.",
          "",
          "FACELESS VIDEO RULES:",
          "Evaluate whether this opportunity can produce compelling faceless TikTok, YouTube Shorts, Instagram Reels, and similar short-form content.",
          "Think about screen recordings, demonstrations, transformations, comparisons, before/after workflows, problem/solution storytelling, product footage the marketer may legitimately use, text-driven videos, and other scroll-stopping formats.",
          "Do not assume copyrighted third-party footage can be reused.",
          "",
          "FIRST MONEY TEST:",
          "Design a small validation campaign before KWEVORA commits heavily.",
          "The test should define how many pieces of content to publish, roughly how long to test, what signal means continue, and what signal means stop or change angle.",
          "",
          "Return no more than five opportunities.",
          "Return strongest candidates first.",
          "Use plain language.",
          "Return only the required JSON.",
        ].join("\n"),

        input: [
          {
            role: "user",

            content: [
              {
                type: "input_text",

                text: [
                  "KWEVORA MONEY MODE — OPPORTUNITY INTELLIGENCE V2",
                  "",
                  `Niche: ${niche || "Open — compare the strongest researched opportunities."}`,
                  `Audience: ${audience || "Not predetermined."}`,
                  `Business goal: ${goal}`,
                  `Additional notes: ${notes || "None."}`,
                  "",
                  "CURRENT LIVE RESEARCH:",
                  research,
                  "",
                  "Evaluate the candidates using only what this research can support.",
                  "If a promising candidate still needs verification, keep it in the report but clearly identify the missing facts.",
                  "Do not tell KWEVORA to act as though an unverified affiliate program is confirmed.",
                ].join("\n"),
              },
            ],
          },
        ],

        text: {
          format: {
            type: "json_schema",

            name:
              "kwevora_money_mode_opportunity_intelligence_v2",

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
                    reason: {
                      type: "string",
                    },

                    whyItWon: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    firstAction: {
                      type: "string",
                    },
                  },

                  required: [
                    "reason",
                    "whyItWon",
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

                      targetAudience: {
                        type: "string",
                      },

                      audienceProblem: {
                        type: "string",
                      },

                      buyingReason: {
                        type: "string",
                      },

                      demandEvidence: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      monetizationEvidence: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      competitionEvidence: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      verificationGaps: {
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

                      affiliateProgramUrl: {
                        type: "string",
                      },

                      affiliateInstructions: {
                        type: "string",
                      },

                      commissionInformation: {
                        type: "string",
                      },

                      commissionVerified: {
                        type: "boolean",
                      },

                      estimatedPriceRange: {
                        type: "string",
                      },

                      startupCost: {
                        type: "string",
                      },

                      approvalRequirements: {
                        type: "string",
                      },

                      expectedLaunchDifficulty: {
                        type: "string",
                      },

                      speedToLaunch: {
                        type: "string",
                      },

                      verificationStatus: {
                        type: "string",

                        enum: [
                          "verified",
                          "partially_verified",
                          "unverified",
                        ],
                      },

                      facelessVideoFit: {
                        type: "object",

                        additionalProperties:
                          false,

                        properties: {
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          reason: {
                            type: "string",
                          },

                          demoPossible: {
                            type: "boolean",
                          },

                          productVisualsAvailable: {
                            type: "boolean",
                          },

                          contentAngles: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                        },

                        required: [
                          "score",
                          "reason",
                          "demoPossible",
                          "productVisualsAvailable",
                          "contentAngles",
                        ],
                      },

                      scores: {
                        type: "object",

                        additionalProperties:
                          false,

                        properties: {
                          demand: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          monetization: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          contentPotential: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          competition: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          audienceFit: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          startupEase: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          speedToLaunch: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },

                          verificationConfidence: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                        },

                        required: [
                          "demand",
                          "monetization",
                          "contentPotential",
                          "competition",
                          "audienceFit",
                          "startupEase",
                          "speedToLaunch",
                          "verificationConfidence",
                        ],
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

                          role: {
                            type: "string",

                            enum: [
                              "affiliate_bridge",
                              "lead_magnet",
                              "digital_product",
                              "direct_offer",
                              "not_needed",
                            ],
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
                          "role",
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

                      firstMoneyTest: {
                        type: "object",

                        additionalProperties:
                          false,

                        properties: {
                          objective: {
                            type: "string",
                          },

                          contentCount: {
                            type: "integer",
                            minimum: 1,
                          },

                          testPeriod: {
                            type: "string",
                          },

                          successSignal: {
                            type: "string",
                          },

                          stopSignal: {
                            type: "string",
                          },
                        },

                        required: [
                          "objective",
                          "contentCount",
                          "testPeriod",
                          "successSignal",
                          "stopSignal",
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
                      "targetAudience",
                      "audienceProblem",
                      "buyingReason",
                      "demandEvidence",
                      "monetizationEvidence",
                      "competitionEvidence",
                      "verificationGaps",
                      "riskFactors",
                      "sourceName",
                      "sourceType",
                      "sourceInstructions",
                      "affiliateProgramKnown",
                      "affiliateProgramName",
                      "affiliateProgramUrl",
                      "affiliateInstructions",
                      "commissionInformation",
                      "commissionVerified",
                      "estimatedPriceRange",
                      "startupCost",
                      "approvalRequirements",
                      "expectedLaunchDifficulty",
                      "speedToLaunch",
                      "verificationStatus",
                      "facelessVideoFit",
                      "scores",
                      "recommendedOffer",
                      "stanStorePlan",
                      "marketingPlan",
                      "firstMoneyTest",
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
              second.scores.overall -
              first.scores.overall
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

    recommendation:
      buildRecommendation(
        opportunities,
        parsed?.recommendation
      ),

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
      "Find, verify, score, and turn real market opportunities into income-producing actions.",

    liveResearchConnected:
      true,

    intelligenceVersion:
      "Opportunity Intelligence v2",

    scoring:
      "KWEVORA-calculated weighted scoring with verification penalties.",

    nextCapability:
      "Deep-verify finalists before campaign execution.",
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

    if (!research) {
      return NextResponse.json({
        success: true,

        mode:
          "KWEVORA_MONEY_MODE",

        liveResearchRequired:
          true,

        message:
          "KAI needs current market research before it can truthfully choose a money opportunity.",

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
      "KWEVORA Opportunity Intelligence v2 failed:",
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