import "server-only";

import {
  BusinessGoal,
  KaiDecision,
  KaiDecisionInput,
  runKaiDecisionEngine,
} from "./kaiDecisionEngine";

import {
  KaiMission,
  buildKaiMission,
  summarizeMission,
} from "./kaiMissionEngine";

import {
  KaiMemory,
  KaiMemoryItem,
} from "./kaiMemory";

import {
  loadKaiMemory,
} from "./kaiMemoryStore";

export interface KaiDailyMissionResult {
  mission: KaiMission;
  decision: KaiDecision;
  memory: KaiMemory;
  missionSummary: string;
  memorySummary: string[];
  generatedAt: string;
}

function normalizeText(
  value: string | undefined,
): string {
  return value?.trim() ?? "";
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findMemoryItemByIds(
  memory: KaiMemory,
  ids: string[],
): KaiMemoryItem | undefined {
  const normalizedIds = ids.map(
    normalizeSearchText,
  );

  return memory.items.find((item) =>
    normalizedIds.includes(
      normalizeSearchText(item.id),
    ),
  );
}

function findMemoryItemByTitles(
  memory: KaiMemory,
  titles: string[],
): KaiMemoryItem | undefined {
  const normalizedTitles = titles.map(
    normalizeSearchText,
  );

  return memory.items.find((item) =>
    normalizedTitles.includes(
      normalizeSearchText(item.title),
    ),
  );
}

function findMemoryItem(
  memory: KaiMemory,
  ids: string[],
  titles: string[] = [],
): KaiMemoryItem | undefined {
  return (
    findMemoryItemByIds(memory, ids) ??
    findMemoryItemByTitles(memory, titles)
  );
}

function findMemoryValue(
  memory: KaiMemory,
  ids: string[],
  titles: string[] = [],
): string | undefined {
  const item = findMemoryItem(
    memory,
    ids,
    titles,
  );

  const value = normalizeText(item?.value);

  return value || undefined;
}

function findMemoryValuesByKeywords(
  memory: KaiMemory,
  keywords: string[],
  limit = 10,
): string[] {
  const normalizedKeywords = keywords.map(
    normalizeSearchText,
  );

  const matches = memory.items
    .filter((item) => {
      const searchableText =
        normalizeSearchText(
          [
            item.id,
            item.title,
            item.value,
            item.source,
            item.category,
          ].join(" "),
        );

      return normalizedKeywords.some(
        (keyword) =>
          searchableText.includes(keyword),
      );
    })
    .sort(
      (a, b) =>
        memoryImportanceScore(b) -
        memoryImportanceScore(a),
    )
    .map((item) => normalizeText(item.value))
    .filter(Boolean);

  return Array.from(
    new Set(matches),
  ).slice(0, Math.max(1, limit));
}

function splitMemoryList(
  value: string | undefined,
): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(
          /\r?\n|,|;|\||•|·/,
        )
        .map((item) =>
          item
            .replace(/^[-*]\s*/, "")
            .trim(),
        )
        .filter(Boolean),
    ),
  );
}

