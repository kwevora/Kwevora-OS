import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoneyModeRequest = {
  niche?: string;
  audience?: string;
  goal?: string;
  notes?: string;

  /*
   * Used by the future overnight runner.
   * It can tell KAI what was already rejected
   * so the next hunt does not keep repeating it.
   */
  previouslyRejected?: string[];
};

type Opportunity = {
  productName?: string;
  brand?: string;
  opportunityType?: string;
  affiliateProgramName?: string;
  affiliateProgramUrl?: string;
  whatItIs?: string;
};

type HuntAttempt = {
  attempt: number;
  strategy: string;
  opportunityCount: number;
  finalists: string[];
  verificationRounds: number;
  result:
    | "verified"
    | "blocked"
    | "no_opportunities";
  rejected: string[];
};

const MAX_HUNT_ATTEMPTS = 3;

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanStringArray(
  value: unknown,
  max = 50
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

function getBaseUrl(request: NextRequest) {
  return request.nextUrl.origin;
}

async function readJsonSafely(
  response: Response
) {
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

function opportunityIdentity(
  opportunity: Opportunity
) {
  const product =
    cleanString(
      opportunity.productName
    );

  const brand =
    cleanString(
      opportunity.brand
    );

  if (product && brand) {
    return `${brand} — ${product}`;
  }

  return product || brand;
}

function candidateIdentity(
  candidate: any
) {
  const product =
    cleanString(
      candidate?.productName
    );

  const brand =
    cleanString(
      candidate?.brand
    );

  if (product && brand) {
    return `${brand} — ${product}`;
  }

  return product || brand;
}

function normalizeIdentity(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function isPreviouslyRejected(
  opportunity: Opportunity,
  rejected: Set<string>
) {
  const identity =
    normalizeIdentity(
      opportunityIdentity(
        opportunity
      )
    );

  const product =
    normalizeIdentity(
      cleanString(
        opportunity.productName
      )
    );

  const brand =
    normalizeIdentity(
      cleanString(
        opportunity.brand
      )
    );

  return (
    rejected.has(identity) ||
    (product
      ? rejected.has(product)
      : false) ||
    (brand
      ? rejected.has(brand)
      : false)
  );
}

function matchVerifiedWinner(
  candidates: any[],
  strongestName: string
) {
  const target =
    normalizeIdentity(
      strongestName
    );

  /*
   * First trust only candidates that
   * themselves passed KWEVORA's gate.
   */
  const readyCandidates =
    candidates.filter(
      (candidate: any) =>
        candidate
          ?.readyForTesting ===
          true &&
        candidate
          ?.verificationStatus ===
          "verified"
    );

  if (readyCandidates.length === 0) {
    return null;
  }

  if (target) {
    const namedWinner =
      readyCandidates.find(
        (candidate: any) => {
          const productName =
            normalizeIdentity(
              cleanString(
                candidate
                  ?.productName
              )
            );

          const brand =
            normalizeIdentity(
              cleanString(
                candidate?.brand
              )
            );

          const identity =
            normalizeIdentity(
              candidateIdentity(
                candidate
              )
            );

          return (
            productName === target ||
            brand === target ||
            identity === target
          );
        }
      );

    if (namedWinner) {
      return namedWinner;
    }
  }

  /*
   * If the model failed to name its strongest
   * verified candidate correctly, KWEVORA
   * still chooses from candidates that
   * objectively passed the gate.
   */
  return [...readyCandidates].sort(
    (a, b) =>
      Number(
        b?.monetizationConfidence ??
          0
      ) -
      Number(
        a?.monetizationConfidence ??
          0
      )
  )[0];
}

function buildVerificationCandidates(
  opportunities: Opportunity[]
) {
  return opportunities
    .slice(0, 3)
    .map((opportunity) => ({
      productName:
        cleanString(
          opportunity.productName
        ),

      brand:
        cleanString(
          opportunity.brand
        ),

      opportunityType:
        cleanString(
          opportunity
            .opportunityType
        ),

      affiliateProgramName:
        cleanString(
          opportunity
            .affiliateProgramName
        ),

      affiliateProgramUrl:
        cleanString(
          opportunity
            .affiliateProgramUrl
        ),

      whatItIs:
        cleanString(
          opportunity.whatItIs
        ),
    }));
}

function buildReverificationCandidates(
  verifiedCandidates: any[],
  scoredOpportunities: Opportunity[]
) {
  return verifiedCandidates
    .filter(
      (candidate: any) =>
        candidate
          ?.readyForTesting !==
          true &&
        candidate
          ?.verificationStatus !==
          "rejected"
    )
    .slice(0, 3)
    .map((candidate: any) => {
      const matchingOpportunity =
        scoredOpportunities.find(
          (opportunity) => {
            const productMatch =
              normalizeIdentity(
                cleanString(
                  opportunity
                    .productName
                )
              ) ===
              normalizeIdentity(
                cleanString(
                  candidate
                    ?.productName
                )
              );

            const brandMatch =
              normalizeIdentity(
                cleanString(
                  opportunity.brand
                )
              ) ===
              normalizeIdentity(
                cleanString(
                  candidate?.brand
                )
              );

            return (
              productMatch ||
              brandMatch
            );
          }
        );

      return {
        productName:
          cleanString(
            candidate
              ?.productName
          ),

        brand:
          cleanString(
            candidate?.brand
          ),

        opportunityType:
          cleanString(
            matchingOpportunity
              ?.opportunityType
          ),

        affiliateProgramName:
          cleanString(
            matchingOpportunity
              ?.affiliateProgramName
          ),

        affiliateProgramUrl:
          cleanString(
            matchingOpportunity
              ?.affiliateProgramUrl
          ),

        whatItIs:
          cleanString(
            matchingOpportunity
              ?.whatItIs
          ),

        unresolvedFacts:
          cleanStringArray(
            candidate
              ?.unresolvedFacts,
            20
          ),
      };
    });
}

function buildAttemptStrategy(
  attempt: number,
  rejected: string[]
) {
  if (attempt === 1) {
    return [
      "Search broadly for the strongest practical current revenue opportunity.",
      "Prioritize low startup cost, realistic beginner execution, strong demand, and faceless short-form marketing.",
      "Consider affiliate offers and practical digital-marketing opportunities.",
    ].join(" ");
  }

  if (attempt === 2) {
    return [
      "The first candidates failed KWEVORA's verification gate.",
      "Search for DIFFERENT opportunities.",
      "Broaden into adjacent niches, creator tools, software, subscriptions, services, ecommerce support, education, productivity, AI tools, and other legitimate offers.",
      "Do not simply return the same brands again.",
    ].join(" ");
  }

  return [
    "Previous external opportunities failed verification.",
    "Broaden the revenue search substantially.",
    "Consider affiliate marketing, owned digital products, templates, guides, small paid resources, productized services, lead-generation offers, and other low-cost legitimate online revenue models.",
    "Prefer an owned opportunity when dependence on third-party affiliate approval is preventing action.",
    "The objective is a realistic path to revenue, not merely finding an affiliate link.",
  ].join(" ");
}

function buildResearchNotes({
  originalNotes,
  strategy,
  rejected,
  attempt,
}: {
  originalNotes: string;
  strategy: string;
  rejected: string[];
  attempt: number;
}) {
  const rejectedText =
    rejected.length > 0
      ? rejected
          .slice(-20)
          .map(
            (item) => `- ${item}`
          )
          .join("\n")
      : "None yet.";

  return [
    originalNotes,
    "",
    `KWEVORA AUTONOMOUS MONEY HUNT — ATTEMPT ${attempt}`,
    strategy,
    "",
    "IMPORTANT:",
    "Do not lower verification standards just to produce a winner.",
    "Do not knowingly repeat rejected opportunities unless there is genuinely new evidence that materially changes their viability.",
    "",
    "PREVIOUSLY REJECTED OR FAILED CANDIDATES:",
    rejectedText,
  ]
    .filter(Boolean)
    .join("\n");
}

function collectRejectedCandidates(
  candidates: any[]
) {
  return candidates
    .filter(
      (candidate: any) =>
        candidate
          ?.readyForTesting !==
        true
    )
    .map(
      (candidate: any) =>
        candidateIdentity(
          candidate
        )
    )
    .filter(Boolean);
}

function collectUnresolvedFacts(
  candidates: any[]
) {
  return candidates
    .flatMap(
      (candidate: any) => {
        const identity =
          candidateIdentity(
            candidate
          ) ||
          "Unknown candidate";

        return cleanStringArray(
          candidate
            ?.unresolvedFacts,
          20
        ).map(
          (fact) =>
            `${identity}: ${fact}`
        );
      }
    )
    .filter(Boolean);
}

async function researchMarket({
  baseUrl,
  niche,
  audience,
  goal,
  notes,
}: {
  baseUrl: string;
  niche: string;
  audience: string;
  goal: string;
  notes: string;
}) {
  const response =
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

  const data =
    await readJsonSafely(
      response
    );

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        "KAI could not complete live market research."
    );
  }

  const research =
    cleanString(
      data?.research
    );

  if (!research) {
    throw new Error(
      "KAI's live research returned no usable evidence."
    );
  }

  return {
    data,
    research,
  };
}

async function scoreOpportunities({
  baseUrl,
  niche,
  audience,
  goal,
  notes,
  research,
}: {
  baseUrl: string;
  niche: string;
  audience: string;
  goal: string;
  notes: string;
  research: string;
}) {
  const response =
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

  const data =
    await readJsonSafely(
      response
    );

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        "KAI researched the market but could not evaluate the opportunities."
    );
  }

  if (!data?.report) {
    throw new Error(
      "KAI evaluated the research but returned no opportunity report."
    );
  }

  return data.report;
}

