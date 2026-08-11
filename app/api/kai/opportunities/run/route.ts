import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoneyModeRequest = {
  niche?: string;
  audience?: string;
  goal?: string;
  notes?: string;
  previouslyRejected?: string[];
};

type LicenseType =
  | "mrr"
  | "plr"
  | "resell_rights"
  | "commercial_resale"
  | "other"
  | "unknown";

type Opportunity = {
  rank?: number;
  productName?: string;
  brand?: string;
  category?: string;
  opportunityType?: string;
  whatItIs?: string;
  whyItIsInteresting?: string;

  targetAudience?: string;
  audienceProblem?: string;
  buyingReason?: string;

  demandEvidence?: string[];
  competitionEvidence?: string[];
  qualityEvidence?: string[];
  verificationGaps?: string[];
  riskFactors?: string[];

  source?: {
    sellerName?: string;
    marketplace?: string;
    productUrl?: string;
    sourceReputation?: string;
  };

  license?: {
    type?: LicenseType;
    licenseUrl?: string;
    licenseEvidence?: string[];
    resaleToEndCustomersAllowed?: boolean;
    resaleRightsVerified?: boolean;
    rebrandingAllowed?: boolean;
    modificationAllowed?: boolean;
    passResaleRightsAllowed?: boolean;
    giveawayAllowed?: boolean;
    bundlingAllowed?: boolean;
    marketplaceRestrictions?: string;
    advertisingRestrictions?: string;
    minimumPriceRule?: string;
    otherRestrictions?: string[];
  };

  economics?: {
    acquisitionCost?: string;
    acquisitionCostVerified?: boolean;
    resalePrice?: string;
    resalePriceVerified?: boolean;
    estimatedMargin?: string;
    recurringCost?: string;
  };

  productQuality?: {
    score?: number;
    reason?: string;
    freshness?: string;
    professionalism?: string;
    completeness?: string;
    customerFeedback?: string;
  };

  saturation?: {
    score?: number;
    reason?: string;
    identicalCopyRisk?: string;
    differentiationIdeas?: string[];
  };

  facelessVideoFit?: {
    score?: number;
    reason?: string;
    demoPossible?: boolean;
    productVisualsAvailable?: boolean;
    contentAngles?: string[];
  };

  verificationStatus?: string;

  scores?: {
    demand?: number;
    resaleRights?: number;
    marginPotential?: number;
    productQuality?: number;
    contentPotential?: number;
    competition?: number;
    audienceFit?: number;
    startupEase?: number;
    speedToLaunch?: number;
    verificationConfidence?: number;
    overall?: number;
  };

  stanStorePlan?: {
    shouldUseStanStore?: boolean;
    productTitle?: string;
    productDescription?: string;
    suggestedPrice?: string;
    callToAction?: string;
    deliveryStrategy?: string;
    setupInstructions?: string[];
  };

  marketingPlan?: {
    primaryAngle?: string;
    hookIdeas?: string[];
    contentIdeas?: string[];
    recommendedPlatforms?: string[];
    callToAction?: string;
  };

  firstMoneyTest?: {
    objective?: string;
    contentCount?: number;
    testPeriod?: string;
    successSignal?: string;
    stopSignal?: string;
  };

  nextMove?: string;
};

type VerificationCandidateInput = {
  productName: string;
  brand: string;
  opportunityType: string;
  whatItIs: string;
  sourceUrl: string;
  seller: string;
  licenseType: string;
  licenseUrl: string;
  acquisitionCost: string;
  resalePrice: string;
  unresolvedFacts?: string[];
};

type HuntAttempt = {
  attempt: number;
  strategy: string;
  opportunityCount: number;
  finalists: string[];
  verificationRounds: number;
  result: "verified" | "blocked" | "no_opportunities";
  rejected: string[];
};

const MAX_HUNT_ATTEMPTS = 3;

const MONEY_HUNT_STATE_VERSION = 1;
const MONEY_HUNT_STATE_FILE = path.join(
  process.cwd(),
  ".kwevora",
  "money-hunt-state.json"
);

