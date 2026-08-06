import {
  KaiDecision,
  KaiOpportunity,
} from "./kaiDecisionEngine";

import {
  KaiMemory,
  KaiMemoryItem,
} from "./kaiMemory";

export type MissionPriority =
  | "Critical"
  | "High"
  | "Normal";

export type MissionExecutionOwner =
  | "Owner"
  | "KAI"
  | "Shared";

export interface KaiContentPackage {
  idea: string;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  destination: string;
  recommendedPlatform: string;
  publishingRecommendation: string;
  alternateHooks: string[];
}

export interface KaiMission {
  id: string;
  title: string;
  objective: string;
  reason: string;
  priority: MissionPriority;
  requiresApproval: boolean;
  executionOwner: MissionExecutionOwner;
  successMetric: string;
  tasks: string[];
  contentPackage?: KaiContentPackage;
  createdAt: string;
}

function createMissionId(): string {
  return `mission-${Date.now()}`;
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

function splitMemoryValue(
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

function findMemoryItem(
  memory: KaiMemory,
  ids: string[],
  titles: string[] = [],
): KaiMemoryItem | undefined {
  const normalizedIds =
    ids.map(normalizeSearchText);

  const normalizedTitles =
    titles.map(normalizeSearchText);

  return [...memory.items]
    .sort(
      (a, b) =>
        memoryImportanceScore(b) -
        memoryImportanceScore(a),
    )
    .find((item) => {
      const itemId =
        normalizeSearchText(item.id);

      const itemTitle =
        normalizeSearchText(item.title);

      return (
        normalizedIds.includes(itemId) ||
        normalizedTitles.includes(
          itemTitle,
        )
      );
    });
}

function findMemoryValue(
  memory: KaiMemory,
  ids: string[],
  titles: string[] = [],
): string | undefined {
  const item =
    findMemoryItem(
      memory,
      ids,
      titles,
    );

  const value =
    normalizeText(item?.value);

  return value || undefined;
}

function findMemoryValuesByKeywords(
  memory: KaiMemory,
  keywords: string[],
  limit = 8,
): string[] {
  const normalizedKeywords =
    keywords.map(normalizeSearchText);

  return [...memory.items]
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
          searchableText.includes(
            keyword,
          ),
      );
    })
    .sort(
      (a, b) =>
        memoryImportanceScore(b) -
        memoryImportanceScore(a),
    )
    .map((item) =>
      normalizeText(item.value),
    )
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.indexOf(value) === index,
    )
    .slice(
      0,
      Math.max(1, limit),
    );
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
    ) ??
    memory.items.find(
      (item) =>
        item.category === "owner",
    )?.value.trim() ??
    "Owner"
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
    ) ??
    "KWEVORA"
  );
}

function getAudience(
  memory: KaiMemory,
): string {
  const directAudience =
    findMemoryValue(
      memory,
      [
        "target-audience",
        "audience",
        "ideal-customer",
      ],
      [
        "Target Audience",
        "Audience",
        "Ideal Customer",
      ],
    );

  if (directAudience) {
    return directAudience;
  }

  const discoveredAudience =
    findMemoryValuesByKeywords(
      memory,
      [
        "audience",
        "customer",
        "people who",
        "ideal buyer",
        "paycheck",
      ],
      3,
    );

  return (
    discoveredAudience[0] ??
    "people who feel stuck living paycheck to paycheck and want a realistic path toward more freedom"
  );
}

function getMissionTopic(
  memory: KaiMemory,
): string {
  const directTopic =
    findMemoryValue(
      memory,
      [
        "content-topic",
        "current-topic",
        "campaign-topic",
        "content-focus",
      ],
      [
        "Content Topic",
        "Current Topic",
        "Campaign Topic",
        "Content Focus",
      ],
    );

  if (directTopic) {
    return directTopic;
  }

  const goals =
    findMemoryValuesByKeywords(
      memory,
      [
        "goal",
        "mission",
        "content",
        "income",
        "freedom",
        "paycheck",
      ],
      5,
    );

  return (
    goals[0] ??
    "helping people take one practical step toward escaping the paycheck-to-paycheck lifestyle"
  );
}

