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
  | "unverified"
  | "rejected";

type LicenseType =
  | "mrr"
  | "plr"
  | "resell_rights"
  | "commercial_resale"
  | "other"
  | "unknown";

type Opportunity = {
  rank: number;
  productName: string;
  brand: string;
  category: string;
  opportunityType: "resellable_digital_product";
  whatItIs: string;
  whyItIsInteresting: string;

  targetAudience: string;
  audienceProblem: string;
  buyingReason: string;

  demandEvidence: string[];
  competitionEvidence: string[];
  qualityEvidence: string[];
  verificationGaps: string[];
  riskFactors: string[];

  source: {
    sellerName: string;
    marketplace: string;
    productUrl: string;
    sourceReputation: string;
  };

  license: {
    type: LicenseType;
    licenseUrl: string;
    licenseEvidence: string[];
    resaleToEndCustomersAllowed: boolean;
    resaleRightsVerified: boolean;
    rebrandingAllowed: boolean;
    modificationAllowed: boolean;
    passResaleRightsAllowed: boolean;
    giveawayAllowed: boolean;
    bundlingAllowed: boolean;
    marketplaceRestrictions: string;
    advertisingRestrictions: string;
    minimumPriceRule: string;
    otherRestrictions: string[];
  };

  economics: {
    acquisitionCost: string;
    acquisitionCostVerified: boolean;
    resalePrice: string;
    resalePriceVerified: boolean;
    estimatedMargin: string;
    recurringCost: string;
  };

  productQuality: {
    score: number;
    reason: string;
    freshness: string;
    professionalism: string;
    completeness: string;
    customerFeedback: string;
  };

  saturation: {
    score: number;
    reason: string;
    identicalCopyRisk: string;
    differentiationIdeas: string[];
  };

  facelessVideoFit: {
    score: number;
    reason: string;
    demoPossible: boolean;
    productVisualsAvailable: boolean;
    contentAngles: string[];
  };

  verificationStatus: VerificationStatus;

  scores: {
    demand: number;
    resaleRights: number;
    marginPotential: number;
    productQuality: number;
    contentPotential: number;
    competition: number;
    audienceFit: number;
    startupEase: number;
    speedToLaunch: number;
    verificationConfidence: number;
    overall: number;
  };

  stanStorePlan: {
    shouldUseStanStore: boolean;
    productTitle: string;
    productDescription: string;
    suggestedPrice: string;
    callToAction: string;
    deliveryStrategy: string;
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
  businessModel: "EXISTING_RESELLABLE_DIGITAL_PRODUCTS";
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
  return typeof value === "string" ? value.trim() : "";
}

function cleanBoolean(value: unknown): boolean {
  return value === true;
}

function clampScore(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanPositiveInteger(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(1, Math.round(number));
}

function cleanStringArray(value: unknown, maximum = 10): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maximum);
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
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
      if (typeof content?.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

function getVerificationStatus(value: unknown): VerificationStatus {
  if (
    value === "verified" ||
    value === "partially_verified" ||
    value === "unverified" ||
    value === "rejected"
  ) {
    return value;
  }

  return "unverified";
}

function getLicenseType(value: unknown): LicenseType {
  if (
    value === "mrr" ||
    value === "plr" ||
    value === "resell_rights" ||
    value === "commercial_resale" ||
    value === "other" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

/*
 * KWEVORA owns the final score.
 *
 * KAI evaluates evidence and supplies component scores.
 * KWEVORA calculates the weighted overall score itself.
 */
function calculateOverallScore(scores: {
  demand: number;
  resaleRights: number;
  marginPotential: number;
  productQuality: number;
  contentPotential: number;
  competition: number;
  audienceFit: number;
  startupEase: number;
  speedToLaunch: number;
  verificationConfidence: number;
}) {
  const weighted =
    scores.demand * 0.16 +
    scores.resaleRights * 0.18 +
    scores.marginPotential * 0.12 +
    scores.productQuality * 0.12 +
    scores.contentPotential * 0.12 +
    scores.competition * 0.06 +
    scores.audienceFit * 0.07 +
    scores.startupEase * 0.05 +
    scores.speedToLaunch * 0.04 +
    scores.verificationConfidence * 0.08;

  return clampScore(weighted);
}

/*
 * A product cannot win merely because demand looks good.
 * If resale rights are unclear, KWEVORA heavily penalizes it.
 */
function applyLicensePenalty(
  score: number,
  verificationStatus: VerificationStatus,
  resaleRightsVerified: boolean,
  resaleToEndCustomersAllowed: boolean,
  licenseType: LicenseType
) {
  if (!resaleToEndCustomersAllowed) {
    return 0;
  }

  let penalty = 0;

  if (!resaleRightsVerified) {
    penalty += 30;
  }

  if (licenseType === "unknown") {
    penalty += 15;
  }

  if (verificationStatus === "partially_verified") {
    penalty += 8;
  }

  if (verificationStatus === "unverified") {
    penalty += 20;
  }

  if (verificationStatus === "rejected") {
    return 0;
  }

  return clampScore(score - penalty);
}

function normalizeOpportunity(value: any, rank: number): Opportunity {
  const source = value?.source ?? {};
  const license = value?.license ?? {};
  const economics = value?.economics ?? {};
  const productQuality = value?.productQuality ?? {};
  const saturation = value?.saturation ?? {};
  const facelessVideoFit = value?.facelessVideoFit ?? {};
  const rawScores = value?.scores ?? {};
  const stanStorePlan = value?.stanStorePlan ?? {};
  const marketingPlan = value?.marketingPlan ?? {};
  const firstMoneyTest = value?.firstMoneyTest ?? {};

  const verificationStatus = getVerificationStatus(
    value?.verificationStatus
  );

  const licenseType = getLicenseType(license?.type);

  const resaleRightsVerified = cleanBoolean(
    license?.resaleRightsVerified
  );

  const resaleToEndCustomersAllowed = cleanBoolean(
    license?.resaleToEndCustomersAllowed
  );

  const scores = {
    demand: clampScore(rawScores?.demand),
    resaleRights: clampScore(rawScores?.resaleRights),
    marginPotential: clampScore(rawScores?.marginPotential),
    productQuality: clampScore(rawScores?.productQuality),
    contentPotential: clampScore(rawScores?.contentPotential),
    competition: clampScore(rawScores?.competition),
    audienceFit: clampScore(rawScores?.audienceFit),
    startupEase: clampScore(rawScores?.startupEase),
    speedToLaunch: clampScore(rawScores?.speedToLaunch),
    verificationConfidence: clampScore(rawScores?.verificationConfidence),
    overall: 0,
  };

  const calculatedOverall = calculateOverallScore(scores);

  scores.overall = applyLicensePenalty(
    calculatedOverall,
    verificationStatus,
    resaleRightsVerified,
    resaleToEndCustomersAllowed,
    licenseType
  );

  return {
    rank,
    productName: cleanString(value?.productName) || "Unknown opportunity",
    brand: cleanString(value?.brand) || "Unknown",
    category: cleanString(value?.category) || "Digital product",
    opportunityType: "resellable_digital_product",
    whatItIs: cleanString(value?.whatItIs),
    whyItIsInteresting: cleanString(value?.whyItIsInteresting),

    targetAudience: cleanString(value?.targetAudience),
    audienceProblem: cleanString(value?.audienceProblem),
    buyingReason: cleanString(value?.buyingReason),

    demandEvidence: cleanStringArray(value?.demandEvidence, 12),
    competitionEvidence: cleanStringArray(value?.competitionEvidence, 10),
    qualityEvidence: cleanStringArray(value?.qualityEvidence, 10),
    verificationGaps: cleanStringArray(value?.verificationGaps, 15),
    riskFactors: cleanStringArray(value?.riskFactors, 12),

    source: {
      sellerName: cleanString(source?.sellerName),
      marketplace: cleanString(source?.marketplace),
      productUrl: cleanString(source?.productUrl),
      sourceReputation: cleanString(source?.sourceReputation),
    },

    license: {
      type: licenseType,
      licenseUrl: cleanString(license?.licenseUrl),
      licenseEvidence: cleanStringArray(license?.licenseEvidence, 12),
      resaleToEndCustomersAllowed,
      resaleRightsVerified,
      rebrandingAllowed: cleanBoolean(license?.rebrandingAllowed),
      modificationAllowed: cleanBoolean(license?.modificationAllowed),
      passResaleRightsAllowed: cleanBoolean(
        license?.passResaleRightsAllowed
      ),
      giveawayAllowed: cleanBoolean(license?.giveawayAllowed),
      bundlingAllowed: cleanBoolean(license?.bundlingAllowed),
      marketplaceRestrictions: cleanString(
        license?.marketplaceRestrictions
      ),
      advertisingRestrictions: cleanString(
        license?.advertisingRestrictions
      ),
      minimumPriceRule: cleanString(license?.minimumPriceRule),
      otherRestrictions: cleanStringArray(license?.otherRestrictions, 12),
    },

    economics: {
      acquisitionCost: cleanString(economics?.acquisitionCost),
      acquisitionCostVerified: cleanBoolean(
        economics?.acquisitionCostVerified
      ),
      resalePrice: cleanString(economics?.resalePrice),
      resalePriceVerified: cleanBoolean(economics?.resalePriceVerified),
      estimatedMargin: cleanString(economics?.estimatedMargin),
      recurringCost: cleanString(economics?.recurringCost),
    },

    productQuality: {
      score: clampScore(productQuality?.score),
      reason: cleanString(productQuality?.reason),
      freshness: cleanString(productQuality?.freshness),
      professionalism: cleanString(productQuality?.professionalism),
      completeness: cleanString(productQuality?.completeness),
      customerFeedback: cleanString(productQuality?.customerFeedback),
    },

    saturation: {
      score: clampScore(saturation?.score),
      reason: cleanString(saturation?.reason),
      identicalCopyRisk: cleanString(saturation?.identicalCopyRisk),
      differentiationIdeas: cleanStringArray(
        saturation?.differentiationIdeas,
        8
      ),
    },

    facelessVideoFit: {
      score: clampScore(facelessVideoFit?.score),
      reason: cleanString(facelessVideoFit?.reason),
      demoPossible: cleanBoolean(facelessVideoFit?.demoPossible),
      productVisualsAvailable: cleanBoolean(
        facelessVideoFit?.productVisualsAvailable
      ),
      contentAngles: cleanStringArray(facelessVideoFit?.contentAngles, 8),
    },

    verificationStatus,
    scores,

    stanStorePlan: {
      shouldUseStanStore: cleanBoolean(stanStorePlan?.shouldUseStanStore),
      productTitle: cleanString(stanStorePlan?.productTitle),
      productDescription: cleanString(stanStorePlan?.productDescription),
      suggestedPrice: cleanString(stanStorePlan?.suggestedPrice),
      callToAction: cleanString(stanStorePlan?.callToAction),
      deliveryStrategy: cleanString(stanStorePlan?.deliveryStrategy),
      setupInstructions: cleanStringArray(
        stanStorePlan?.setupInstructions,
        12
      ),
    },

    marketingPlan: {
      primaryAngle: cleanString(marketingPlan?.primaryAngle),
      hookIdeas: cleanStringArray(marketingPlan?.hookIdeas, 8),
      contentIdeas: cleanStringArray(marketingPlan?.contentIdeas, 8),
      recommendedPlatforms: cleanStringArray(
        marketingPlan?.recommendedPlatforms,
        6
      ),
      callToAction: cleanString(marketingPlan?.callToAction),
    },

    firstMoneyTest: {
      objective: cleanString(firstMoneyTest?.objective),
      contentCount: cleanPositiveInteger(firstMoneyTest?.contentCount, 5),
      testPeriod: cleanString(firstMoneyTest?.testPeriod),
      successSignal: cleanString(firstMoneyTest?.successSignal),
      stopSignal: cleanString(firstMoneyTest?.stopSignal),
    },

    nextMove: cleanString(value?.nextMove),
  };
}

function buildRecommendation(
  opportunities: Opportunity[],
  parsedRecommendation: any
): OpportunityReport["recommendation"] {
  const winner = opportunities[0];

  if (!winner) {
    return {
      bestOpportunity: "",
      reason:
        "KAI did not find a resellable digital product with enough evidence to recommend.",
      whyItWon: [],
      firstAction:
        "Continue live research for a stronger resellable digital product opportunity.",
      confidence: 0,
      readyToAct: false,
      blockingVerification: [
        "No qualified resellable digital product was returned.",
      ],
    };
  }

  const blockingVerification = [...winner.verificationGaps];

  if (!winner.license.resaleRightsVerified) {
    blockingVerification.unshift(
      "The exact resale license has not yet been independently verified."
    );
  }

  if (!winner.license.resaleToEndCustomersAllowed) {
    blockingVerification.unshift(
      "KWEVORA has not established that this product may legally be resold to end customers."
    );
  }

  const readyToAct =
    winner.verificationStatus === "verified" &&
    winner.license.resaleRightsVerified &&
    winner.license.resaleToEndCustomersAllowed &&
    winner.scores.overall >= 65;

  return {
    bestOpportunity: winner.productName,
    reason:
      cleanString(parsedRecommendation?.reason) ||
      winner.whyItIsInteresting,
    whyItWon: cleanStringArray(parsedRecommendation?.whyItWon, 8),
    firstAction:
      readyToAct
        ? cleanString(parsedRecommendation?.firstAction) || winner.nextMove
        : "Send the top candidates to KWEVORA's resale-license verification engine before selling anything.",
    confidence: winner.scores.verificationConfidence,
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
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.KAI_TEXT_MODEL || "gpt-4o-mini",

      instructions: [
        "You are KAI, the operating intelligence inside KWEVORA OS.",
        "Always spell KWEVORA exactly K-W-E-V-O-R-A.",
        "You are operating in KWEVORA MONEY MODE.",
        "KWEVORA's PRIMARY business model right now is EXISTING RESELLABLE DIGITAL PRODUCTS.",
        "The user does not want affiliate marketing as the primary model and does not want to spend days creating large original digital products from scratch.",
        "The goal is to find an existing quality digital product with real current buyer demand and explicit legal resale rights, then sell that product for the user's own profit.",
        "",
        "You are evaluating CURRENT LIVE RESEARCH supplied by KWEVORA.",
        "Do not rely on model memory for current demand, current pricing, current product availability, or current license terms.",
        "Every important factual claim must be supported by the supplied research.",
        "If the research does not establish a fact, leave it unresolved and add it to verificationGaps.",
        "",
        "LICENSE RULES:",
        "Never assume that PLR, MRR, RR, commercial use, or purchasing a digital product automatically permits resale.",
        "The actual license controls what the user may do.",
        "Distinguish Master Resell Rights, Private Label Rights, Resell Rights, commercial resale rights, and other licenses.",
        "A PLR license may permit editing without permitting every kind of resale. Read the evidence carefully.",
        "A commercial-use license does not automatically mean resale rights.",
        "Affiliate rights are not resale rights.",
        "If resale to end customers is not supported by evidence, resaleToEndCustomersAllowed must be false.",
        "If the exact license evidence is not sufficient, resaleRightsVerified must be false.",
        "",
        "DEMAND RULES:",
        "Demand comes before catalog availability.",
        "Score demand using current evidence that people actually care about the problem, category, or product type.",
        "Do not call something hot, bestselling, or trending without evidence.",
        "Do not confuse social attention with purchase intent.",
        "",
        "QUALITY RULES:",
        "A legally resellable product can still be a bad product.",
        "Evaluate usefulness, freshness, completeness, professionalism, customer feedback when available, seller reputation, and whether the material appears generic or outdated.",
        "Penalize weak or questionable product quality.",
        "",
        "ECONOMICS RULES:",
        "Use only pricing information supported by research.",
        "Evaluate acquisition cost, recurring costs, resale pricing rules, minimum-price restrictions, and realistic gross-margin potential.",
        "Do not invent costs, prices, or margins.",
        "",
        "SATURATION RULES:",
        "Investigate whether many sellers appear to be offering identical copies of the same product.",
        "A higher competition score means a MORE favorable competitive situation.",
        "A higher saturation.score means a BETTER opportunity with less harmful saturation or stronger differentiation potential.",
        "",
        "FACELESS CONTENT RULES:",
        "The user intends to rely heavily on faceless short-form marketing.",
        "Evaluate whether the product can be marketed with original demonstrations, previews, tutorials, problem-solution videos, before-and-after examples, screen recordings, text-led creative, original voiceover, and other legitimate formats.",
        "Do not assume copyrighted seller footage or product assets can be copied unless the license or source permits it.",
        "",
        "STAN STORE:",
        "When resale rights are ultimately verified, KWEVORA intends to prepare the digital product for sale through the user's own storefront such as Stan Store when practical.",
        "Do not claim Stan Store setup is authorized until the resale license is verified.",
        "",
        "SAFETY:",
        "Reject pirated, stolen, counterfeit, deceptive, unauthorized, or clearly illegal products.",
        "Reject products dependent on false income guarantees or misleading claims.",
        "Protect KWEVORA's credibility.",
        "",
        "SCORING:",
        "All component scores are integers from 0 to 100.",
        "demand = strength and freshness of buyer-demand evidence.",
        "resaleRights = strength of evidence that the user may legally resell the product to end customers.",
        "marginPotential = attractiveness of supported acquisition cost versus supported resale economics.",
        "productQuality = usefulness, freshness, professionalism, completeness, and trustworthiness.",
        "contentPotential = ability to produce varied persuasive marketing content.",
        "competition = higher is better; score the user's realistic ability to compete or differentiate.",
        "audienceFit = clarity of buyer and problem/desire.",
        "startupEase = low cost and low operational friction.",
        "speedToLaunch = how quickly the product could be legitimately listed and marketed after verification.",
        "verificationConfidence = how much of the important business information is actually supported by research.",
        "KWEVORA calculates the final overall score itself.",
        "",
        "VERIFICATION STATUS:",
        "verified = the supplied research strongly supports the core product, demand, economics, and resale-license facts.",
        "partially_verified = promising but important facts still require independent verification.",
        "unverified = insufficient reliable evidence.",
        "rejected = evidence indicates KWEVORA should not pursue this product.",
        "",
        "Do not authorize the final sale here merely because a license appears promising.",
        "The next KWEVORA verification layer will independently inspect the exact license before the hard action gate passes.",
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
                "KWEVORA MONEY MODE — RESELLABLE DIGITAL PRODUCT OPPORTUNITY INTELLIGENCE",
                "",
                `Niche: ${niche || "Open — compare the strongest researched demand/product matches."}`,
                `Audience: ${audience || "Not predetermined."}`,
                `Business goal: ${goal}`,
                `Additional notes: ${notes || "None."}`,
                "",
                "CURRENT LIVE RESEARCH:",
                research,
                "",
                "Evaluate only products supported by this research.",
                "Rank the products by their realistic ability to become a legitimate, low-cost, fast-to-launch digital resale opportunity.",
                "If the product looks promising but the exact resale license still needs proof, keep it as a finalist and clearly identify the verification gap.",
                "Do not convert this into an affiliate recommendation.",
              ].join("\n"),
            },
          ],
        },
      ],

      text: {
        format: {
          type: "json_schema",
          name: "kwevora_resellable_digital_product_opportunity_v1",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              researchSummary: { type: "string" },
              recommendation: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reason: { type: "string" },
                  whyItWon: {
                    type: "array",
                    items: { type: "string" },
                  },
                  firstAction: { type: "string" },
                },
                required: ["reason", "whyItWon", "firstAction"],
              },
              opportunities: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    productName: { type: "string" },
                    brand: { type: "string" },
                    category: { type: "string" },
                    whatItIs: { type: "string" },
                    whyItIsInteresting: { type: "string" },
                    targetAudience: { type: "string" },
                    audienceProblem: { type: "string" },
                    buyingReason: { type: "string" },
                    demandEvidence: {
                      type: "array",
                      items: { type: "string" },
                    },
                    competitionEvidence: {
                      type: "array",
                      items: { type: "string" },
                    },
                    qualityEvidence: {
                      type: "array",
                      items: { type: "string" },
                    },
                    verificationGaps: {
                      type: "array",
                      items: { type: "string" },
                    },
                    riskFactors: {
                      type: "array",
                      items: { type: "string" },
                    },
                    source: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        sellerName: { type: "string" },
                        marketplace: { type: "string" },
                        productUrl: { type: "string" },
                        sourceReputation: { type: "string" },
                      },
                      required: [
                        "sellerName",
                        "marketplace",
                        "productUrl",
                        "sourceReputation",
                      ],
                    },
                    license: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        type: {
                          type: "string",
                          enum: [
                            "mrr",
                            "plr",
                            "resell_rights",
                            "commercial_resale",
                            "other",
                            "unknown",
                          ],
                        },
                        licenseUrl: { type: "string" },
                        licenseEvidence: {
                          type: "array",
                          items: { type: "string" },
                        },
                        resaleToEndCustomersAllowed: { type: "boolean" },
                        resaleRightsVerified: { type: "boolean" },
                        rebrandingAllowed: { type: "boolean" },
                        modificationAllowed: { type: "boolean" },
                        passResaleRightsAllowed: { type: "boolean" },
                        giveawayAllowed: { type: "boolean" },
                        bundlingAllowed: { type: "boolean" },
                        marketplaceRestrictions: { type: "string" },
                        advertisingRestrictions: { type: "string" },
                        minimumPriceRule: { type: "string" },
                        otherRestrictions: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "type",
                        "licenseUrl",
                        "licenseEvidence",
                        "resaleToEndCustomersAllowed",
                        "resaleRightsVerified",
                        "rebrandingAllowed",
                        "modificationAllowed",
                        "passResaleRightsAllowed",
                        "giveawayAllowed",
                        "bundlingAllowed",
                        "marketplaceRestrictions",
                        "advertisingRestrictions",
                        "minimumPriceRule",
                        "otherRestrictions",
                      ],
                    },
                    economics: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        acquisitionCost: { type: "string" },
                        acquisitionCostVerified: { type: "boolean" },
                        resalePrice: { type: "string" },
                        resalePriceVerified: { type: "boolean" },
                        estimatedMargin: { type: "string" },
                        recurringCost: { type: "string" },
                      },
                      required: [
                        "acquisitionCost",
                        "acquisitionCostVerified",
                        "resalePrice",
                        "resalePriceVerified",
                        "estimatedMargin",
                        "recurringCost",
                      ],
                    },
                    productQuality: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        score: {
                          type: "integer",
                          minimum: 0,
                          maximum: 100,
                        },
                        reason: { type: "string" },
                        freshness: { type: "string" },
                        professionalism: { type: "string" },
                        completeness: { type: "string" },
                        customerFeedback: { type: "string" },
                      },
                      required: [
                        "score",
                        "reason",
                        "freshness",
                        "professionalism",
                        "completeness",
                        "customerFeedback",
                      ],
                    },
                    saturation: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        score: {
                          type: "integer",
                          minimum: 0,
                          maximum: 100,
                        },
                        reason: { type: "string" },
                        identicalCopyRisk: { type: "string" },
                        differentiationIdeas: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "score",
                        "reason",
                        "identicalCopyRisk",
                        "differentiationIdeas",
                      ],
                    },
                    facelessVideoFit: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        score: {
                          type: "integer",
                          minimum: 0,
                          maximum: 100,
                        },
                        reason: { type: "string" },
                        demoPossible: { type: "boolean" },
                        productVisualsAvailable: { type: "boolean" },
                        contentAngles: {
                          type: "array",
                          items: { type: "string" },
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
                    verificationStatus: {
                      type: "string",
                      enum: [
                        "verified",
                        "partially_verified",
                        "unverified",
                        "rejected",
                      ],
                    },
                    scores: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        demand: { type: "integer", minimum: 0, maximum: 100 },
                        resaleRights: { type: "integer", minimum: 0, maximum: 100 },
                        marginPotential: { type: "integer", minimum: 0, maximum: 100 },
                        productQuality: { type: "integer", minimum: 0, maximum: 100 },
                        contentPotential: { type: "integer", minimum: 0, maximum: 100 },
                        competition: { type: "integer", minimum: 0, maximum: 100 },
                        audienceFit: { type: "integer", minimum: 0, maximum: 100 },
                        startupEase: { type: "integer", minimum: 0, maximum: 100 },
                        speedToLaunch: { type: "integer", minimum: 0, maximum: 100 },
                        verificationConfidence: { type: "integer", minimum: 0, maximum: 100 },
                      },
                      required: [
                        "demand",
                        "resaleRights",
                        "marginPotential",
                        "productQuality",
                        "contentPotential",
                        "competition",
                        "audienceFit",
                        "startupEase",
                        "speedToLaunch",
                        "verificationConfidence",
                      ],
                    },
                    stanStorePlan: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        shouldUseStanStore: { type: "boolean" },
                        productTitle: { type: "string" },
                        productDescription: { type: "string" },
                        suggestedPrice: { type: "string" },
                        callToAction: { type: "string" },
                        deliveryStrategy: { type: "string" },
                        setupInstructions: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "shouldUseStanStore",
                        "productTitle",
                        "productDescription",
                        "suggestedPrice",
                        "callToAction",
                        "deliveryStrategy",
                        "setupInstructions",
                      ],
                    },
                    marketingPlan: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        primaryAngle: { type: "string" },
                        hookIdeas: {
                          type: "array",
                          items: { type: "string" },
                        },
                        contentIdeas: {
                          type: "array",
                          items: { type: "string" },
                        },
                        recommendedPlatforms: {
                          type: "array",
                          items: { type: "string" },
                        },
                        callToAction: { type: "string" },
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
                      additionalProperties: false,
                      properties: {
                        objective: { type: "string" },
                        contentCount: { type: "integer", minimum: 1 },
                        testPeriod: { type: "string" },
                        successSignal: { type: "string" },
                        stopSignal: { type: "string" },
                      },
                      required: [
                        "objective",
                        "contentCount",
                        "testPeriod",
                        "successSignal",
                        "stopSignal",
                      ],
                    },
                    nextMove: { type: "string" },
                  },
                  required: [
                    "productName",
                    "brand",
                    "category",
                    "whatItIs",
                    "whyItIsInteresting",
                    "targetAudience",
                    "audienceProblem",
                    "buyingReason",
                    "demandEvidence",
                    "competitionEvidence",
                    "qualityEvidence",
                    "verificationGaps",
                    "riskFactors",
                    "source",
                    "license",
                    "economics",
                    "productQuality",
                    "saturation",
                    "facelessVideoFit",
                    "verificationStatus",
                    "scores",
                    "stanStorePlan",
                    "marketingPlan",
                    "firstMoneyTest",
                    "nextMove",
                  ],
                },
              },
            },
            required: ["researchSummary", "recommendation", "opportunities"],
          },
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not analyze the resellable digital product research."
    );
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error("KAI returned no opportunity analysis.");
  }

  let parsed: any;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error(
      "KAI returned opportunity research that KWEVORA could not read."
    );
  }

  const opportunities = Array.isArray(parsed?.opportunities)
    ? parsed.opportunities
        .map((opportunity: any, index: number) =>
          normalizeOpportunity(opportunity, index + 1)
        )
        .sort(
          (first: Opportunity, second: Opportunity) =>
            second.scores.overall - first.scores.overall
        )
        .map((opportunity: Opportunity, index: number) => ({
          ...opportunity,
          rank: index + 1,
        }))
    : [];

  return {
    generatedAt: new Date().toISOString(),
    mode: "KWEVORA_MONEY_MODE",
    businessModel: "EXISTING_RESELLABLE_DIGITAL_PRODUCTS",
    businessGoal: goal,
    researchSummary: cleanString(parsed?.researchSummary),
    recommendation: buildRecommendation(
      opportunities,
      parsed?.recommendation
    ),
    opportunities,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "KWEVORA_MONEY_MODE",
    status: "ready",
    businessModel: "existing_resellable_digital_products",
    intelligenceVersion: "Resellable Digital Product Opportunity v1",
    liveResearchConnected: true,
    scoring:
      "KWEVORA-calculated weighted scoring with resale-license penalties.",
    hardGate:
      "No verified resale rights means KWEVORA cannot authorize the product for sale.",
    mission:
      "Evaluate current demand and rank existing digital products that may be legally resold for profit.",
    nextCapability:
      "Deep-verify the exact resale license, product source, pricing, restrictions, and quality before sale authorization.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => ({}))) as OpportunityRequest;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY is missing from the KWEVORA environment.",
        },
        { status: 500 }
      );
    }

    const niche = cleanString(body.niche);
    const audience = cleanString(body.audience);
    const goal =
      cleanString(body.goal) ||
      "Find the strongest existing digital product with current buyer demand and legitimate resale potential.";
    const notes = cleanString(body.notes);
    const research = cleanString(body.research);

    if (!research) {
      return NextResponse.json({
        success: true,
        mode: "KWEVORA_MONEY_MODE",
        businessModel: "existing_resellable_digital_products",
        liveResearchRequired: true,
        message:
          "KAI needs current demand, product, pricing, quality, and license research before it can choose a resellable digital product opportunity.",
        nextAction: "Run KWEVORA live resellable digital product research.",
      });
    }

    const report = await analyzeOpportunities({
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
      "KWEVORA resellable digital product opportunity analysis failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        mode: "KWEVORA_MONEY_MODE",
        message:
          error instanceof Error
            ? error.message
            : "KAI could not evaluate the resellable digital product opportunities.",
      },
      { status: 500 }
    );
  }
}