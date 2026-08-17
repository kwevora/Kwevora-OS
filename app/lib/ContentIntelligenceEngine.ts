import type { KaiDecision, KaiOpportunity } from "./kaiDecisionEngine";

import { strategyBrain, type StrategyEvidence } from "./StrategyBrain";

import type { ExperimentVariable } from "./ExperimentEngine";
import { crossPlatformLearningBrain } from "./CrossPlatformLearningBrain";
import {
  adaptiveContentCreationBrain,
  type AdaptiveCreationPlan,
} from "./AdaptiveContentCreationBrain";

export type ContentFormat =
  | "faceless_video"
  | "record_yourself"
  | "upload_video";

export type ContentGenerationInput = {
  decision: KaiDecision;

  businessName?: string;
  ownerName?: string;

  products?: string[];
  offers?: string[];
  targetAudience?: string[];
  connectedPlatforms?: string[];

  brandVoice?: string;
  destinationLink?: string;

  preferredFormat?: ContentFormat;

  growthDirective?: {
    product: string;
    platform: string;
    format: ContentFormat;
    hook: string;
    callToAction: string;
    offer: string;
    campaign?: {
      campaignId: string;
      stage: "attract" | "educate" | "prove" | "convert" | "follow_up";
      objective: string;
      messageDirection: string;
      protectedExperimentId: string | null;
    };
  };
};

export type ContentVideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
};

export type AppliedContentStrategy = {
  variable: ExperimentVariable;
  variation: string;
  experiments: number;
  confidence: number;
  explanation: string;
};

export type ContentStrategyApplication = {
  contextTags: string[];
  applied: AppliedContentStrategy[];
  retiredStrategiesAvoided: string[];
  explanation: string;
};

export type ContentPackage = {
  idea: string;
  reason: string;

  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];

  thumbnailIdea: string;
  callToAction: string;

  audience: string;
  recommendedPlatforms: string[];

  videoPlan: ContentVideoPlan;

  format: ContentFormat;

  destinationLink: string;
  pinnedComment: string;

  suggestedPostingTime: string;
  confidence: number;
  estimatedBusinessImpact: string;
  followUpIdeas: string[];

  strategyApplication: ContentStrategyApplication;

  adaptiveCreation?: AdaptiveCreationPlan;

  attributionContext?: {
    product: string;
    offer: string;
    audience: string;
  };

  revenueOptimization?: {
    action: "learning" | "scale" | "revise" | "pause" | "replace";
    allocationPercent: number;
    nextRevenueTarget: number;
    priorityReason: string;
    challenger: string | null;
  };

  growthPlan?: {
    planId: string;
    slotId: string;
    position: number;
    bucket: "winner" | "challenger" | "learning";
    scheduledFor: string;
    weeklyRevenueTarget: number;
    expectedOutcome: string;
    stopRule: string;
  };
  campaign?: {
    campaignId: string;
    stage: "attract" | "educate" | "prove" | "convert" | "follow_up";
    objective: string;
    messageDirection: string;
    protectedExperimentId: string | null;
  };
  businessLaunch?: {
    launchId: string;
    product: string;
    destinationLink: string;
    revenueGoal: number;
  };

  approvalIntelligence?: {
    predictedApproval: number;
    businessImpactScore: number;
    reviewPriority: number;
    evidenceCount: number;
    predictionAccuracy: number | null;
    correctionsApplied: string[];
    familiarIssues: string[];
    explanation: string;
  };

  sourceOpportunityId: string;
  generatedAt: string;
};

type DraftContentPackage = Omit<ContentPackage, "strategyApplication">;

const STRATEGY_VARIABLES: ExperimentVariable[] = [
  "hook",
  "call_to_action",
  "offer",
  "platform",
  "format",
  "approach",
];

function strategyTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function contentContextTags(input: ContentGenerationInput): string[] {
  const opportunity = input.decision.topOpportunity;
  const values = [
    opportunity.category,
    opportunity.title,
    opportunity.recommendation,
    input.preferredFormat?.replaceAll("_", " "),
    ...(input.connectedPlatforms ?? []),
    ...(input.products ?? []),
    ...(input.offers ?? []),
    ...(input.targetAudience ?? []),
  ];

  return Array.from(
    new Set(values.flatMap((value) => strategyTokens(value ?? ""))),
  );
}

async function provenStrategies(contextTags: string[]): Promise<{
  applied: StrategyEvidence[];
  retired: StrategyEvidence[];
}> {
  const applied: StrategyEvidence[] = [];
  const retired: StrategyEvidence[] = [];

  for (const variable of STRATEGY_VARIABLES) {
    const ranked = await strategyBrain.analyze(contextTags, variable);
    const proven = ranked.find((strategy) => strategy.status === "proven");
    if (proven) applied.push(proven);
    retired.push(...ranked.filter((strategy) => strategy.status === "retired"));
  }

  return { applied, retired };
}

