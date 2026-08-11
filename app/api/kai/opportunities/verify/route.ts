import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CandidateInput = {
  productName?: string;
  brand?: string;
  opportunityType?: string;
  affiliateProgramName?: string;
  affiliateProgramUrl?: string;
  whatItIs?: string;
  unresolvedFacts?: string[];
  sourceUrl?: string;
  seller?: string;
  licenseType?: string;
  licenseUrl?: string;
  acquisitionCost?: string;
  resalePrice?: string;
};

type VerifyRequest = {
  candidates?: CandidateInput[];
  verificationRound?: number;
  focus?: string;
};

type VerificationSource = {
  title: string;
  url: string;
};

type VerifiedCandidate = {
  productName: string;
  brand: string;

  verificationStatus:
    | "verified"
    | "partially_verified"
    | "unverified"
    | "rejected";

  source: {
    verified: boolean;
    seller: string;
    productUrl: string;
    sourceReputation: string;
  };

  license: {
    verified: boolean;
    licenseType: string;
    licenseUrl: string;
    resaleToEndCustomers: boolean;
    rebrandingAllowed: boolean;
    modificationAllowed: boolean;
    transferableResaleRights: boolean;
    details: string;
  };

  acquisition: {
    verified: boolean;
    cost: string;
    recurringFees: string;
  };

  resale: {
    verified: boolean;
    permittedPrice: string;
    minimumPrice: string;
    suggestedPrice: string;
  };

  margin: {
    verified: boolean;
    details: string;
    score: number;
  };

  demand: {
    verified: boolean;
    score: number;
    evidence: string[];
    details: string;
  };

  quality: {
    verified: boolean;
    score: number;
    details: string;
    freshnessConcerns: string;
  };

  competition: {
    verified: boolean;
    score: number;
    saturationRisk: string;
    details: string;
  };

  restrictions: string[];

  requirements: {
    verified: boolean;
    marketplaceRestrictions: string[];
    advertisingRestrictions: string[];
    bundlingRestrictions: string[];
    giveawayRestrictions: string[];
    geographicRestrictions: string;

    // Temporary compatibility with the existing Money Mode UI.
    approvalRequirements: string[];
    trafficRequirements: string;
  };

  pricing: {
    verified: boolean;
    details: string;
  };

  facelessMarketing: {
    suitable: boolean;
    score: number;
    reason: string;
    legalAssetNotes: string;
    contentAngles: string[];
  };

  monetizationConfidence: number;
  verifiedFacts: string[];
  unresolvedFacts: string[];
  warnings: string[];
  readyForTesting: boolean;
  nextAction: string;

  // Temporary compatibility fields while the rest of Money Mode is converted.
  program: {
    exists: boolean;
    currentlyAvailable: boolean;
    programName: string;
    signupUrl: string;
    network: string;
  };

  commission: {
    verified: boolean;
    structure: string;
    recurring: boolean;
    recurringDetails: string;
  };

  cookie: {
    verified: boolean;
    duration: string;
  };

  payout: {
    verified: boolean;
    details: string;
  };
};