async function verifyCandidates({
  baseUrl,
  candidates,
  verificationRound,
  focus,
}: {
  baseUrl: string;
  candidates: any[];
  verificationRound: number;
  focus: string;
}) {
  const response =
    await fetch(
      `${baseUrl}/api/kai/opportunities/verify`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          candidates,
          verificationRound,
          focus,
        }),

        cache: "no-store",
      }
    );

  const data =
    await readJsonSafely(
      response
    );

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        `KAI could not complete verification round ${verificationRound}.`
    );
  }

  return data;
}

export async function GET() {
  return NextResponse.json({
    success: true,

    mode:
      "KWEVORA_MONEY_MODE",

    capability:
      "autonomous_opportunity_orchestrator_v3",

    status: "ready",

    maxHuntAttempts:
      MAX_HUNT_ATTEMPTS,

    pipeline: [
      "Live market research",
      "Opportunity evaluation",
      "KWEVORA weighted scoring",
      "Finalist selection",
      "Deep verification",
      "Unresolved-fact investigation",
      "Hard action gate",
      "Reject weak candidates",
      "Broaden the search",
      "Try fresh opportunities",
      "Expand beyond affiliate-only opportunities",
      "Return verified revenue path or continuation state",
    ],

    hardGate:
      "KWEVORA never lowers verification standards merely to produce a winner.",

    mission:
      "Keep searching intelligently for a realistic revenue opportunity while refusing to act on unverified assumptions.",
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

    const originalNotes =
      cleanString(body.notes);

    const baseUrl =
      getBaseUrl(request);

    const rejected =
      new Set<string>();

    const rejectedDisplay =
      new Set<string>();

    for (
      const item of cleanStringArray(
        body.previouslyRejected,
        50
      )
    ) {
      rejected.add(
        normalizeIdentity(item)
      );

      rejectedDisplay.add(item);
    }

    const huntHistory:
      HuntAttempt[] = [];

    let finalResearchData: any =
      null;

    let finalReport: any =
      null;

    let finalVerification: any =
      null;

    let finalCandidates: any[] =
      [];

    let finalOpportunities:
      Opportunity[] = [];

    let verifiedWinner: any =
      null;

    let verificationRounds = 0;

    let totalVerificationRounds =
      0;

    let successfulAttempt:
      number | null = null;

    for (
      let attempt = 1;
      attempt <=
      MAX_HUNT_ATTEMPTS;
      attempt++
    ) {
      const strategy =
        buildAttemptStrategy(
          attempt,
          Array.from(
            rejectedDisplay
          )
        );

      const attemptNotes =
        buildResearchNotes({
          originalNotes,
          strategy,
          rejected:
            Array.from(
              rejectedDisplay
            ),
          attempt,
        });

      /*
       * RESEARCH
       */
      const {
        data: researchData,
        research,
      } =
        await researchMarket({
          baseUrl,
          niche,
          audience,
          goal,
          notes:
            attemptNotes,
        });

      finalResearchData =
        researchData;

      /*
       * SCORE
       */
      const report =
        await scoreOpportunities({
          baseUrl,
          niche,
          audience,
          goal,
          notes:
            attemptNotes,
          research,
        });

      finalReport =
        report;

      const allOpportunities:
        Opportunity[] =
        Array.isArray(
          report?.opportunities
        )
          ? report.opportunities
          : [];

      /*
       * Remove candidates already rejected
       * during this run or supplied by the
       * future overnight runner.
       */
      const freshOpportunities =
        allOpportunities.filter(
          (opportunity) =>
            !isPreviouslyRejected(
              opportunity,
              rejected
            )
        );

      finalOpportunities =
        freshOpportunities;

      if (
        freshOpportunities.length ===
        0
      ) {
        huntHistory.push({
          attempt,
          strategy,
          opportunityCount: 0,
          finalists: [],
          verificationRounds: 0,
          result:
            "no_opportunities",
          rejected: [],
        });

        continue;
      }

      const finalists =
        buildVerificationCandidates(
          freshOpportunities
        );

      /*
       * VERIFICATION ROUND 1
       */
      const verification1 =
        await verifyCandidates({
          baseUrl,
          candidates:
            finalists,
          verificationRound:
            1,
          focus:
            "Verify the full current money path for each finalist. KWEVORA needs enough reliable evidence to decide whether a real small marketing test may begin.",
        });

      totalVerificationRounds +=
        1;

      verificationRounds = 1;

      const candidates1 =
        Array.isArray(
          verification1
            ?.candidates
        )
          ? verification1
              .candidates
          : [];

      let attemptVerification =
        verification1;

      let attemptCandidates =
        candidates1;

      let strongestName =
        cleanString(
          verification1
            ?.strongestVerifiedCandidate
        );

      let attemptWinner =
        matchVerifiedWinner(
          candidates1,
          strongestName
        );

      /*
       * VERIFICATION ROUND 2
       *
       * Chase exact unresolved facts.
       */
      if (!attemptWinner) {
        const recheckCandidates =
          buildReverificationCandidates(
            candidates1,
            freshOpportunities
          );

        if (
          recheckCandidates.length >
          0
        ) {
          const verification2 =
            await verifyCandidates({
              baseUrl,
              candidates:
                recheckCandidates,
              verificationRound:
                2,
              focus:
                "Resolve the exact unresolved facts from round 1. Search specifically for current affiliate availability, commission terms, cookie duration, payout details, approval requirements, traffic requirements, geographic eligibility, marketing restrictions, promotional asset rules, and any other fact preventing KWEVORA from safely authorizing a test. Do not guess.",
            });

          totalVerificationRounds +=
            1;

          verificationRounds =
            2;

          attemptVerification =
            verification2;

          attemptCandidates =
            Array.isArray(
              verification2
                ?.candidates
            )
              ? verification2
                  .candidates
              : [];

          strongestName =
            cleanString(
              verification2
                ?.strongestVerifiedCandidate
            );

          attemptWinner =
            matchVerifiedWinner(
              attemptCandidates,
              strongestName
            );
        }
      }

      finalVerification =
        attemptVerification;

      finalCandidates =
        attemptCandidates;

      const rejectedThisAttempt =
        collectRejectedCandidates(
          attemptCandidates
        );

      /*
       * PASS
       */
      if (attemptWinner) {
        verifiedWinner =
          attemptWinner;

        successfulAttempt =
          attempt;

        huntHistory.push({
          attempt,
          strategy,
          opportunityCount:
            freshOpportunities.length,
          finalists:
            finalists
              .map((candidate) =>
                candidateIdentity(
                  candidate
                )
              )
              .filter(Boolean),
          verificationRounds,
          result: "verified",
          rejected:
            rejectedThisAttempt,
        });

        break;
      }

      /*
       * FAIL THIS SET.
       *
       * Remember the failures and move on.
       */
      for (
        const identity of rejectedThisAttempt
      ) {
        rejected.add(
          normalizeIdentity(
            identity
          )
        );

        rejectedDisplay.add(
          identity
        );
      }

      huntHistory.push({
        attempt,
        strategy,
        opportunityCount:
          freshOpportunities.length,
        finalists:
          finalists
            .map((candidate) =>
              candidateIdentity(
                candidate
              )
            )
            .filter(Boolean),
        verificationRounds,
        result: "blocked",
        rejected:
          rejectedThisAttempt,
      });
    }

    /*
     * HARD ACTION GATE
     */
    const readyToAct =
      verifiedWinner
        ?.readyForTesting ===
        true &&
      verifiedWinner
        ?.verificationStatus ===
        "verified";

    const unresolvedFacts =
      readyToAct
        ? []
        : collectUnresolvedFacts(
            finalCandidates
          );

    const firstAction =
      readyToAct
        ? cleanString(
            verifiedWinner
              ?.nextAction
          ) ||
          "Begin the approved small money test."
        : "KAI has not authorized a campaign yet. Preserve these rejected candidates and continue the Money Hunt with fresh opportunities during the next autonomous cycle.";

    const pipelineStatus =
      readyToAct
        ? "verified_opportunity_ready"
        : "continue_autonomous_search";

    return NextResponse.json({
      success: true,

      mode:
        "KWEVORA_MONEY_MODE",

      runAt:
        new Date().toISOString(),

      pipelineStatus,

      autonomousSearch: {
        enabled: true,

        maxAttemptsThisRun:
          MAX_HUNT_ATTEMPTS,

        attemptsCompleted:
          huntHistory.length,

        successfulAttempt,

        shouldContinue:
          !readyToAct,

        nextCycle:
          readyToAct
            ? "campaign_preparation"
            : "search_fresh_opportunities",

        rejectedCandidates:
          Array.from(
            rejectedDisplay
          ),

        history:
          huntHistory,
      },

      verificationRounds:
        totalVerificationRounds,

      businessGoal:
        finalReport
          ?.businessGoal ??
        goal,

      recommendation: {
        bestOpportunity:
          readyToAct
            ? cleanString(
                verifiedWinner
                  ?.productName
              ) ||
              cleanString(
                verifiedWinner
                  ?.brand
              )
            : "",

        readyToAct,

        firstAction,

        reason:
          readyToAct
            ? cleanString(
                finalReport
                  ?.recommendation
                  ?.reason
              ) ||
              "KWEVORA found and verified a practical revenue opportunity."
            : "KWEVORA exhausted this autonomous hunt without finding a candidate strong enough to pass the hard gate. The next autonomous cycle should continue with fresh opportunities rather than lowering standards.",

        verificationStatus:
          readyToAct
            ? "verified"
            : "search_continues",

        monetizationConfidence:
          readyToAct
            ? Number(
                verifiedWinner
                  ?.monetizationConfidence ??
                  0
              )
            : 0,

        unresolvedFacts,
      },

      verifiedWinner:
        readyToAct
          ? verifiedWinner
          : null,

      finalists: {
        finalScored:
          finalOpportunities.slice(
            0,
            3
          ),

        finalVerification:
          finalCandidates,
      },

      evidence: {
        broadResearch: {
          researchedAt:
            finalResearchData
              ?.researchedAt ??
            null,

          sourceCount:
            typeof finalResearchData
              ?.sourceCount ===
            "number"
              ? finalResearchData
                  .sourceCount
              : Array.isArray(
                    finalResearchData
                      ?.sources
                  )
                ? finalResearchData
                    .sources.length
                : 0,

          sources:
            Array.isArray(
              finalResearchData
                ?.sources
            )
              ? finalResearchData
                  .sources
              : [],
        },

        verification: {
          totalRounds:
            totalVerificationRounds,

          verifiedAt:
            finalVerification
              ?.verifiedAt ??
            null,

          sourceCount:
            typeof finalVerification
              ?.sourceCount ===
            "number"
              ? finalVerification
                  .sourceCount
              : Array.isArray(
                    finalVerification
                      ?.sources
                  )
                ? finalVerification
                    .sources.length
                : 0,

          sources:
            Array.isArray(
              finalVerification
                ?.sources
            )
              ? finalVerification
                  .sources
              : [],

          summary:
            cleanString(
              finalVerification
                ?.summary
            ),
        },
      },

      researchSummary:
        finalReport
          ?.researchSummary ??
        "",

      allOpportunities:
        finalOpportunities,

      nextAction:
        firstAction,
    });
  } catch (error) {
    console.error(
      "KWEVORA autonomous Money Mode v3 run failed:",
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
            : "KAI could not complete the autonomous Money Hunt.",
      },

      {
        status: 500,
      }
    );
  }
}