type PersistentMoneyHuntState = {
  version: number;
  cycleCount: number;
  consecutiveCyclesWithoutWinner: number;
  lastCycleAt: string | null;
  lastWinnerAt: string | null;
  lastWinner: string | null;
  rejectedCandidates: string[];
  recentStrategies: string[];
};

function defaultMoneyHuntState(): PersistentMoneyHuntState {
  return {
    version: MONEY_HUNT_STATE_VERSION,
    cycleCount: 0,
    consecutiveCyclesWithoutWinner: 0,
    lastCycleAt: null,
    lastWinnerAt: null,
    lastWinner: null,
    rejectedCandidates: [],
    recentStrategies: [],
  };
}

async function loadMoneyHuntState(): Promise<PersistentMoneyHuntState> {
  try {
    const raw = await fs.readFile(
      MONEY_HUNT_STATE_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    return {
      version: MONEY_HUNT_STATE_VERSION,
      cycleCount: Number(parsed?.cycleCount ?? 0),
      consecutiveCyclesWithoutWinner: Number(
        parsed?.consecutiveCyclesWithoutWinner ?? 0
      ),
      lastCycleAt:
        typeof parsed?.lastCycleAt === "string"
          ? parsed.lastCycleAt
          : null,
      lastWinnerAt:
        typeof parsed?.lastWinnerAt === "string"
          ? parsed.lastWinnerAt
          : null,
      lastWinner:
        typeof parsed?.lastWinner === "string"
          ? parsed.lastWinner
          : null,
      rejectedCandidates: cleanStringArray(
        parsed?.rejectedCandidates,
        500
      ),
      recentStrategies: cleanStringArray(
        parsed?.recentStrategies,
        25
      ),
    };
  } catch {
    return defaultMoneyHuntState();
  }
}

async function saveMoneyHuntState(
  state: PersistentMoneyHuntState
): Promise<void> {
  await fs.mkdir(
    path.dirname(MONEY_HUNT_STATE_FILE),
    { recursive: true }
  );

  await fs.writeFile(
    MONEY_HUNT_STATE_FILE,
    JSON.stringify(state, null, 2),
    "utf8"
  );
}

function buildPersistentSearchDirective(
  state: PersistentMoneyHuntState
): string {
  const misses =
    state.consecutiveCyclesWithoutWinner;

  if (misses >= 6) {
    return [
      "KWEVORA has gone multiple autonomous cycles without a verified winner.",
      "Change the search pattern substantially instead of repeating prior marketplaces, sellers, product styles, or demand pockets.",
      "Expand into fresh high-demand digital categories and prioritize products whose exact resale license is publicly inspectable before purchase.",
      "Do not lower the license, demand, quality, margin, or verification gates.",
    ].join(" ");
  }

  if (misses >= 3) {
    return [
      "Several autonomous cycles have ended without a verified winner.",
      "Broaden into new product categories, sellers, marketplaces, price points, and buyer-demand pockets.",
      "Prefer products with unusually clear resale-rights evidence and avoid repeating previously rejected candidates.",
    ].join(" ");
  }

  if (misses >= 1) {
    return [
      "The previous autonomous cycle did not produce a verified winner.",
      "Continue with fresh products and fresh evidence rather than restarting the same search.",
    ].join(" ");
  }

  return [
    "This is the first persistent autonomous search cycle.",
    "Search broadly while maintaining KWEVORA's hard verification standards.",
  ].join(" ");
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
      (item: unknown): item is string =>
        typeof item === "string"
    )
    .map((item: string) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function getBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin;
}

async function readJsonSafely(
  response: Response
): Promise<any> {
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

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function opportunityIdentity(
  opportunity: Opportunity
): string {
  const product =
    cleanString(opportunity.productName);

  const seller =
    cleanString(
      opportunity.source?.sellerName
    ) ||
    cleanString(opportunity.brand);

  if (product && seller) {
    return `${seller} — ${product}`;
  }

  return product || seller;
}

function candidateIdentity(
  candidate: any
): string {
  const product =
    cleanString(candidate?.productName);

  const brand =
    cleanString(candidate?.brand) ||
    cleanString(candidate?.source?.seller);

  if (product && brand) {
    return `${brand} — ${product}`;
  }

  return product || brand;
}

function isPreviouslyRejected(
  opportunity: Opportunity,
  rejected: Set<string>
): boolean {
  const identity = normalizeIdentity(
    opportunityIdentity(opportunity)
  );

  const product = normalizeIdentity(
    cleanString(opportunity.productName)
  );

  const seller = normalizeIdentity(
    cleanString(
      opportunity.source?.sellerName
    ) ||
      cleanString(opportunity.brand)
  );

  return (
    rejected.has(identity) ||
    (product ? rejected.has(product) : false) ||
    (seller ? rejected.has(seller) : false)
  );
}

function matchVerifiedWinner(
  candidates: any[],
  strongestName: string
): any | null {
  const target =
    normalizeIdentity(strongestName);

  const readyCandidates =
    candidates.filter(
      (candidate: any) =>
        candidate?.readyForTesting ===
          true &&
        candidate?.verificationStatus ===
          "verified" &&
        candidate?.license?.verified ===
          true &&
        candidate?.license
          ?.resaleToEndCustomers ===
          true
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
                candidate?.productName
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
              candidateIdentity(candidate)
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

  return [...readyCandidates].sort(
    (a: any, b: any) =>
      Number(
        b?.monetizationConfidence ?? 0
      ) -
      Number(
        a?.monetizationConfidence ?? 0
      )
  )[0];
}

function buildVerificationCandidates(
  opportunities: Opportunity[]
): VerificationCandidateInput[] {
  return opportunities
    .slice(0, 3)
    .map(
      (
        opportunity: Opportunity
      ): VerificationCandidateInput => ({
        productName:
          cleanString(
            opportunity.productName
          ),

        brand:
          cleanString(
            opportunity.brand
          ) ||
          cleanString(
            opportunity.source?.sellerName
          ),

        opportunityType:
          "resellable_digital_product",

        whatItIs:
          cleanString(
            opportunity.whatItIs
          ),

        sourceUrl:
          cleanString(
            opportunity.source?.productUrl
          ),

        seller:
          cleanString(
            opportunity.source?.sellerName
          ) ||
          cleanString(
            opportunity.brand
          ),

        licenseType:
          cleanString(
            opportunity.license?.type
          ),

        licenseUrl:
          cleanString(
            opportunity.license?.licenseUrl
          ),

        acquisitionCost:
          cleanString(
            opportunity.economics
              ?.acquisitionCost
          ),

        resalePrice:
          cleanString(
            opportunity.economics
              ?.resalePrice
          ),

        unresolvedFacts:
          cleanStringArray(
            opportunity.verificationGaps,
            20
          ),
      })
    );
}

function buildReverificationCandidates(
  verifiedCandidates: any[],
  scoredOpportunities: Opportunity[]
): VerificationCandidateInput[] {
  return verifiedCandidates
    .filter(
      (candidate: any) =>
        candidate?.readyForTesting !==
          true &&
        candidate?.verificationStatus !==
          "rejected"
    )
    .slice(0, 3)
    .map(
      (
        candidate: any
      ): VerificationCandidateInput => {
        const matchingOpportunity =
          scoredOpportunities.find(
            (
              opportunity: Opportunity
            ) => {
              const productMatch =
                normalizeIdentity(
                  cleanString(
                    opportunity.productName
                  )
                ) ===
                normalizeIdentity(
                  cleanString(
                    candidate?.productName
                  )
                );

              const sellerMatch =
                normalizeIdentity(
                  cleanString(
                    opportunity.source
                      ?.sellerName
                  ) ||
                    cleanString(
                      opportunity.brand
                    )
                ) ===
                normalizeIdentity(
                  cleanString(
                    candidate?.source?.seller
                  ) ||
                    cleanString(
                      candidate?.brand
                    )
                );

              return (
                productMatch ||
                sellerMatch
              );
            }
          );

        return {
          productName:
            cleanString(
              candidate?.productName
            ),

          brand:
            cleanString(
              candidate?.brand
            ) ||
            cleanString(
              candidate?.source?.seller
            ),

          opportunityType:
            "resellable_digital_product",

          whatItIs:
            cleanString(
              matchingOpportunity?.whatItIs
            ),

          sourceUrl:
            cleanString(
              candidate?.source?.productUrl
            ) ||
            cleanString(
              matchingOpportunity?.source
                ?.productUrl
            ),

          seller:
            cleanString(
              candidate?.source?.seller
            ) ||
            cleanString(
              matchingOpportunity?.source
                ?.sellerName
            ),

          licenseType:
            cleanString(
              candidate?.license?.licenseType
            ) ||
            cleanString(
              matchingOpportunity?.license
                ?.type
            ),

          licenseUrl:
            cleanString(
              candidate?.license?.licenseUrl
            ) ||
            cleanString(
              matchingOpportunity?.license
                ?.licenseUrl
            ),

          acquisitionCost:
            cleanString(
              candidate?.acquisition?.cost
            ) ||
            cleanString(
              matchingOpportunity?.economics
                ?.acquisitionCost
            ),

          resalePrice:
            cleanString(
              candidate?.resale
                ?.suggestedPrice
            ) ||
            cleanString(
              matchingOpportunity?.economics
                ?.resalePrice
            ),

          unresolvedFacts:
            cleanStringArray(
              candidate?.unresolvedFacts,
              25
            ),
        };
      }
    );
}

function buildAttemptStrategy(
  attempt: number,
  persistentDirective = ""
): string {
  if (attempt === 1) {
    return [
      "Search broadly for existing digital products with strong current buyer demand and legitimate resale licensing.",
      "Demand comes first.",
      "Prioritize low startup cost, quality products, clear resale rights, healthy margin potential, low-to-manageable saturation, and strong faceless-content potential.",
      persistentDirective,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (attempt === 2) {
    return [
      "The first resellable-product candidates failed KWEVORA's verification gate.",
      "Search for DIFFERENT products and different demand pockets.",
      "Broaden across practical digital categories such as templates, guides, business resources, creator resources, productivity tools, educational resources, planners, marketing resources, design assets, and other legitimate digital products with explicit resale rights.",
      "Do not simply return the same products or sellers again.",
      persistentDirective,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "Previous resellable digital products failed verification.",
    "Broaden substantially across legitimate MRR, PLR-with-resale-rights, Resell Rights, and other explicit commercial resale licenses.",
    "Favor products whose exact license can be inspected and verified.",
    "Prioritize real buyer demand, product quality, simple delivery, sensible pricing, manageable competition, and strong faceless marketing potential.",
    "Do not switch to affiliate marketing or require creating a large original product from scratch.",
    persistentDirective,
  ]
    .filter(Boolean)
    .join(" ");
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
}): string {
  const rejectedText =
    rejected.length > 0
      ? rejected
          .slice(-25)
          .map(
            (item: string) =>
              `- ${item}`
          )
          .join("\n")
      : "None yet.";

  return [
    originalNotes,
    "",
    `KWEVORA AUTONOMOUS RESELLABLE DIGITAL PRODUCT HUNT — ATTEMPT ${attempt}`,
    strategy,
    "",
    "HARD RULES:",
    "Do not lower verification standards merely to produce a winner.",
    "Do not treat PLR, MRR, RR, commercial use, and affiliate rights as interchangeable.",
    "Do not knowingly repeat rejected products unless genuinely new evidence materially changes their viability.",
    "No explicit legal right to resell the exact product to end customers means the product cannot pass.",
    "",
    "PREVIOUSLY REJECTED OR FAILED PRODUCTS:",
    rejectedText,
  ]
    .filter(Boolean)
    .join("\n");
}

function collectRejectedCandidates(
  candidates: any[]
): string[] {
  return candidates
    .filter(
      (candidate: any) =>
        candidate?.readyForTesting !==
        true
    )
    .map(
      (candidate: any) =>
        candidateIdentity(candidate)
    )
    .filter(Boolean);
}

function collectUnresolvedFacts(
  candidates: any[]
): string[] {
  return candidates
    .flatMap((candidate: any) => {
      const identity =
        candidateIdentity(candidate) ||
        "Unknown product";

      return cleanStringArray(
        candidate?.unresolvedFacts,
        25
      ).map(
        (fact: string) =>
          `${identity}: ${fact}`
      );
    })
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
  const response = await fetch(
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
    await readJsonSafely(response);

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        "KAI could not complete live resellable digital product research."
    );
  }

  const research =
    cleanString(data?.research);

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
  const response = await fetch(
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
    await readJsonSafely(response);

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        "KAI researched the market but could not evaluate the resellable digital products."
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
  candidates: VerificationCandidateInput[];
  verificationRound: number;
  focus: string;
}) {
  const response = await fetch(
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
    await readJsonSafely(response);

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.message ||
        `KAI could not complete resale verification round ${verificationRound}.`
    );
  }

  return data;
}

export async function GET() {
  const persistentState =
    await loadMoneyHuntState();

  return NextResponse.json({
    success: true,

    mode:
      "KWEVORA_MONEY_MODE",

    capability:
      "persistent_autonomous_resellable_digital_product_orchestrator_v5",

    businessModel:
      "existing_resellable_digital_products",

    status: "ready",

    persistentSearch: {
      enabled: true,
      cycleCount:
        persistentState.cycleCount,
      consecutiveCyclesWithoutWinner:
        persistentState.consecutiveCyclesWithoutWinner,
      lastCycleAt:
        persistentState.lastCycleAt,
      lastWinnerAt:
        persistentState.lastWinnerAt,
      lastWinner:
        persistentState.lastWinner,
      rememberedRejectedCandidates:
        persistentState.rejectedCandidates.length,
    },

    maxHuntAttempts:
      MAX_HUNT_ATTEMPTS,

    pipeline: [
      "Live buyer-demand research",
      "Find existing digital products matching demand",
      "Evaluate product quality and economics",
      "KWEVORA weighted scoring",
      "Finalist selection",
      "Exact resale-license verification",
      "Unresolved-fact investigation",
      "Hard resale-rights gate",
      "Reject weak or unclear products",
      "Broaden the search",
      "Try fresh resellable products",
      "Return verified product or continuation state",
    ],

    hardGate:
      "No reliable evidence permitting resale of the exact product to end customers means KWEVORA cannot authorize a sales test.",

    mission:
      "Keep searching for existing, high-demand, legally resellable digital products while refusing to sell products with unclear rights, weak economics, poor quality, or insufficient demand.",
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request
        .json()
        .catch(
          () => ({})
        )) as MoneyModeRequest;

    const niche =
      cleanString(body.niche);

    const audience =
      cleanString(body.audience);

    const goal =
      cleanString(body.goal) ||
      "Find a strong existing digital product with current buyer demand that can legally be purchased or licensed and resold for profit.";

    const originalNotes =
      cleanString(body.notes);

    const baseUrl =
      getBaseUrl(request);

    const persistentState =
      await loadMoneyHuntState();

    const persistentDirective =
      buildPersistentSearchDirective(
        persistentState
      );

    const rejected =
      new Set<string>();

    const rejectedDisplay =
      new Set<string>();

    for (
      const item of persistentState.rejectedCandidates
    ) {
      rejected.add(
        normalizeIdentity(item)
      );

      rejectedDisplay.add(item);
    }

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
          persistentDirective
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
       * STEP 1
       * LIVE DEMAND + PRODUCT RESEARCH
       */
      const {
        data: researchData,
        research,
      } = await researchMarket({
        baseUrl,
        niche,
        audience,
        goal,
        notes: attemptNotes,
      });

      finalResearchData =
        researchData;

      /*
       * STEP 2
       * SCORE RESELLABLE PRODUCTS
       */
      const report =
        await scoreOpportunities({
          baseUrl,
          niche,
          audience,
          goal,
          notes: attemptNotes,
          research,
        });

      finalReport = report;

      const allOpportunities:
        Opportunity[] =
        Array.isArray(
          report?.opportunities
        )
          ? report.opportunities
          : [];

      const freshOpportunities =
        allOpportunities.filter(
          (
            opportunity: Opportunity
          ) =>
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
       * STEP 3
       * VERIFICATION ROUND 1
       */
      const verification1 =
        await verifyCandidates({
          baseUrl,
          candidates: finalists,
          verificationRound: 1,
          focus:
            "Verify the exact product, legitimate seller/source, exact resale license, explicit right to resell to end customers, acquisition cost, pricing restrictions, current demand, product quality, saturation, restrictions, and faceless marketing viability. Do not authorize anything with unclear resale rights.",
        });

      totalVerificationRounds +=
        1;

      verificationRounds = 1;

      const candidates1 =
        Array.isArray(
          verification1?.candidates
        )
          ? verification1.candidates
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
       * STEP 4
       * VERIFICATION ROUND 2
       *
       * Chase the exact missing facts.
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
              verificationRound: 2,
              focus:
                "Resolve the exact unresolved facts from round 1. Search specifically for the exact license governing this product, end-customer resale permission, rebranding and modification rights, transferability of resale rights, acquisition cost, recurring fees, minimum-price rules, marketplace restrictions, advertising restrictions, bundling and giveaway rules, demand evidence, product quality/freshness, saturation, margin evidence, and promotional-asset permissions. Do not guess. If the exact right to resell remains unclear, keep the product blocked.",
            });

          totalVerificationRounds +=
            1;

          verificationRounds = 2;

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
              .map(
                (
                  candidate:
                    VerificationCandidateInput
                ) =>
                  candidate.productName ||
                  candidate.seller
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
       * THIS BATCH FAILED.
       * Remember it and keep searching.
       */
      for (
        const identity of
        rejectedThisAttempt
      ) {
        rejected.add(
          normalizeIdentity(identity)
        );

        rejectedDisplay.add(identity);
      }

      huntHistory.push({
        attempt,
        strategy,
        opportunityCount:
          freshOpportunities.length,

        finalists:
          finalists
            .map(
              (
                candidate:
                  VerificationCandidateInput
              ) =>
                candidate.productName ||
                candidate.seller
            )
            .filter(Boolean),

        verificationRounds,
        result: "blocked",
        rejected:
          rejectedThisAttempt,
      });
    }

    /*
     * FINAL HARD GATE
     *
     * The verifier already contains a
     * code-level license gate. We check
     * again here before authorizing action.
     */
    const readyToAct =
      verifiedWinner
        ?.readyForTesting ===
        true &&
      verifiedWinner
        ?.verificationStatus ===
        "verified" &&
      verifiedWinner
        ?.license?.verified ===
        true &&
      verifiedWinner
        ?.license
        ?.resaleToEndCustomers ===
        true;

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
          "Prepare the approved digital product for a small sales test."
        : "KAI has not authorized a product yet. Preserve these rejected products and continue searching for fresh, high-demand digital products with clearer resale rights during the next autonomous cycle.";

    const pipelineStatus =
      readyToAct
        ? "verified_resellable_product_ready"
        : "continue_autonomous_search";

    const cycleCompletedAt =
      new Date().toISOString();

    const winnerIdentity =
      readyToAct
        ? candidateIdentity(
            verifiedWinner
          )
        : "";

    const nextPersistentState:
      PersistentMoneyHuntState = {
        version:
          MONEY_HUNT_STATE_VERSION,

        cycleCount:
          persistentState.cycleCount + 1,

        consecutiveCyclesWithoutWinner:
          readyToAct
            ? 0
            : persistentState
                .consecutiveCyclesWithoutWinner + 1,

        lastCycleAt:
          cycleCompletedAt,

        lastWinnerAt:
          readyToAct
            ? cycleCompletedAt
            : persistentState.lastWinnerAt,

        lastWinner:
          readyToAct
            ? winnerIdentity ||
              cleanString(
                verifiedWinner?.productName
              ) ||
              cleanString(
                verifiedWinner?.brand
              )
            : persistentState.lastWinner,

        rejectedCandidates:
          Array.from(
            rejectedDisplay
          ).slice(-500),

        recentStrategies: [
          ...persistentState.recentStrategies,
          persistentDirective,
          ...huntHistory.map(
            (item: HuntAttempt) =>
              item.strategy
          ),
        ]
          .filter(Boolean)
          .slice(-25),
      };

    await saveMoneyHuntState(
      nextPersistentState
    );

    return NextResponse.json({
      success: true,

      mode:
        "KWEVORA_MONEY_MODE",

      businessModel:
        "existing_resellable_digital_products",

      runAt:
        new Date().toISOString(),

      pipelineStatus,

      autonomousSearch: {
        enabled: true,

        persistent: true,

        cycleCount:
          nextPersistentState.cycleCount,

        consecutiveCyclesWithoutWinner:
          nextPersistentState
            .consecutiveCyclesWithoutWinner,

        lastCycleAt:
          nextPersistentState.lastCycleAt,

        rememberedRejectedCandidates:
          nextPersistentState
            .rejectedCandidates.length,

        searchDirective:
          persistentDirective,

        maxAttemptsThisRun:
          MAX_HUNT_ATTEMPTS,

        attemptsCompleted:
          huntHistory.length,

        successfulAttempt,

        shouldContinue:
          !readyToAct,

        nextCycle:
          readyToAct
            ? "store_and_campaign_preparation"
            : "search_fresh_resellable_products",

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
        finalReport?.businessGoal ??
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
              "KWEVORA found a digital product with sufficient demand and verified resale rights for a small test."
            : "KWEVORA exhausted this autonomous hunt without finding a digital product strong enough to pass the resale-rights hard gate. The next autonomous cycle should continue with fresh products rather than lowering standards.",

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

      productPlan:
        readyToAct
          ? {
              source:
                verifiedWinner?.source ??
                null,

              license:
                verifiedWinner?.license ??
                null,

              acquisition:
                verifiedWinner
                  ?.acquisition ??
                null,

              resale:
                verifiedWinner?.resale ??
                null,

              margin:
                verifiedWinner?.margin ??
                null,

              demand:
                verifiedWinner?.demand ??
                null,

              quality:
                verifiedWinner?.quality ??
                null,

              competition:
                verifiedWinner
                  ?.competition ??
                null,

              facelessMarketing:
                verifiedWinner
                  ?.facelessMarketing ??
                null,

              stanStorePlan:
                finalOpportunities.find(
                  (
                    opportunity:
                      Opportunity
                  ) =>
                    normalizeIdentity(
                      cleanString(
                        opportunity.productName
                      )
                    ) ===
                    normalizeIdentity(
                      cleanString(
                        verifiedWinner
                          ?.productName
                      )
                    )
                )?.stanStorePlan ??
                null,

              marketingPlan:
                finalOpportunities.find(
                  (
                    opportunity:
                      Opportunity
                  ) =>
                    normalizeIdentity(
                      cleanString(
                        opportunity.productName
                      )
                    ) ===
                    normalizeIdentity(
                      cleanString(
                        verifiedWinner
                          ?.productName
                      )
                    )
                )?.marketingPlan ??
                null,

              firstMoneyTest:
                finalOpportunities.find(
                  (
                    opportunity:
                      Opportunity
                  ) =>
                    normalizeIdentity(
                      cleanString(
                        opportunity.productName
                      )
                    ) ===
                    normalizeIdentity(
                      cleanString(
                        verifiedWinner
                          ?.productName
                      )
                    )
                )?.firstMoneyTest ??
                null,
            }
          : null,

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
      "KWEVORA persistent autonomous resellable digital product Money Mode v5 failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        mode:
          "KWEVORA_MONEY_MODE",

        businessModel:
          "existing_resellable_digital_products",

        message:
          error instanceof Error
            ? error.message
            : "KAI could not complete the autonomous resellable digital product hunt.",
      },
      {
        status: 500,
      }
    );
  }
}