function cleanString(value: string | undefined): string {
  return value?.trim() ?? "";
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function firstValue(values: string[] | undefined): string {
  return (
    values
      ?.find((value) => typeof value === "string" && value.trim().length > 0)
      ?.trim() ?? ""
  );
}

function chooseAudience(input: ContentGenerationInput): string {
  const suppliedAudience = firstValue(input.targetAudience);

  if (suppliedAudience) {
    return suppliedAudience;
  }

  return "people who want to create more income and gain more control over their time";
}

function chooseOffer(input: ContentGenerationInput): string {
  const offer = firstValue(input.offers);

  if (offer) {
    return offer;
  }

  const product = firstValue(input.products);

  if (product) {
    return product;
  }

  return "the strongest current offer";
}

function chooseDestinationLink(input: ContentGenerationInput): string {
  const suppliedLink = cleanString(input.destinationLink);

  if (suppliedLink) {
    return suppliedLink;
  }

  return "";
}

function choosePlatforms(input: ContentGenerationInput): string[] {
  const suppliedPlatforms = uniqueStrings(input.connectedPlatforms ?? []);

  if (suppliedPlatforms.length > 0) {
    return suppliedPlatforms.slice(0, 4);
  }

  return ["TikTok", "Facebook Reels", "YouTube Shorts", "Instagram Reels"];
}

function createHashtags(input: ContentGenerationInput): string[] {
  const businessName = cleanString(input.businessName) || "KWEVORA";

  const businessTag = `#${businessName.replace(/[^a-zA-Z0-9]/g, "")}`;

  return uniqueStrings([
    businessTag,
    "#OneStepCloser",
    "#DigitalIncome",
    "#OnlineBusiness",
    "#SideIncome",
    "#EntrepreneurMindset",
    "#WorkSmarter",
  ]).slice(0, 7);
}

function createIncomeFocusedPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): DraftContentPackage {
  const businessName = cleanString(input.businessName) || "KWEVORA";

  const audience = chooseAudience(input);

  const offer = chooseOffer(input);

  const destinationLink = chooseDestinationLink(input);

  const recommendedPlatforms = choosePlatforms(input);

  const hook =
    "Most people do not need another job. They need a better path to income.";

  const title = "Stop Trading More Time for More Money";

  const callToAction = destinationLink
    ? `Start with ${offer}. Use the link to take your next step.`
    : `Take a look at ${offer} and choose one step you can start today.`;

  const script = [
    hook,
    "",
    "Working more hours can help temporarily, but it does not always create more freedom.",
    "",
    "A better goal is to build something that can keep working after the work is done.",
    "",
    "That could be a digital product, useful content, an affiliate offer, or a simple system that solves a real problem.",
    "",
    "You do not have to build everything today.",
    "",
    "You only need to take one useful step that moves you closer to income you control.",
    "",
    callToAction,
  ].join("\n");

  const caption = [
    "More hours are not always the answer.",
    "",
    "The real goal is to build a path that gives you more control over your income and your time.",
    "",
    "Start small. Finish one useful step. Then build from there.",
    "",
    "One Step Closer.",
  ].join("\n");

  return {
    idea: opportunity.title,

    reason: opportunity.reason,

    title,
    hook,
    script,
    caption,

    hashtags: createHashtags(input),

    thumbnailIdea:
      'Large text reading "STOP TRADING TIME FOR MONEY" over a dark cinematic background with a person walking toward a bright opening.',

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText: "Most people do not need another job.",

      scenes: [
        "Dark background with bold opening text appearing one line at a time.",
        "Footage of someone working late or looking tired after a long shift.",
        "Text transition: More hours do not always create more freedom.",
        "Footage of a laptop, phone, digital product, or online storefront.",
        "Text transition: Build something that can keep working after the work is done.",
        "Final motivational scene showing forward movement or sunrise.",
      ],

      endingText: destinationLink
        ? `Take one step today. ${businessName}`
        : `One Step Closer. ${businessName}`,

      estimatedLengthSeconds: 35,
    },

    format: input.preferredFormat ?? "faceless_video",

    destinationLink,

    pinnedComment: destinationLink
      ? `Ready to take your next step? Start here: ${destinationLink}`
      : `What is one step you can take today to create more control over your income?`,

    suggestedPostingTime: "7:00 PM local time",

    confidence: Math.max(70, Math.min(98, opportunity.confidence)),

    estimatedBusinessImpact:
      "This content is designed to connect a common income problem to a clear next action while building trust around the KWEVORA message.",

    followUpIdeas: [
      "Three ways to start building income without quitting your job",
      "Why working harder does not always create more freedom",
      "The first digital asset every beginner can create",
    ],

    sourceOpportunityId: opportunity.id,

    generatedAt: new Date().toISOString(),
  };
}

function createAudienceGrowthPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): DraftContentPackage {
  const businessName = cleanString(input.businessName) || "KWEVORA";

  const audience = chooseAudience(input);

  const destinationLink = chooseDestinationLink(input);

  const recommendedPlatforms = choosePlatforms(input);

  const hook = "You are probably closer to changing your life than you think.";

  const title = "One Decision Can Change Your Direction";

  const callToAction =
    "Follow for practical steps toward building more income, freedom, and control.";

  const script = [
    hook,
    "",
    "Big changes rarely begin with one perfect plan.",
    "",
    "They usually begin with one decision.",
    "",
    "One application.",
    "One post.",
    "One product.",
    "One hour spent building something for your future.",
    "",
    "You do not need to see the entire path.",
    "",
    "You only need to take the next step.",
    "",
    "One Step Closer.",
  ].join("\n");

  const caption = [
    "You do not need to fix everything today.",
    "",
    "Choose one move that your future self will thank you for.",
    "",
    "Then do it again tomorrow.",
    "",
    "One Step Closer.",
  ].join("\n");

  return {
    idea: opportunity.title,

    reason: opportunity.reason,

    title,
    hook,
    script,
    caption,

    hashtags: createHashtags(input),

    thumbnailIdea:
      'Bold text reading "ONE DECISION" over a cinematic road leading toward sunrise.',

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText: "You are closer than you think.",

      scenes: [
        "Dark screen with the opening sentence appearing slowly.",
        "A person standing still while the world moves around them.",
        "Text sequence: One application. One post. One product.",
        "Footage of someone working quietly on a laptop.",
        "A road, staircase, or sunrise representing forward progress.",
      ],

      endingText: `One Step Closer. ${businessName}`,

      estimatedLengthSeconds: 30,
    },

    format: input.preferredFormat ?? "faceless_video",

    destinationLink,

    pinnedComment: "What is the one step you know you need to take next?",

    suggestedPostingTime: "7:00 PM local time",

    confidence: Math.max(70, Math.min(98, opportunity.confidence)),

    estimatedBusinessImpact:
      "This content is designed to earn attention, encourage comments, strengthen brand recognition, and attract people who connect with the KWEVORA mission.",

    followUpIdeas: [
      "The smallest action that can move your life forward today",
      "Why waiting for the perfect time keeps people stuck",
      "What One Step Closer means inside KWEVORA",
    ],

    sourceOpportunityId: opportunity.id,

    generatedAt: new Date().toISOString(),
  };
}

function createGeneralContentPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): DraftContentPackage {
  const audience = chooseAudience(input);

  const destinationLink = chooseDestinationLink(input);

  const recommendedPlatforms = choosePlatforms(input);

  const title = opportunity.title;

  const hook = opportunity.recommendation;

  const callToAction = destinationLink
    ? "Use the link to take the next step."
    : "Choose one useful step and take action today.";

  const script = [
    hook,
    "",
    opportunity.reason,
    "",
    opportunity.expectedOutcome,
    "",
    callToAction,
  ].join("\n");

  return {
    idea: opportunity.title,

    reason: opportunity.reason,

    title,
    hook,
    script,

    caption: [
      opportunity.reason,
      "",
      callToAction,
      "",
      "One Step Closer.",
    ].join("\n"),

    hashtags: createHashtags(input),

    thumbnailIdea: `Bold, clean thumbnail centered around the message: "${opportunity.title}".`,

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText: opportunity.title,

      scenes: [
        "Open with the main problem or opportunity in bold text.",
        "Explain why the issue matters using short on-screen statements.",
        "Show the practical next action.",
        "Close with one clear call to action.",
      ],

      endingText: "One Step Closer.",

      estimatedLengthSeconds: 30,
    },

    format: input.preferredFormat ?? "faceless_video",

    destinationLink,

    pinnedComment: callToAction,

    suggestedPostingTime: "7:00 PM local time",

    confidence: Math.max(65, Math.min(95, opportunity.confidence)),

    estimatedBusinessImpact: opportunity.expectedOutcome,

    followUpIdeas:
      opportunity.prepareNext.length > 0
        ? opportunity.prepareNext.slice(0, 3)
        : [
            "Create a second hook for the same topic",
            "Turn the message into a short text post",
            "Create a follow-up based on audience response",
          ],

    sourceOpportunityId: opportunity.id,

    generatedAt: new Date().toISOString(),
  };
}

