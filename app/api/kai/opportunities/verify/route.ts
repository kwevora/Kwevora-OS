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

  requirements: {
    verified: boolean;
    approvalRequirements: string[];
    trafficRequirements: string;
    geographicRestrictions: string;
  };

  restrictions: string[];

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
};

type VerificationReport = {
  verifiedAt: string;
  verificationRound: number;

  mode: "KWEVORA_MONEY_MODE";

  capability:
    "DEEP_OPPORTUNITY_VERIFICATION";

  candidates: VerifiedCandidate[];

  strongestVerifiedCandidate: string;

  summary: string;
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
  max = 20
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
    .slice(0, max);
}

function cleanRound(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(3, Math.round(number))
  );
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

function extractSources(
  data: any
): VerificationSource[] {
  const sources =
    new Map<string, VerificationSource>();

  if (!Array.isArray(data?.output)) {
    return [];
  }

  for (const item of data.output) {
    if (
      item?.type === "web_search_call" &&
      Array.isArray(item?.action?.sources)
    ) {
      for (const source of item.action.sources) {
        const url =
          cleanString(source?.url);

        if (!url) {
          continue;
        }

        sources.set(url, {
          title:
            cleanString(source?.title) ||
            url,

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
          cleanString(
            annotation
              ?.url_citation
              ?.url
          );

        if (!url) {
          continue;
        }

        const title =
          cleanString(annotation?.title) ||
          cleanString(
            annotation
              ?.url_citation
              ?.title
          ) ||
          url;

        sources.set(url, {
          title,
          url,
        });
      }
    }
  }

  return Array.from(
    sources.values()
  );
}

function normalizeCandidate(
  value: any
): VerifiedCandidate {
  const program =
    value?.program ?? {};

  const commission =
    value?.commission ?? {};

  const cookie =
    value?.cookie ?? {};

  const payout =
    value?.payout ?? {};

  const requirements =
    value?.requirements ?? {};

  const pricing =
    value?.pricing ?? {};

  const facelessMarketing =
    value?.facelessMarketing ?? {};

  const verificationStatus =
    [
      "verified",
      "partially_verified",
      "unverified",
      "rejected",
    ].includes(
      value?.verificationStatus
    )
      ? value.verificationStatus
      : "unverified";

  return {
    productName:
      cleanString(
        value?.productName
      ) ||
      "Unknown opportunity",

    brand:
      cleanString(value?.brand) ||
      "Unknown",

    verificationStatus,

    program: {
      exists:
        program?.exists === true,

      currentlyAvailable:
        program
          ?.currentlyAvailable === true,

      programName:
        cleanString(
          program?.programName
        ),

      signupUrl:
        cleanString(
          program?.signupUrl
        ),

      network:
        cleanString(
          program?.network
        ),
    },

    commission: {
      verified:
        commission?.verified === true,

      structure:
        cleanString(
          commission?.structure
        ),

      recurring:
        commission?.recurring === true,

      recurringDetails:
        cleanString(
          commission
            ?.recurringDetails
        ),
    },

    cookie: {
      verified:
        cookie?.verified === true,

      duration:
        cleanString(
          cookie?.duration
        ),
    },

    payout: {
      verified:
        payout?.verified === true,

      details:
        cleanString(
          payout?.details
        ),
    },

    requirements: {
      verified:
        requirements
          ?.verified === true,

      approvalRequirements:
        cleanStringArray(
          requirements
            ?.approvalRequirements,
          12
        ),

      trafficRequirements:
        cleanString(
          requirements
            ?.trafficRequirements
        ),

      geographicRestrictions:
        cleanString(
          requirements
            ?.geographicRestrictions
        ),
    },

    restrictions:
      cleanStringArray(
        value?.restrictions,
        15
      ),

    pricing: {
      verified:
        pricing?.verified === true,

      details:
        cleanString(
          pricing?.details
        ),
    },

    facelessMarketing: {
      suitable:
        facelessMarketing
          ?.suitable === true,

      score:
        clampScore(
          facelessMarketing?.score
        ),

      reason:
        cleanString(
          facelessMarketing?.reason
        ),

      legalAssetNotes:
        cleanString(
          facelessMarketing
            ?.legalAssetNotes
        ),

      contentAngles:
        cleanStringArray(
          facelessMarketing
            ?.contentAngles,
          10
        ),
    },

    monetizationConfidence:
      clampScore(
        value
          ?.monetizationConfidence
      ),

    verifiedFacts:
      cleanStringArray(
        value?.verifiedFacts,
        20
      ),

    unresolvedFacts:
      cleanStringArray(
        value?.unresolvedFacts,
        20
      ),

    warnings:
      cleanStringArray(
        value?.warnings,
        15
      ),

    readyForTesting:
      value?.readyForTesting ===
      true,

    nextAction:
      cleanString(
        value?.nextAction
      ),
  };
}

function buildCandidateText(
  candidates: CandidateInput[]
) {
  return candidates
    .map(
      (candidate, index) => {
        const unresolved =
          cleanStringArray(
            candidate.unresolvedFacts,
            20
          );

        return [
          `CANDIDATE ${index + 1}`,
          `Product: ${
            cleanString(
              candidate.productName
            ) || "Unknown"
          }`,
          `Brand: ${
            cleanString(
              candidate.brand
            ) || "Unknown"
          }`,
          `Opportunity type: ${
            cleanString(
              candidate.opportunityType
            ) || "Unknown"
          }`,
          `Known affiliate program: ${
            cleanString(
              candidate
                .affiliateProgramName
            ) || "Unknown"
          }`,
          `Known program URL: ${
            cleanString(
              candidate
                .affiliateProgramUrl
            ) || "Unknown"
          }`,
          `Description: ${
            cleanString(
              candidate.whatItIs
            ) || "None"
          }`,
          "",
          "FACTS STILL NEEDING VERIFICATION:",
          unresolved.length > 0
            ? unresolved
                .map(
                  (fact) => `- ${fact}`
                )
                .join("\n")
            : "- No prior unresolved facts supplied.",
        ].join("\n");
      }
    )
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
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const candidateText =
    buildCandidateText(
      candidates
    );

  const response =
    await fetch(
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
            process.env
              .KAI_RESEARCH_MODEL ||
            process.env
              .KAI_TEXT_MODEL ||
            "gpt-5-mini",

          tools: [
            {
              type: "web_search",
              search_context_size:
                "high",
            },
          ],

          tool_choice: "auto",

          instructions: [
            "You are KAI, the operating intelligence inside KWEVORA OS.",
            "Always spell KWEVORA exactly K-W-E-V-O-R-A.",
            "You are operating in KWEVORA MONEY MODE.",
            "",
            "You are performing DEEP OPPORTUNITY VERIFICATION.",
            `Verification round: ${verificationRound}.`,
            `Today is ${today}.`,
            "",
            "This verification controls whether KWEVORA is allowed to begin a real marketing campaign.",
            "Be conservative.",
            "",
            "HARD RULE:",
            "If the money path is not sufficiently verified, readyForTesting MUST be false.",
            "",
            "Your job is NOT to discover new opportunities.",
            "Investigate only the supplied finalists.",
            "",
            "USE LIVE WEB SEARCH.",
            "Do not rely on model memory for current affiliate terms.",
            "",
            "SOURCE PRIORITY:",
            "1. Official company affiliate/partner pages.",
            "2. Official affiliate-network listing for that company.",
            "3. Official company pricing, help, terms, legal, or policy pages.",
            "4. Reputable secondary sources only when official material cannot answer the question.",
            "",
            "When a prior unresolved fact is supplied, actively search for that exact fact.",
            "",
            "Do not mark commission verified unless a reliable current source establishes it.",
            "Do not mark cookie duration verified unless a reliable current source establishes it.",
            "Do not mark payout information verified unless a reliable current source establishes it.",
            "Do not mark requirements verified unless reliable current evidence supports them.",
            "",
            "If official sources intentionally do not publish a particular term, say that clearly instead of guessing.",
            "",
            "If sources conflict, report the conflict and leave the fact unresolved.",
            "",
            "Never invent affiliate terms.",
            "Never invent commission percentages.",
            "Never invent cookie windows.",
            "Never invent traffic minimums.",
            "Never invent payout thresholds.",
            "Never invent geographic availability.",
            "Never invent reseller rights.",
            "",
            "If the affiliate program is unavailable, closed, discontinued, region-restricted for the user, or otherwise impractical, mark the candidate rejected when appropriate.",
            "",
            "FACELESS MARKETING:",
            "Evaluate whether the offer can realistically be promoted with original faceless short-form marketing.",
            "Consider original screen recordings, demonstrations, tutorials, comparisons, workflows, text-led videos, original voiceover, problem-solution storytelling, and properly authorized promotional assets.",
            "Never assume copyrighted company footage can simply be copied.",
            "",
            "READY FOR TESTING requires:",
            "- a real current monetization path",
            "- the program appears currently available",
            "- enough verified terms to understand how the user gets paid",
            "- no unresolved issue that would make the campaign misleading or impractical",
            "- a reasonable marketing method for this user's faceless strategy",
            "",
            "verificationStatus meanings:",
            "verified = enough core facts are supported to safely begin a small test.",
            "partially_verified = the program is real but one or more important business facts remain unresolved.",
            "unverified = reliable evidence is insufficient.",
            "rejected = KWEVORA should not pursue the opportunity based on current evidence.",
            "",
            "Do not tell the user to create campaign content or apply to a program when readyForTesting is false.",
            "",
            "Return only the required JSON.",
          ].join("\n"),

          input: [
            {
              role: "user",

              content: [
                {
                  type:
                    "input_text",

                  text: [
                    "KWEVORA MONEY MODE — DEEP FINALIST VERIFICATION",
                    "",
                    candidateText,
                    "",
                    `SPECIAL VERIFICATION FOCUS: ${
                      focus ||
                      "Verify every unresolved money-path fact."
                    }`,
                    "",
                    "For every finalist check:",
                    "- affiliate program currently exists",
                    "- program is currently available",
                    "- official signup destination",
                    "- affiliate network",
                    "- current commission structure",
                    "- recurring commission details",
                    "- cookie duration",
                    "- payout terms",
                    "- approval requirements",
                    "- traffic requirements",
                    "- geographic restrictions",
                    "- relevant customer pricing",
                    "- marketing restrictions",
                    "- promotional asset rules",
                    "- faceless marketing suitability",
                    "- remaining unresolved facts",
                    "- whether KWEVORA may safely begin a small marketing test",
                    "",
                    "Do not choose based on hype.",
                    "Verify the money path.",
                  ].join("\n"),
                },
              ],
            },
          ],

          text: {
            format: {
              type: "json_schema",

              name:
                "kwevora_deep_opportunity_verification",

              strict: true,

              schema: {
                type: "object",

                additionalProperties:
                  false,

                properties: {
                  summary: {
                    type: "string",
                  },

                  strongestVerifiedCandidate:
                    {
                      type: "string",
                    },

                  candidates: {
                    type: "array",

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

                        verificationStatus:
                          {
                            type: "string",

                            enum: [
                              "verified",
                              "partially_verified",
                              "unverified",
                              "rejected",
                            ],
                          },

                        program: {
                          type: "object",

                          additionalProperties:
                            false,

                          properties: {
                            exists: {
                              type: "boolean",
                            },

                            currentlyAvailable:
                              {
                                type: "boolean",
                              },

                            programName: {
                              type: "string",
                            },

                            signupUrl: {
                              type: "string",
                            },

                            network: {
                              type: "string",
                            },
                          },

                          required: [
                            "exists",
                            "currentlyAvailable",
                            "programName",
                            "signupUrl",
                            "network",
                          ],
                        },

                        commission: {
                          type: "object",

                          additionalProperties:
                            false,

                          properties: {
                            verified: {
                              type: "boolean",
                            },

                            structure: {
                              type: "string",
                            },

                            recurring: {
                              type: "boolean",
                            },

                            recurringDetails:
                              {
                                type: "string",
                              },
                          },

                          required: [
                            "verified",
                            "structure",
                            "recurring",
                            "recurringDetails",
                          ],
                        },

                        cookie: {
                          type: "object",

                          additionalProperties:
                            false,

                          properties: {
                            verified: {
                              type: "boolean",
                            },

                            duration: {
                              type: "string",
                            },
                          },

                          required: [
                            "verified",
                            "duration",
                          ],
                        },

                        payout: {
                          type: "object",

                          additionalProperties:
                            false,

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

                        requirements: {
                          type: "object",

                          additionalProperties:
                            false,

                          properties: {
                            verified: {
                              type: "boolean",
                            },

                            approvalRequirements:
                              {
                                type: "array",

                                items: {
                                  type: "string",
                                },
                              },

                            trafficRequirements:
                              {
                                type: "string",
                              },

                            geographicRestrictions:
                              {
                                type: "string",
                              },
                          },

                          required: [
                            "verified",
                            "approvalRequirements",
                            "trafficRequirements",
                            "geographicRestrictions",
                          ],
                        },

                        restrictions: {
                          type: "array",

                          items: {
                            type: "string",
                          },
                        },

                        pricing: {
                          type: "object",

                          additionalProperties:
                            false,

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

                        facelessMarketing:
                          {
                            type: "object",

                            additionalProperties:
                              false,

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

                              legalAssetNotes:
                                {
                                  type: "string",
                                },

                              contentAngles:
                                {
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

                        monetizationConfidence:
                          {
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
                        "program",
                        "commission",
                        "cookie",
                        "payout",
                        "requirements",
                        "restrictions",
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

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not complete deep opportunity verification."
    );
  }

  const outputText =
    extractOutputText(data);

  if (!outputText) {
    throw new Error(
      "KAI completed verification but returned no readable report."
    );
  }

  let parsed: any;

  try {
    parsed =
      JSON.parse(outputText);
  } catch {
    throw new Error(
      "KAI returned verification results that KWEVORA could not read."
    );
  }

  const verifiedCandidates =
    Array.isArray(
      parsed?.candidates
    )
      ? parsed.candidates.map(
          normalizeCandidate
        )
      : [];

  return {
    report: {
      verifiedAt:
        new Date().toISOString(),

      verificationRound,

      mode:
        "KWEVORA_MONEY_MODE",

      capability:
        "DEEP_OPPORTUNITY_VERIFICATION",

      candidates:
        verifiedCandidates,

      strongestVerifiedCandidate:
        cleanString(
          parsed
            ?.strongestVerifiedCandidate
        ),

      summary:
        cleanString(
          parsed?.summary
        ),
    } satisfies VerificationReport,

    sources:
      extractSources(data),
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,

    mode:
      "KWEVORA_MONEY_MODE",

    capability:
      "DEEP_OPPORTUNITY_VERIFICATION",

    status: "ready",

    automaticReverification:
      true,

    mission:
      "Verify the real money path before KWEVORA commits to an opportunity.",
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

    const candidates =
      Array.isArray(
        body.candidates
      )
        ? body.candidates
            .filter(
              (candidate) =>
                cleanString(
                  candidate
                    ?.productName
                ) ||
                cleanString(
                  candidate?.brand
                )
            )
            .slice(0, 3)
        : [];

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,

          message:
            "KAI needs at least one finalist to verify.",
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

      sources:
        result.sources,
    });
  } catch (error) {
    console.error(
      "KWEVORA deep opportunity verification failed:",
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
            : "KAI could not verify the finalists.",
      },

      {
        status: 500,
      }
    );
  }
}