type VerificationReport = {
  verifiedAt: string;
  verificationRound: number;
  mode: "KWEVORA_MONEY_MODE";
  capability: "RESELLABLE_DIGITAL_PRODUCT_VERIFICATION";
  businessModel: "existing_resellable_digital_products";
  candidates: VerifiedCandidate[];
  strongestVerifiedCandidate: string;
  summary: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item: unknown): item is string => typeof item === "string")
    .map((item: string) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function clampScore(value: unknown): number {
  const number =
    typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  // Normalize an occasional 0-10 score to 0-100.
  if (number > 0 && number <= 10) {
    return Math.max(0, Math.min(100, Math.round(number * 10)));
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanRound(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(1, Math.min(3, Math.round(number)));
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

  for (const item of data.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n\n").trim();
}

function extractSources(data: any): VerificationSource[] {
  const sources = new Map<string, VerificationSource>();

  if (!Array.isArray(data?.output)) {
    return [];
  }

  for (const item of data.output) {
    if (
      item?.type === "web_search_call" &&
      Array.isArray(item?.action?.sources)
    ) {
      for (const source of item.action.sources) {
        const url = cleanString(source?.url);

        if (!url) {
          continue;
        }

        sources.set(url, {
          title: cleanString(source?.title) || url,
          url,
        });
      }
    }

    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!Array.isArray(content?.annotations)) {
        continue;
      }

      for (const annotation of content.annotations) {
        const url =
          cleanString(annotation?.url) ||
          cleanString(annotation?.url_citation?.url);

        if (!url) {
          continue;
        }

        sources.set(url, {
          title:
            cleanString(annotation?.title) ||
            cleanString(annotation?.url_citation?.title) ||
            url,
          url,
        });
      }
    }
  }

  return Array.from(sources.values());
}

function normalizeCandidate(value: any): VerifiedCandidate {
  const source = value?.source ?? {};
  const license = value?.license ?? {};
  const acquisition = value?.acquisition ?? {};
  const resale = value?.resale ?? {};
  const margin = value?.margin ?? {};
  const demand = value?.demand ?? {};
  const quality = value?.quality ?? {};
  const competition = value?.competition ?? {};
  const requirements = value?.requirements ?? {};
  const pricing = value?.pricing ?? {};
  const facelessMarketing = value?.facelessMarketing ?? {};

  let verificationStatus: VerifiedCandidate["verificationStatus"] =
    ["verified", "partially_verified", "unverified", "rejected"].includes(
      value?.verificationStatus
    )
      ? value.verificationStatus
      : "unverified";

  const unresolvedFacts = cleanStringArray(
    value?.unresolvedFacts,
    25
  );

  const sourceVerified = source?.verified === true;
  const licenseVerified = license?.verified === true;
  const resaleAllowed =
    license?.resaleToEndCustomers === true;
  const acquisitionVerified =
    acquisition?.verified === true;
  const pricingVerified =
    pricing?.verified === true;
  const demandVerified = demand?.verified === true;
  const facelessSuitable =
    facelessMarketing?.suitable === true;

  const coreGatePassed =
    sourceVerified &&
    licenseVerified &&
    resaleAllowed &&
    acquisitionVerified &&
    pricingVerified &&
    demandVerified &&
    facelessSuitable &&
    unresolvedFacts.length === 0;

  let readyForTesting =
    value?.readyForTesting === true &&
    coreGatePassed;

  if (!licenseVerified || !resaleAllowed) {
    readyForTesting = false;

    if (verificationStatus === "verified") {
      verificationStatus = "partially_verified";
    }
  }

  if (readyForTesting) {
    verificationStatus = "verified";
  }

  return {
    productName:
      cleanString(value?.productName) ||
      "Unknown digital product",

    brand:
      cleanString(value?.brand) ||
      cleanString(source?.seller) ||
      "Unknown",

    verificationStatus,

    source: {
      verified: sourceVerified,
      seller: cleanString(source?.seller),
      productUrl: cleanString(source?.productUrl),
      sourceReputation: cleanString(
        source?.sourceReputation
      ),
    },

    license: {
      verified: licenseVerified,
      licenseType: cleanString(license?.licenseType),
      licenseUrl: cleanString(license?.licenseUrl),
      resaleToEndCustomers: resaleAllowed,
      rebrandingAllowed:
        license?.rebrandingAllowed === true,
      modificationAllowed:
        license?.modificationAllowed === true,
      transferableResaleRights:
        license?.transferableResaleRights === true,
      details: cleanString(license?.details),
    },

    acquisition: {
      verified: acquisitionVerified,
      cost: cleanString(acquisition?.cost),
      recurringFees: cleanString(
        acquisition?.recurringFees
      ),
    },

    resale: {
      verified: resale?.verified === true,
      permittedPrice: cleanString(
        resale?.permittedPrice
      ),
      minimumPrice: cleanString(resale?.minimumPrice),
      suggestedPrice: cleanString(
        resale?.suggestedPrice
      ),
    },

    margin: {
      verified: margin?.verified === true,
      details: cleanString(margin?.details),
      score: clampScore(margin?.score),
    },

    demand: {
      verified: demandVerified,
      score: clampScore(demand?.score),
      evidence: cleanStringArray(demand?.evidence, 15),
      details: cleanString(demand?.details),
    },

    quality: {
      verified: quality?.verified === true,
      score: clampScore(quality?.score),
      details: cleanString(quality?.details),
      freshnessConcerns: cleanString(
        quality?.freshnessConcerns
      ),
    },

    competition: {
      verified: competition?.verified === true,
      score: clampScore(competition?.score),
      saturationRisk: cleanString(
        competition?.saturationRisk
      ),
      details: cleanString(competition?.details),
    },

    restrictions: cleanStringArray(
      value?.restrictions,
      20
    ),

    requirements: {
      verified: requirements?.verified === true,
      marketplaceRestrictions: cleanStringArray(
        requirements?.marketplaceRestrictions,
        12
      ),
      advertisingRestrictions: cleanStringArray(
        requirements?.advertisingRestrictions,
        12
      ),
      bundlingRestrictions: cleanStringArray(
        requirements?.bundlingRestrictions,
        12
      ),
      giveawayRestrictions: cleanStringArray(
        requirements?.giveawayRestrictions,
        12
      ),
      geographicRestrictions: cleanString(
        requirements?.geographicRestrictions
      ),
      approvalRequirements: [],
      trafficRequirements: "",
    },

    pricing: {
      verified: pricingVerified,
      details: cleanString(pricing?.details),
    },

    facelessMarketing: {
      suitable: facelessSuitable,
      score: clampScore(facelessMarketing?.score),
      reason: cleanString(facelessMarketing?.reason),
      legalAssetNotes: cleanString(
        facelessMarketing?.legalAssetNotes
      ),
      contentAngles: cleanStringArray(
        facelessMarketing?.contentAngles,
        10
      ),
    },

    monetizationConfidence: clampScore(
      value?.monetizationConfidence
    ),

    verifiedFacts: cleanStringArray(
      value?.verifiedFacts,
      25
    ),

    unresolvedFacts,

    warnings: cleanStringArray(value?.warnings, 20),

    readyForTesting,

    nextAction: readyForTesting
      ? cleanString(value?.nextAction) ||
        "Prepare the first small digital-product marketing test."
      : "Do not sell or market this product yet. Resolve the remaining licensing, demand, pricing, source, or product-quality questions first.",

    // Temporary compatibility fields.
    program: {
      exists: sourceVerified,
      currentlyAvailable:
        sourceVerified && acquisitionVerified,
      programName: cleanString(source?.seller),
      signupUrl: cleanString(source?.productUrl),
      network: cleanString(license?.licenseType),
    },

    commission: {
      verified: margin?.verified === true,
      structure: cleanString(margin?.details),
      recurring: false,
      recurringDetails: cleanString(
        acquisition?.recurringFees
      ),
    },

    cookie: {
      verified: licenseVerified,
      duration: cleanString(license?.details),
    },

    payout: {
      verified: pricingVerified,
      details: cleanString(pricing?.details),
    },
  };
}

function buildCandidateText(
  candidates: CandidateInput[]
): string {
  return candidates
    .map((candidate: CandidateInput, index: number) => {
      const unresolved = cleanStringArray(
        candidate.unresolvedFacts,
        20
      );

      return [
        `CANDIDATE ${index + 1}`,
        `Product: ${
          cleanString(candidate.productName) || "Unknown"
        }`,
        `Seller / Brand: ${
          cleanString(candidate.seller) ||
          cleanString(candidate.brand) ||
          "Unknown"
        }`,
        `Opportunity type: ${
          cleanString(candidate.opportunityType) ||
          "Existing resellable digital product"
        }`,
        `Known product/source URL: ${
          cleanString(candidate.sourceUrl) ||
          cleanString(candidate.affiliateProgramUrl) ||
          "Unknown"
        }`,
        `Known license type: ${
          cleanString(candidate.licenseType) || "Unknown"
        }`,
        `Known license URL: ${
          cleanString(candidate.licenseUrl) || "Unknown"
        }`,
        `Known acquisition cost: ${
          cleanString(candidate.acquisitionCost) ||
          "Unknown"
        }`,
        `Known resale price: ${
          cleanString(candidate.resalePrice) || "Unknown"
        }`,
        `Description: ${
          cleanString(candidate.whatItIs) || "None"
        }`,
        "",
        "FACTS STILL NEEDING VERIFICATION:",
        unresolved.length > 0
          ? unresolved
              .map((fact: string) => `- ${fact}`)
              .join("\n")
          : "- No prior unresolved facts supplied.",
      ].join("\n");
    })
    .join("\n\n");
}

async function deeplyVerify({
  apiKey,
  candidates,
  verificationRound,
  focus,
}: {
  apiKey: string;
  candidates: CandidateInput[];
  verificationRound: number;
  focus: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const candidateText = buildCandidateText(candidates);

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:
          process.env.KAI_RESEARCH_MODEL ||
          process.env.KAI_TEXT_MODEL ||
          "gpt-5-mini",

        tools: [
          {
            type: "web_search",
            search_context_size: "high",
          },
        ],

        tool_choice: "auto",

        instructions: [
          "You are KAI, the operating intelligence inside KWEVORA OS.",
          "Always spell the brand exactly KWEVORA.",
          "You are operating in KWEVORA MONEY MODE.",
          "",
          "You are performing DEEP RESELLABLE DIGITAL PRODUCT VERIFICATION.",
          `Verification round: ${verificationRound}.`,
          `Today is ${today}.`,
          "",
          "BUSINESS MODEL:",
          "The user wants to sell existing digital products created by other people or companies when the user has clear legal rights to resell those products for the user's own profit.",
          "This is not primarily affiliate marketing.",
          "This is not primarily creating original products from scratch.",
          "",
          "ABSOLUTE HARD GATE:",
          "If reliable evidence does not establish that the user may legally resell the exact product to end customers, readyForTesting MUST be false.",
          "",
          "PLR, MRR, RR, commercial use, personal use, and affiliate rights are NOT interchangeable.",
          "Read the actual licensing terms whenever possible.",
          "Do not assume that buying or downloading a product grants resale rights.",
          "",
          "USE LIVE WEB SEARCH.",
          "Do not rely on model memory for current licensing, pricing, availability, or restrictions.",
          "",
          "SOURCE PRIORITY:",
          "1. Exact product sales page and exact license.",
          "2. Official seller/provider license, terms, FAQ, help, or legal pages.",
          "3. Legitimate marketplace page hosting the exact product.",
          "4. Reputable independent sources for demand, quality, reputation, and competition.",
          "",
          "VERIFY FOR EACH CANDIDATE:",
          "- exact product and seller",
          "- legitimate source",
          "- current product availability",
          "- exact license type",
          "- resale to end customers",
          "- rebranding rights",
          "- modification rights",
          "- transferable resale rights",
          "- acquisition/license cost",
          "- recurring costs",
          "- resale-price restrictions",
          "- marketplace restrictions",
          "- advertising restrictions",
          "- bundling restrictions",
          "- giveaway restrictions",
          "- geographic restrictions",
          "- current demand",
          "- product quality and freshness",
          "- competition and saturation",
          "- margin evidence",
          "- faceless marketing suitability",
          "- promotional asset restrictions",
          "",
          "If the license is missing, vague, contradictory, or cannot be tied to the exact product, leave resale rights unresolved.",
          "Reject pirated, stolen, counterfeit, deceptive, or unauthorized products.",
          "Do not promise profit.",
          "Do not claim exact sales volume unless reliable evidence supports it.",
          "",
          "READY FOR TESTING requires:",
          "- legitimate source",
          "- explicit end-customer resale rights",
          "- understood acquisition cost",
          "- understood pricing/resale restrictions",
          "- meaningful demand evidence",
          "- no unresolved licensing issue",
          "- no restriction that makes the planned sale impractical",
          "- reasonable original faceless marketing path",
          "",
          "verificationStatus meanings:",
          "verified = enough core evidence exists to authorize a small test.",
          "partially_verified = promising but important facts remain unresolved.",
          "unverified = reliable evidence is insufficient.",
          "rejected = KWEVORA should not pursue this exact product.",
          "",
          "When prior unresolved facts are supplied, actively search for those exact facts.",
          "If sources conflict, report the conflict and leave the fact unresolved.",
          "Do not lower standards merely because the product looks popular.",
          "Return only the required JSON.",
        ].join("\n"),

        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "KWEVORA MONEY MODE — RESELLABLE DIGITAL PRODUCT VERIFICATION",
                  "",
                  candidateText,
                  "",
                  `SPECIAL VERIFICATION FOCUS: ${
                    focus ||
                    "Resolve every material fact needed to determine whether KWEVORA can legally and practically resell the exact product."
                  }`,
                  "",
                  "Verify the right to resell first.",
                ].join("\n"),
              },
            ],
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name:
              "kwevora_resellable_digital_product_verification",
            strict: true,

            schema: {
              type: "object",
              additionalProperties: false,

              properties: {
                summary: {
                  type: "string",
                },

                strongestVerifiedCandidate: {
                  type: "string",
                },

                candidates: {
                  type: "array",

                  items: {
                    type: "object",
                    additionalProperties: false,

                    properties: {
                      productName: {
                        type: "string",
                      },

                      brand: {
                        type: "string",
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

                      source: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          seller: {
                            type: "string",
                          },
                          productUrl: {
                            type: "string",
                          },
                          sourceReputation: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "seller",
                          "productUrl",
                          "sourceReputation",
                        ],
                      },

                      license: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          licenseType: {
                            type: "string",
                          },
                          licenseUrl: {
                            type: "string",
                          },
                          resaleToEndCustomers: {
                            type: "boolean",
                          },
                          rebrandingAllowed: {
                            type: "boolean",
                          },
                          modificationAllowed: {
                            type: "boolean",
                          },
                          transferableResaleRights: {
                            type: "boolean",
                          },
                          details: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "licenseType",
                          "licenseUrl",
                          "resaleToEndCustomers",
                          "rebrandingAllowed",
                          "modificationAllowed",
                          "transferableResaleRights",
                          "details",
                        ],
                      },

                      acquisition: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          cost: {
                            type: "string",
                          },
                          recurringFees: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "cost",
                          "recurringFees",
                        ],
                      },

                      resale: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          permittedPrice: {
                            type: "string",
                          },
                          minimumPrice: {
                            type: "string",
                          },
                          suggestedPrice: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "permittedPrice",
                          "minimumPrice",
                          "suggestedPrice",
                        ],
                      },

                      margin: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          details: {
                            type: "string",
                          },
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                        },
                        required: [
                          "verified",
                          "details",
                          "score",
                        ],
                      },

                      demand: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                          evidence: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          details: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "score",
                          "evidence",
                          "details",
                        ],
                      },

                      quality: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                          details: {
                            type: "string",
                          },
                          freshnessConcerns: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "score",
                          "details",
                          "freshnessConcerns",
                        ],
                      },

                      competition: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                          saturationRisk: {
                            type: "string",
                          },
                          details: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "score",
                          "saturationRisk",
                          "details",
                        ],
                      },

                      restrictions: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      requirements: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          marketplaceRestrictions: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          advertisingRestrictions: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          bundlingRestrictions: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          giveawayRestrictions: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          geographicRestrictions: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "marketplaceRestrictions",
                          "advertisingRestrictions",
                          "bundlingRestrictions",
                          "giveawayRestrictions",
                          "geographicRestrictions",
                        ],
                      },

                      pricing: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          verified: {
                            type: "boolean",
                          },
                          details: {
                            type: "string",
                          },
                        },
                        required: [
                          "verified",
                          "details",
                        ],
                      },

                      facelessMarketing: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          suitable: {
                            type: "boolean",
                          },
                          score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                          },
                          reason: {
                            type: "string",
                          },
                          legalAssetNotes: {
                            type: "string",
                          },
                          contentAngles: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                        },
                        required: [
                          "suitable",
                          "score",
                          "reason",
                          "legalAssetNotes",
                          "contentAngles",
                        ],
                      },

                      monetizationConfidence: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },

                      verifiedFacts: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      unresolvedFacts: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      warnings: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      readyForTesting: {
                        type: "boolean",
                      },

                      nextAction: {
                        type: "string",
                      },
                    },

                    required: [
                      "productName",
                      "brand",
                      "verificationStatus",
                      "source",
                      "license",
                      "acquisition",
                      "resale",
                      "margin",
                      "demand",
                      "quality",
                      "competition",
                      "restrictions",
                      "requirements",
                      "pricing",
                      "facelessMarketing",
                      "monetizationConfidence",
                      "verifiedFacts",
                      "unresolvedFacts",
                      "warnings",
                      "readyForTesting",
                      "nextAction",
                    ],
                  },
                },
              },

              required: [
                "summary",
                "strongestVerifiedCandidate",
                "candidates",
              ],
            },
          },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not complete resellable digital product verification."
    );
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error(
      "KAI completed verification but returned no readable report."
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error(
      "KAI returned verification results that KWEVORA could not read."
    );
  }

  /*
   * Explicitly type the mapped array so
   * TypeScript knows every item is a
   * VerifiedCandidate. This also fixes the
   * filter/sort inference errors.
   */
  const verifiedCandidates: VerifiedCandidate[] =
    Array.isArray(parsed?.candidates)
      ? parsed.candidates.map(
          (candidate: unknown) =>
            normalizeCandidate(candidate)
        )
      : [];

  const actuallyReady: VerifiedCandidate[] =
    verifiedCandidates
      .filter(
        (candidate: VerifiedCandidate) =>
          candidate.readyForTesting === true &&
          candidate.verificationStatus === "verified" &&
          candidate.license.verified === true &&
          candidate.license.resaleToEndCustomers === true
      )
      .sort(
        (
          a: VerifiedCandidate,
          b: VerifiedCandidate
        ) =>
          b.monetizationConfidence -
          a.monetizationConfidence
      );

  const strongestVerifiedCandidate =
    actuallyReady.length > 0
      ? actuallyReady[0].productName
      : "";

  return {
    report: {
      verifiedAt: new Date().toISOString(),
      verificationRound,
      mode: "KWEVORA_MONEY_MODE",
      capability:
        "RESELLABLE_DIGITAL_PRODUCT_VERIFICATION",
      businessModel:
        "existing_resellable_digital_products",
      candidates: verifiedCandidates,
      strongestVerifiedCandidate,
      summary: cleanString(parsed?.summary),
    } satisfies VerificationReport,

    sources: extractSources(data),
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "KWEVORA_MONEY_MODE",
    capability:
      "RESELLABLE_DIGITAL_PRODUCT_VERIFICATION",
    businessModel:
      "existing_resellable_digital_products",
    status: "ready",
    automaticReverification: true,
    hardGate:
      "The exact product must have reliable evidence permitting resale to end customers before KWEVORA can authorize a sales test.",
    mission:
      "Verify the product, seller, resale license, demand, economics, quality, restrictions, and marketing viability before KWEVORA commits to selling it.",
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as VerifyRequest;

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

    const verificationRound =
      cleanRound(
        body.verificationRound
      );

    const focus =
      cleanString(body.focus);

    const candidates: CandidateInput[] =
      Array.isArray(body.candidates)
        ? body.candidates
            .filter(
              (
                candidate: CandidateInput
              ) =>
                Boolean(
                  cleanString(
                    candidate.productName
                  ) ||
                    cleanString(
                      candidate.brand
                    ) ||
                    cleanString(
                      candidate.seller
                    )
                )
            )
            .slice(0, 3)
        : [];

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "KAI needs at least one digital-product finalist to verify.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await deeplyVerify({
        apiKey,
        candidates,
        verificationRound,
        focus,
      });

    return NextResponse.json({
      success: true,
      ...result.report,
      sourceCount:
        result.sources.length,
      sources: result.sources,
    });
  } catch (error) {
    console.error(
      "KWEVORA resellable digital product verification failed:",
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
            : "KAI could not verify the digital-product finalists.",
      },
      {
        status: 500,
      }
    );
  }
}