function preferredPlatformFrom(
  strategy: StrategyEvidence,
  availablePlatforms: string[],
): string | undefined {
  const strategyText =
    `${strategy.variation} ${strategy.explanation}`.toLowerCase();
  return availablePlatforms.find((platform) =>
    strategyText.includes(platform.toLowerCase()),
  );
}

async function applyProvenContentStrategies(
  input: ContentGenerationInput,
  draft: DraftContentPackage,
): Promise<ContentPackage> {
  const contextTags = contentContextTags(input);
  const { applied, retired } = await provenStrategies(contextTags);
  const offer = chooseOffer(input);
  const audience = chooseAudience(input);
  let content = { ...draft };
  const performancePlaybook = await crossPlatformLearningBrain.playbook();

  for (const strategy of applied) {
    if (strategy.variable === "hook") {
      content = {
        ...content,
        hook: `If you are ${audience} and this problem feels familiar, start here: ${content.hook}`,
        videoPlan: {
          ...content.videoPlan,
          openingText: `This is for ${audience}.`,
        },
      };
    }

    if (strategy.variable === "call_to_action") {
      content = {
        ...content,
        callToAction: content.destinationLink
          ? `Take the next step with ${offer}: ${content.destinationLink}`
          : `Take the next step with ${offer} today.`,
        pinnedComment: content.destinationLink
          ? `Start with ${offer}: ${content.destinationLink}`
          : `Reply “START” if you want the next step for ${offer}.`,
      };
    }

    if (strategy.variable === "offer") {
      content = {
        ...content,
        title: `${content.title}: ${offer}`,
        caption: `${content.caption}\n\nThe clearest next step is ${offer}.`,
      };
    }

    if (strategy.variable === "platform") {
      const preferred = preferredPlatformFrom(
        strategy,
        content.recommendedPlatforms,
      );
      if (preferred) {
        content = {
          ...content,
          recommendedPlatforms: [
            preferred,
            ...content.recommendedPlatforms.filter(
              (platform) => platform !== preferred,
            ),
          ],
        };
      }
    }

    if (strategy.variable === "format") {
      const value = strategy.variation.toLowerCase();
      const format: ContentFormat | undefined = value.includes("record")
        ? "record_yourself"
        : value.includes("upload")
          ? "upload_video"
          : value.includes("faceless")
            ? "faceless_video"
            : undefined;
      if (format) content = { ...content, format };
    }
  }

  const rankedPlatforms = performancePlaybook.platformRanking
    .filter((item) => item.evidenceCount >= 3)
    .map((item) => item.platform);
  if (rankedPlatforms.length > 0) {
    content = {
      ...content,
      recommendedPlatforms: [...content.recommendedPlatforms].sort(
        (left, right) => {
          const leftRank = rankedPlatforms.indexOf(left.toLowerCase());
          const rightRank = rankedPlatforms.indexOf(right.toLowerCase());
          return (
            (leftRank < 0 ? 999 : leftRank) - (rightRank < 0 ? 999 : rightRank)
          );
        },
      ),
    };
  }
  const provenFormat = performancePlaybook.provenPatterns.find(
    (item) =>
      item.dimension === "format" &&
      item.platform === "all" &&
      ["faceless_video", "record_yourself", "upload_video"].includes(
        item.value,
      ),
  );
  if (!input.preferredFormat && provenFormat) {
    content = { ...content, format: provenFormat.value as ContentFormat };
  }
  const primaryForTiming = content.recommendedPlatforms[0]?.toLowerCase();
  const provenTiming = performancePlaybook.provenPatterns.find(
    (item) =>
      item.dimension === "posting_window" &&
      (item.platform === primaryForTiming || item.platform === "all"),
  );
  if (provenTiming) {
    content = {
      ...content,
      suggestedPostingTime: `${provenTiming.value} on ${content.recommendedPlatforms[0]}`,
    };
  }

  const primaryPlatform =
    content.recommendedPlatforms[0] ?? "the strongest connected platform";
  const appliedSummary =
    applied.length > 0
      ? `KAI applied ${applied.length} proven content strateg${applied.length === 1 ? "y" : "ies"}: ${applied.map((strategy) => strategy.variable.replaceAll("_", " ")).join(", ")}.`
      : "KAI found no proven content strategy for this exact context, so it used the strongest current content standards without treating unproven evidence as fact.";
  const verifiedGuidance =
    performancePlaybook.provenPatterns.length > 0
      ? ` KAI also used ${performancePlaybook.provenPatterns.length} verified cross-platform pattern${performancePlaybook.provenPatterns.length === 1 ? "" : "s"} and excluded ${performancePlaybook.retiredPatterns.length} repeatedly weak pattern${performancePlaybook.retiredPatterns.length === 1 ? "" : "s"}.`
      : " KAI has not yet collected enough consistent cross-platform results to change the creative direction automatically.";

  return {
    ...content,
    attributionContext: {
      product: firstValue(input.products) || offer,
      offer,
      audience,
    },
    reason: `${content.reason} ${appliedSummary}${verifiedGuidance}`,
    hashtags: uniqueStrings([
      ...content.hashtags,
      ...strategyTokens(offer)
        .slice(0, 2)
        .map((token) => `#${token}`),
    ]).slice(0, 8),
    thumbnailIdea: `${content.thumbnailIdea} Keep the visible words short enough to read instantly on ${primaryPlatform}.`,
    suggestedPostingTime: content.suggestedPostingTime
      .toLowerCase()
      .includes(primaryPlatform.toLowerCase())
      ? content.suggestedPostingTime
      : `${content.suggestedPostingTime} on ${primaryPlatform}`,
    estimatedBusinessImpact: `${content.estimatedBusinessImpact} The package points ${audience} toward ${offer}.`,
    strategyApplication: {
      contextTags,
      applied: applied.map((strategy) => ({
        variable: strategy.variable,
        variation: strategy.variation,
        experiments: strategy.experiments,
        confidence: strategy.confidence,
        explanation: strategy.explanation,
      })),
      retiredStrategiesAvoided: Array.from(
        new Set(retired.map((strategy) => strategy.variation)),
      ),
      explanation:
        retired.length > 0
          ? `${appliedSummary} KAI also excluded ${retired.length} retired strateg${retired.length === 1 ? "y" : "ies"}.${verifiedGuidance}`
          : `${appliedSummary}${verifiedGuidance}`,
    },
  };
}