function mergeStringLists(
  ...lists: Array<
    string[] | undefined
  >
): string[] {
  return Array.from(
    new Set(
      lists
        .flatMap((list) => list ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseBooleanValue(
  value: string | undefined,
): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized =
    normalizeSearchText(value);

  const trueValues = [
    "true",
    "yes",
    "y",
    "needed",
    "high",
    "urgent",
    "active",
    "enabled",
  ];

  const falseValues = [
    "false",
    "no",
    "n",
    "not needed",
    "low",
    "inactive",
    "disabled",
  ];

  if (
    trueValues.some(
      (candidate) =>
        normalized === candidate ||
        normalized.startsWith(
          `${candidate} `,
        ),
    )
  ) {
    return true;
  }

  if (
    falseValues.some(
      (candidate) =>
        normalized === candidate ||
        normalized.startsWith(
          `${candidate} `,
        ),
    )
  ) {
    return false;
  }

  return undefined;
}

function parseNumberValue(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const match = value
    .replace(/[$,%]/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, parsed);
}

function parseBusinessGoal(
  value: string | undefined,
): BusinessGoal | undefined {
  if (!value) {
    return undefined;
  }

  const normalized =
    normalizeSearchText(value);

  if (
    normalized.includes("revenue") ||
    normalized.includes("income") ||
    normalized.includes("money")
  ) {
    return "Revenue";
  }

  if (
    normalized.includes("sale") ||
    normalized.includes("conversion")
  ) {
    return "Sales";
  }

  if (
    normalized.includes("audience") ||
    normalized.includes("follower") ||
    normalized.includes("reach") ||
    normalized.includes("view")
  ) {
    return "Audience";
  }

  if (
    normalized.includes("content") ||
    normalized.includes("video") ||
    normalized.includes("post")
  ) {
    return "Content";
  }

  if (
    normalized.includes("product") ||
    normalized.includes("offer")
  ) {
    return "Product";
  }

  if (
    normalized.includes("workload") ||
    normalized.includes("time") ||
    normalized.includes("automation")
  ) {
    return "Workload";
  }

  if (
    normalized.includes("learn") ||
    normalized.includes("intelligence") ||
    normalized.includes("improve kai")
  ) {
    return "Learning";
  }

  return undefined;
}

function getOwnerName(
  memory: KaiMemory,
): string {
  return (
    findMemoryValue(
      memory,
      [
        "owner-name",
        "owner",
      ],
      [
        "Owner Name",
        "Owner",
      ],
    ) ?? "Kent"
  );
}

function getBusinessName(
  memory: KaiMemory,
): string {
  return (
    findMemoryValue(
      memory,
      [
        "business-name",
        "business",
      ],
      [
        "Business Name",
        "Business",
      ],
    ) ?? "KWEVORA"
  );
}

function getPrimaryGoal(
  memory: KaiMemory,
): BusinessGoal | undefined {
  const explicitGoal =
    findMemoryValue(
      memory,
      [
        "primary-goal",
        "business-goal",
        "current-goal",
        "main-goal",
      ],
      [
        "Primary Goal",
        "Business Goal",
        "Current Goal",
        "Main Goal",
      ],
    );

  const parsedExplicitGoal =
    parseBusinessGoal(explicitGoal);

  if (parsedExplicitGoal) {
    return parsedExplicitGoal;
  }

  const goalMemories =
    findMemoryValuesByKeywords(
      memory,
      [
        "goal",
        "priority",
        "income",
        "revenue",
        "sales",
        "audience",
      ],
      5,
    );

  for (const value of goalMemories) {
    const parsed =
      parseBusinessGoal(value);

    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function getCurrentGoals(
  memory: KaiMemory,
): string[] {
  const explicitGoals =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "current-goals",
          "business-goals",
          "goals",
        ],
        [
          "Current Goals",
          "Business Goals",
          "Goals",
        ],
      ),
    );

  const discoveredGoals =
    findMemoryValuesByKeywords(
      memory,
      [
        "goal",
        "priority",
        "mission",
        "objective",
      ],
      8,
    );

  return mergeStringLists(
    explicitGoals,
    discoveredGoals,
  ).slice(0, 10);
}

function getProducts(
  memory: KaiMemory,
): string[] {
  const explicitProducts =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "products",
          "current-products",
          "product-list",
        ],
        [
          "Products",
          "Current Products",
          "Product List",
        ],
      ),
    );

  const discoveredProducts =
    findMemoryValuesByKeywords(
      memory,
      [
        "product",
        "digital product",
        "guide",
        "course",
        "download",
      ],
      8,
    );

  return mergeStringLists(
    explicitProducts,
    discoveredProducts,
  ).slice(0, 10);
}

function getOffers(
  memory: KaiMemory,
): string[] {
  const explicitOffers =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "offers",
          "current-offers",
          "offer-list",
          "destination-links",
        ],
        [
          "Offers",
          "Current Offers",
          "Offer List",
          "Destination Links",
        ],
      ),
    );

  const discoveredOffers =
    findMemoryValuesByKeywords(
      memory,
      [
        "offer",
        "stan store",
        "free guide",
        "landing page",
        "product link",
      ],
      8,
    );

  return mergeStringLists(
    explicitOffers,
    discoveredOffers,
  ).slice(0, 10);
}

function getTargetAudience(
  memory: KaiMemory,
): string[] {
  const explicitAudience =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "target-audience",
          "audience",
          "ideal-customer",
          "ideal-customer-profile",
        ],
        [
          "Target Audience",
          "Audience",
          "Ideal Customer",
          "Ideal Customer Profile",
        ],
      ),
    );

  const discoveredAudience =
    findMemoryValuesByKeywords(
      memory,
      [
        "audience",
        "customer",
        "people who",
        "ideal buyer",
      ],
      8,
    );

  return mergeStringLists(
    explicitAudience,
    discoveredAudience,
  ).slice(0, 10);
}

function getOwnerPreferences(
  memory: KaiMemory,
): string[] {
  const explicitPreferences =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "owner-preferences",
          "preferences",
          "content-preferences",
          "kai-preferences",
        ],
        [
          "Owner Preferences",
          "Preferences",
          "Content Preferences",
          "KAI Preferences",
        ],
      ),
    );

  const discoveredPreferences =
    findMemoryValuesByKeywords(
      memory,
      [
        "preference",
        "prefers",
        "likes",
        "does not like",
        "avoid",
        "tone",
        "style",
      ],
      10,
    );

  return mergeStringLists(
    explicitPreferences,
    discoveredPreferences,
  ).slice(0, 12);
}