function getOfferOptions(
  memory: KaiMemory,
): string[] {
  const directOffers =
    splitMemoryValue(
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
        "product",
        "stan store",
        "free guide",
        "escape plan",
        "landing page",
      ],
      8,
    );

  return Array.from(
    new Set(
      [
        ...directOffers,
        ...discoveredOffers,
      ]
        .map((offer) =>
          offer.trim(),
        )
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

function getDestination(
  memory: KaiMemory,
): string {
  const offers =
    getOfferOptions(memory);

  const preferredOffer =
    offers.find((offer) => {
      const normalized =
        normalizeSearchText(offer);

      return (
        normalized.includes(
          "escape plan",
        ) ||
        normalized.includes(
          "stan store",
        ) ||
        normalized.includes(
          "free guide",
        )
      );
    });

  return (
    preferredOffer ??
    offers[0] ??
    "The Escape Plan in the KWEVORA Stan Store"
  );
}

function getConnectedPlatforms(
  memory: KaiMemory,
): string[] {
  const directPlatforms =
    splitMemoryValue(
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

  const platformNames = [
    "TikTok",
    "Instagram Reels",
    "YouTube Shorts",
    "Facebook Reels",
    "LinkedIn",
    "Pinterest",
    "X",
  ];

  const detectedPlatforms =
    memory.items.flatMap((item) => {
      const searchableText =
        normalizeSearchText(
          [
            item.id,
            item.title,
            item.value,
            item.source,
          ].join(" "),
        );

      return platformNames.filter(
        (platform) =>
          searchableText.includes(
            normalizeSearchText(
              platform.replace(
                " Reels",
                "",
              ),
            ),
          ),
      );
    });

  return Array.from(
    new Set(
      [
        ...directPlatforms,
        ...detectedPlatforms,
      ]
        .map((platform) =>
          platform.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function getRecommendedPlatform(
  memory: KaiMemory,
): string {
  const platforms =
    getConnectedPlatforms(memory);

  const preferredOrder = [
    "TikTok",
    "Instagram Reels",
    "YouTube Shorts",
    "Facebook Reels",
  ];

  for (
    const preferredPlatform
    of preferredOrder
  ) {
    const match =
      platforms.find(
        (platform) =>
          normalizeSearchText(
            platform,
          ).includes(
            normalizeSearchText(
              preferredPlatform.replace(
                " Reels",
                "",
              ),
            ),
          ),
      );

    if (match) {
      return match;
    }
  }

  return (
    platforms[0] ??
    "TikTok"
  );
}

function getOwnerPreferences(
  memory: KaiMemory,
): string[] {
  const directPreferences =
    splitMemoryValue(
      findMemoryValue(
        memory,
        [
          "owner-preferences",
          "content-preferences",
          "preferences",
        ],
        [
          "Owner Preferences",
          "Content Preferences",
          "Preferences",
        ],
      ),
    );

  const discoveredPreferences =
    findMemoryValuesByKeywords(
      memory,
      [
        "prefers",
        "preference",
        "faceless",
        "voiceover",
        "text only",
        "tone",
        "style",
      ],
      8,
    );

  return Array.from(
    new Set(
      [
        ...directPreferences,
        ...discoveredPreferences,
      ]
        .map((preference) =>
          preference.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function prefersFacelessContent(
  memory: KaiMemory,
): boolean {
  const preferences =
    getOwnerPreferences(memory)
      .join(" ");

  const normalized =
    normalizeSearchText(
      preferences,
    );

  return (
    normalized.includes("faceless") ||
    normalized.includes("text only") ||
    normalized.includes(
      "no voiceover",
    ) ||
    normalized.includes(
      "not comfortable going live",
    )
  );
}

function createHashtag(
  value: string,
): string {
  const cleaned =
    value
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join("");

  return cleaned
    ? `#${cleaned}`
    : "";
}

function buildHashtags(
  businessName: string,
  topic: string,
): string[] {
  const topicHashtag =
    createHashtag(topic);

  return Array.from(
    new Set(
      [
        createHashtag(
          businessName,
        ),
        "#OneStepCloser",
        "#DigitalIncome",
        "#PaycheckToPaycheck",
        "#FinancialFreedom",
        "#OnlineBusiness",
        topicHashtag,
      ].filter(Boolean),
    ),
  ).slice(0, 7);
}

function buildIncomeContentPackage(
  memory: KaiMemory,
): KaiContentPackage {
  const businessName =
    getBusinessName(memory);

  const audience =
    getAudience(memory);

  const topic =
    getMissionTopic(memory);

  const destination =
    getDestination(memory);

  const recommendedPlatform =
    getRecommendedPlatform(memory);

  const faceless =
    prefersFacelessContent(
      memory,
    );

  const title =
    "One Step Closer";

  const hook =
    "You do not have to change your whole life today. You only need to take one step.";

  const script = faceless
    ? [
        "You do not have to change your whole life today.",
        "You only need to take one step.",
        "",
        "One post.",
        "One new skill.",
        "One small product.",
        "One decision to stop waiting.",
        "",
        "Most people stay stuck because they believe the first move has to be huge.",
        "",
        "It does not.",
        "",
        "Start small.",
        "Stay consistent.",
        "Get one step closer.",
      ].join("\n")
    : [
        "You do not have to change your whole life today.",
        "You only need to take one step.",
        "",
        `For ${audience}, that step could be learning one useful skill, creating one piece of content, or finally sharing one offer.`,
        "",
        "The first move does not have to be perfect.",
        "It only has to move you forward.",
        "",
        "Start small.",
        "Stay consistent.",
        "Get one step closer.",
      ].join("\n");

  const caption = [
    "You do not need the perfect plan before you begin.",
    "",
    `Today's step: ${topic}.`,
    "",
    `Start with ${destination}.`,
    "",
    "One step today can create a completely different future.",
  ].join("\n");

  return {
    idea:
      `Create a ${
        faceless
          ? "faceless, text-on-screen"
          : "short-form"
      } motivational video for ${audience} that connects one small action to the possibility of earning more freedom.`,

    title,

    hook,

    script,

    caption,

    hashtags:
      buildHashtags(
        businessName,
        topic,
      ),

    thumbnailIdea:
      'Dark cinematic background with large bold words: "ONE STEP CLOSER" and smaller text underneath: "Your life can change one decision at a time."',

    callToAction:
      `Take your first step today. Visit ${destination}.`,

    destination,

    recommendedPlatform,

    publishingRecommendation:
      `Publish as a 20–30 second vertical video on ${recommendedPlatform}. Use slow cinematic footage, large readable text, a calm emotional music bed, and place the call to action during the final three seconds.`,

    alternateHooks: [
      "Your life probably will not change overnight—but it can start changing today.",
      "The hardest part is not building a new life. It is taking the first step.",
      "You may be one small decision away from changing your direction.",
    ],
  };
}

function shouldCreateContentPackage(
  opportunity: KaiOpportunity,
): boolean {
  return [
    "Revenue",
    "Content",
    "Audience",
    "Publishing",
  ].includes(
    opportunity.category,
  );
}

function getMissionPriority(
  opportunity: KaiOpportunity,
): MissionPriority {
  if (
    opportunity.priorityScore >= 90 ||
    opportunity.urgency >= 95
  ) {
    return "Critical";
  }

  if (
    opportunity.priorityScore >= 75 ||
    opportunity.urgency >= 80
  ) {
    return "High";
  }

  return "Normal";
}

function buildMissionTasks(
  opportunity: KaiOpportunity,
  contentPackage:
    | KaiContentPackage
    | undefined,
): string[] {
  const tasks = [
    ...opportunity.changeToday,
    ...opportunity.prepareNext,
  ];

  if (!contentPackage) {
    return Array.from(
      new Set(tasks),
    );
  }

  return Array.from(
    new Set([
      `Use the prepared hook: ${contentPackage.hook}`,
      "Build the video using the completed script.",
      `Use ${contentPackage.recommendedPlatform} as the first recommended platform.`,
      `Connect the call to action to ${contentPackage.destination}.`,
      "Send the completed package to the Review Queue.",
      ...tasks,
    ]),
  );
}

export function buildKaiMission(
  decision: KaiDecision,
  memory: KaiMemory,
): KaiMission {
  const owner =
    getOwnerName(memory);

  const opportunity =
    decision.topOpportunity;

  const contentPackage =
    shouldCreateContentPackage(
      opportunity,
    )
      ? buildIncomeContentPackage(
          memory,
        )
      : undefined;

  const objective =
    contentPackage
      ? `Prepare a complete income-focused content package for ${owner} to review, including the hook, script, caption, hashtags, thumbnail idea, call to action, destination, and publishing recommendation.`
      : opportunity.recommendation;

  const successMetric =
    contentPackage
      ? `A complete content package is ready for review and connected to ${contentPackage.destination}.`
      : opportunity.expectedOutcome;

  return {
    id:
      createMissionId(),

    title:
      opportunity.title,

    objective,

    reason:
      decision.reason,

    priority:
      getMissionPriority(
        opportunity,
      ),

    requiresApproval:
      opportunity.requiresApproval,

    executionOwner:
      opportunity.executionOwner,

    successMetric,

    tasks:
      buildMissionTasks(
        opportunity,
        contentPackage,
      ),

    contentPackage,

    createdAt:
      new Date().toISOString(),
  };
}

export function summarizeMission(
  mission: KaiMission,
): string {
  const contentSummary =
    mission.contentPackage
      ? `

Prepared Content Package

Title:
${mission.contentPackage.title}

Hook:
${mission.contentPackage.hook}

Script:
${mission.contentPackage.script}

Caption:
${mission.contentPackage.caption}

Hashtags:
${mission.contentPackage.hashtags.join(" ")}

Thumbnail:
${mission.contentPackage.thumbnailIdea}

Call to action:
${mission.contentPackage.callToAction}

Destination:
${mission.contentPackage.destination}

Recommended platform:
${mission.contentPackage.recommendedPlatform}

Publishing recommendation:
${mission.contentPackage.publishingRecommendation}`
      : "";

  return `
Today's Mission

${mission.title}

Objective:
${mission.objective}

Why:
${mission.reason}

Execution owner:
${mission.executionOwner}

Success looks like:
${mission.successMetric}${contentSummary}
`.trim();
}