export class ContentIntelligenceEngine {
  async generate(input: ContentGenerationInput): Promise<ContentPackage> {
    const opportunity = input.decision.topOpportunity;

    let draft: DraftContentPackage;

    if (
      opportunity.id === "create-revenue-content" ||
      opportunity.category === "Revenue"
    ) {
      draft = createIncomeFocusedPackage(input, opportunity);
    } else if (
      opportunity.id === "grow-audience" ||
      opportunity.category === "Audience"
    ) {
      draft = createAudienceGrowthPackage(input, opportunity);
    } else {
      draft = createGeneralContentPackage(input, opportunity);
    }

    const content = await adaptiveContentCreationBrain.adapt(
      input,
      await applyProvenContentStrategies(input, draft),
    );

    if (!input.growthDirective) return content;

    const campaign = input.growthDirective.campaign;
    const campaignLine =
      campaign?.stage === "attract"
        ? "If this feels familiar, you are not the only one."
        : campaign?.stage === "educate"
          ? "The useful next step is to make the decision smaller, clearer, and possible today."
          : campaign?.stage === "prove"
            ? "Use only the evidence you can verify, and judge the process by what it actually produces."
            : campaign?.stage === "convert"
              ? `If this is the right next step for you, ${input.growthDirective.offer} is ready when you are.`
              : campaign?.stage === "follow_up"
                ? `Still deciding? Check whether ${input.growthDirective.offer} fits the problem you are trying to solve.`
                : "";
    return {
      ...content,
      hook: input.growthDirective.hook,
      callToAction: input.growthDirective.callToAction,
      format: input.growthDirective.format,
      recommendedPlatforms: [
        input.growthDirective.platform,
        ...content.recommendedPlatforms.filter(
          (platform) => platform !== input.growthDirective?.platform,
        ),
      ],
      attributionContext: {
        product: input.growthDirective.product,
        offer: input.growthDirective.offer,
        audience: content.audience,
      },
      ...(campaign
        ? {
            script: `${content.script}\n\n${campaignLine}`,
            caption: `${content.caption}\n\n${campaignLine}`,
            campaign,
          }
        : {}),
    };
  }

  shouldGenerate(decision: KaiDecision): boolean {
    const opportunity = decision.topOpportunity;

    return (
      (opportunity.executionOwner === "KAI" ||
        opportunity.executionOwner === "Shared") &&
      (opportunity.category === "Content" ||
        opportunity.category === "Revenue" ||
        opportunity.category === "Audience")
    );
  }
}

export const contentIntelligenceEngine = new ContentIntelligenceEngine();