function getConnectedPlatforms(
  memory: KaiMemory,
): string[] {
  const explicitPlatforms =
    splitMemoryList(
      findMemoryValue(
        memory,
        [
          "connected-platforms",
          "platforms",
          "social-platforms",
        ],
        [
          "Connected Platforms",
          "Platforms",
          "Social Platforms",
        ],
      ),
    );

  const discoveredPlatforms =
    findMemoryValuesByKeywords(
      memory,
      [
        "tiktok",
        "youtube",
        "instagram",
        "facebook",
        "linkedin",
        "pinterest",
        "x.com",
        "twitter",
      ],
      10,
    );

  const knownPlatformNames = [
    "TikTok",
    "YouTube",
    "Instagram",
    "Facebook",
    "LinkedIn",
    "Pinterest",
    "X",
    "Twitter",
  ];

  const extractedPlatforms =
    discoveredPlatforms.flatMap(
      (value) => {
        const normalized =
          normalizeSearchText(value);

        return knownPlatformNames.filter(
          (platform) =>
            normalized.includes(
              normalizeSearchText(platform),
            ),
        );
      },
    );

  return mergeStringLists(
    explicitPlatforms,
    extractedPlatforms,
  ).slice(0, 10);
}

function getMemoryBoolean(
  memory: KaiMemory,
  ids: string[],
  titles: string[],
): boolean | undefined {
  return parseBooleanValue(
    findMemoryValue(
      memory,
      ids,
      titles,
    ),
  );
}

function getMemoryNumber(
  memory: KaiMemory,
  ids: string[],
  titles: string[],
): number | undefined {
  return parseNumberValue(
    findMemoryValue(
      memory,
      ids,
      titles,
    ),
  );
}

function memoryImportanceScore(
  item: KaiMemoryItem,
): number {
  const importanceScore = {
    low: 1,
    medium: 2,
    high: 3,
  }[item.importance];

  return (
    importanceScore * 100 +
    item.confidence
  );
}

function getStrongestMemoryItems(
  memory: KaiMemory,
  limit = 5,
): KaiMemoryItem[] {
  return [...memory.items]
    .sort(
      (a, b) =>
        memoryImportanceScore(b) -
        memoryImportanceScore(a),
    )
    .slice(
      0,
      Math.max(1, limit),
    );
}

function buildMemorySummary(
  memory: KaiMemory,
): string[] {
  return getStrongestMemoryItems(
    memory,
    5,
  ).map(
    (item) =>
      `${item.title}: ${item.value}`,
  );
}

function getPreviousDecisionMemories(
  memory: KaiMemory,
): string[] {
  return memory.items
    .filter((item) => {
      const source =
        item.source.toLowerCase();

      const title =
        item.title.toLowerCase();

      return (
        item.category === "learning" &&
        (
          source.includes("approval") ||
          source.includes("decision") ||
          title.includes("decision") ||
          title.includes("approved") ||
          title.includes("rejected") ||
          title.includes("preference")
        )
      );
    })
    .sort(
      (a, b) =>
        new Date(
          b.updatedAt,
        ).getTime() -
        new Date(
          a.updatedAt,
        ).getTime(),
    )
    .slice(0, 8)
    .map((item) =>
      item.value.trim(),
    )
    .filter(Boolean);
}

function mergePreviousDecisions(
  inputDecisions:
    | string[]
    | undefined,
  memoryDecisions: string[],
): string[] {
  return mergeStringLists(
    inputDecisions,
    memoryDecisions,
  ).slice(0, 10);
}

function buildDecisionInput(
  input: KaiDecisionInput,
  memory: KaiMemory,
): KaiDecisionInput {
  const ownerName =
    input.ownerName?.trim() ||
    getOwnerName(memory);

  const businessName =
    input.businessName?.trim() ||
    getBusinessName(memory);

  const previousDecisions =
    mergePreviousDecisions(
      input.previousDecisions,
      getPreviousDecisionMemories(
        memory,
      ),
    );

  const primaryGoal =
    input.primaryGoal ??
    getPrimaryGoal(memory);

  const currentGoals =
    mergeStringLists(
      input.currentGoals,
      getCurrentGoals(memory),
    ).slice(0, 10);

  const products =
    mergeStringLists(
      input.products,
      getProducts(memory),
    ).slice(0, 10);

  const offers =
    mergeStringLists(
      input.offers,
      getOffers(memory),
    ).slice(0, 10);

  const targetAudience =
    mergeStringLists(
      input.targetAudience,
      getTargetAudience(memory),
    ).slice(0, 10);

  const ownerPreferences =
    mergeStringLists(
      input.ownerPreferences,
      getOwnerPreferences(memory),
    ).slice(0, 12);

  const connectedPlatforms =
    mergeStringLists(
      input.connectedPlatforms,
      getConnectedPlatforms(memory),
    ).slice(0, 10);

  const revenueNeeded =
    input.revenueNeeded ??
    getMemoryBoolean(
      memory,
      [
        "revenue-needed",
        "income-needed",
        "needs-income",
      ],
      [
        "Revenue Needed",
        "Income Needed",
        "Needs Income",
      ],
    ) ??
    (
      primaryGoal === "Revenue" ||
      primaryGoal === "Sales"
    );

  const audienceGrowthNeeded =
    input.audienceGrowthNeeded ??
    getMemoryBoolean(
      memory,
      [
        "audience-growth-needed",
        "needs-audience-growth",
        "grow-audience",
      ],
      [
        "Audience Growth Needed",
        "Needs Audience Growth",
        "Grow Audience",
      ],
    ) ??
    primaryGoal === "Audience";

  const productNeedsImprovement =
    input.productNeedsImprovement ??
    getMemoryBoolean(
      memory,
      [
        "product-needs-improvement",
        "offer-needs-improvement",
        "improve-product",
      ],
      [
        "Product Needs Improvement",
        "Offer Needs Improvement",
        "Improve Product",
      ],
    ) ??
    primaryGoal === "Product";

  const ownerWorkloadHigh =
    input.ownerWorkloadHigh ??
    getMemoryBoolean(
      memory,
      [
        "owner-workload-high",
        "workload-high",
        "reduce-workload",
      ],
      [
        "Owner Workload High",
        "Workload High",
        "Reduce Workload",
      ],
    ) ??
    primaryGoal === "Workload";

  return {
    ...input,

    ownerName,
    businessName,

    primaryGoal,
    currentGoals,
    products,
    offers,
    targetAudience,
    ownerPreferences,
    connectedPlatforms,

    previousDecisions,

    revenueNeeded,
    audienceGrowthNeeded,
    productNeedsImprovement,
    ownerWorkloadHigh,

    pendingApprovals:
      input.pendingApprovals ??
      getMemoryNumber(
        memory,
        [
          "pending-approvals",
          "approval-count",
        ],
        [
          "Pending Approvals",
          "Approval Count",
        ],
      ),

    videosReady:
      input.videosReady ??
      getMemoryNumber(
        memory,
        [
          "videos-ready",
          "ready-videos",
        ],
        [
          "Videos Ready",
          "Ready Videos",
        ],
      ),

    contentReady:
      input.contentReady ??
      getMemoryNumber(
        memory,
        [
          "content-ready",
          "content-packages-ready",
        ],
        [
          "Content Ready",
          "Content Packages Ready",
        ],
      ),

    publishingReady:
      input.publishingReady ??
      getMemoryNumber(
        memory,
        [
          "publishing-ready",
          "ready-to-publish",
        ],
        [
          "Publishing Ready",
          "Ready To Publish",
        ],
      ),

    recentViews:
      input.recentViews ??
      getMemoryNumber(
        memory,
        [
          "recent-views",
          "views",
        ],
        [
          "Recent Views",
          "Views",
        ],
      ),

    recentClicks:
      input.recentClicks ??
      getMemoryNumber(
        memory,
        [
          "recent-clicks",
          "clicks",
        ],
        [
          "Recent Clicks",
          "Clicks",
        ],
      ),

    recentSales:
      input.recentSales ??
      getMemoryNumber(
        memory,
        [
          "recent-sales",
          "sales",
        ],
        [
          "Recent Sales",
          "Sales",
        ],
      ),

    recentRevenue:
      input.recentRevenue ??
      getMemoryNumber(
        memory,
        [
          "recent-revenue",
          "revenue",
          "income",
        ],
        [
          "Recent Revenue",
          "Revenue",
          "Income",
        ],
      ),
  };
}

export async function createKaiDailyMission(
  input: KaiDecisionInput = {},
): Promise<KaiDailyMissionResult> {
  const memory =
    await loadKaiMemory();

  const decisionInput =
    buildDecisionInput(
      input,
      memory,
    );

  const decision =
    runKaiDecisionEngine(
      decisionInput,
    );

  const mission =
    buildKaiMission(
      decision,
      memory,
    );

  return {
    mission,
    decision,
    memory,

    missionSummary:
      summarizeMission(mission),

    memorySummary:
      buildMemorySummary(memory),

    generatedAt:
      new Date().toISOString(),
  };
}