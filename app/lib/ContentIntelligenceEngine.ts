import type {
  KaiDecision,
  KaiOpportunity,
} from "./kaiDecisionEngine";

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
};

export type ContentVideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
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

  sourceOpportunityId: string;
  generatedAt: string;
};

function cleanString(
  value: string | undefined,
): string {
  return value?.trim() ?? "";
}

function uniqueStrings(
  values: Array<string | undefined>,
): string[] {
  return Array.from(
    new Set(
      values
        .map(cleanString)
        .filter(Boolean),
    ),
  );
}

function firstValue(
  values: string[] | undefined,
): string {
  return (
    values?.find(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0,
    )?.trim() ?? ""
  );
}

function chooseAudience(
  input: ContentGenerationInput,
): string {
  const suppliedAudience =
    firstValue(
      input.targetAudience,
    );

  if (suppliedAudience) {
    return suppliedAudience;
  }

  return "people who want to create more income and gain more control over their time";
}

function chooseOffer(
  input: ContentGenerationInput,
): string {
  const offer =
    firstValue(
      input.offers,
    );

  if (offer) {
    return offer;
  }

  const product =
    firstValue(
      input.products,
    );

  if (product) {
    return product;
  }

  return "the strongest current offer";
}

function chooseDestinationLink(
  input: ContentGenerationInput,
): string {
  const suppliedLink =
    cleanString(
      input.destinationLink,
    );

  if (suppliedLink) {
    return suppliedLink;
  }

  return "";
}

function choosePlatforms(
  input: ContentGenerationInput,
): string[] {
  const suppliedPlatforms =
    uniqueStrings(
      input.connectedPlatforms ?? [],
    );

  if (suppliedPlatforms.length > 0) {
    return suppliedPlatforms.slice(
      0,
      4,
    );
  }

  return [
    "TikTok",
    "Facebook Reels",
    "YouTube Shorts",
    "Instagram Reels",
  ];
}

function createHashtags(
  input: ContentGenerationInput,
): string[] {
  const businessName =
    cleanString(
      input.businessName,
    ) || "KWEVORA";

  const businessTag =
    `#${businessName.replace(
      /[^a-zA-Z0-9]/g,
      "",
    )}`;

  return uniqueStrings([
    businessTag,
    "#OneStepCloser",
    "#DigitalIncome",
    "#OnlineBusiness",
    "#SideIncome",
    "#EntrepreneurMindset",
    "#WorkSmarter",
  ]).slice(
    0,
    7,
  );
}

function createIncomeFocusedPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): ContentPackage {
  const businessName =
    cleanString(
      input.businessName,
    ) || "KWEVORA";

  const audience =
    chooseAudience(
      input,
    );

  const offer =
    chooseOffer(
      input,
    );

  const destinationLink =
    chooseDestinationLink(
      input,
    );

  const recommendedPlatforms =
    choosePlatforms(
      input,
    );

  const hook =
    "Most people do not need another job. They need a better path to income.";

  const title =
    "Stop Trading More Time for More Money";

  const callToAction =
    destinationLink
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
  ].join(
    "\n",
  );

  const caption = [
    "More hours are not always the answer.",
    "",
    "The real goal is to build a path that gives you more control over your income and your time.",
    "",
    "Start small. Finish one useful step. Then build from there.",
    "",
    "One Step Closer.",
  ].join(
    "\n",
  );

  return {
    idea:
      opportunity.title,

    reason:
      opportunity.reason,

    title,
    hook,
    script,
    caption,

    hashtags:
      createHashtags(
        input,
      ),

    thumbnailIdea:
      'Large text reading "STOP TRADING TIME FOR MONEY" over a dark cinematic background with a person walking toward a bright opening.',

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText:
        "Most people do not need another job.",

      scenes: [
        "Dark background with bold opening text appearing one line at a time.",
        "Footage of someone working late or looking tired after a long shift.",
        "Text transition: More hours do not always create more freedom.",
        "Footage of a laptop, phone, digital product, or online storefront.",
        "Text transition: Build something that can keep working after the work is done.",
        "Final motivational scene showing forward movement or sunrise.",
      ],

      endingText:
        destinationLink
          ? `Take one step today. ${businessName}`
          : `One Step Closer. ${businessName}`,

      estimatedLengthSeconds:
        35,
    },

    format:
      input.preferredFormat ??
      "faceless_video",

    destinationLink,

    pinnedComment:
      destinationLink
        ? `Ready to take your next step? Start here: ${destinationLink}`
        : `What is one step you can take today to create more control over your income?`,

    suggestedPostingTime:
      "7:00 PM local time",

    confidence:
      Math.max(
        70,
        Math.min(
          98,
          opportunity.confidence,
        ),
      ),

    estimatedBusinessImpact:
      "This content is designed to connect a common income problem to a clear next action while building trust around the KWEVORA message.",

    followUpIdeas: [
      "Three ways to start building income without quitting your job",
      "Why working harder does not always create more freedom",
      "The first digital asset every beginner can create",
    ],

    sourceOpportunityId:
      opportunity.id,

    generatedAt:
      new Date().toISOString(),
  };
}

function createAudienceGrowthPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): ContentPackage {
  const businessName =
    cleanString(
      input.businessName,
    ) || "KWEVORA";

  const audience =
    chooseAudience(
      input,
    );

  const destinationLink =
    chooseDestinationLink(
      input,
    );

  const recommendedPlatforms =
    choosePlatforms(
      input,
    );

  const hook =
    "You are probably closer to changing your life than you think.";

  const title =
    "One Decision Can Change Your Direction";

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
  ].join(
    "\n",
  );

  const caption = [
    "You do not need to fix everything today.",
    "",
    "Choose one move that your future self will thank you for.",
    "",
    "Then do it again tomorrow.",
    "",
    "One Step Closer.",
  ].join(
    "\n",
  );

  return {
    idea:
      opportunity.title,

    reason:
      opportunity.reason,

    title,
    hook,
    script,
    caption,

    hashtags:
      createHashtags(
        input,
      ),

    thumbnailIdea:
      'Bold text reading "ONE DECISION" over a cinematic road leading toward sunrise.',

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText:
        "You are closer than you think.",

      scenes: [
        "Dark screen with the opening sentence appearing slowly.",
        "A person standing still while the world moves around them.",
        "Text sequence: One application. One post. One product.",
        "Footage of someone working quietly on a laptop.",
        "A road, staircase, or sunrise representing forward progress.",
      ],

      endingText:
        `One Step Closer. ${businessName}`,

      estimatedLengthSeconds:
        30,
    },

    format:
      input.preferredFormat ??
      "faceless_video",

    destinationLink,

    pinnedComment:
      "What is the one step you know you need to take next?",

    suggestedPostingTime:
      "7:00 PM local time",

    confidence:
      Math.max(
        70,
        Math.min(
          98,
          opportunity.confidence,
        ),
      ),

    estimatedBusinessImpact:
      "This content is designed to earn attention, encourage comments, strengthen brand recognition, and attract people who connect with the KWEVORA mission.",

    followUpIdeas: [
      "The smallest action that can move your life forward today",
      "Why waiting for the perfect time keeps people stuck",
      "What One Step Closer means inside KWEVORA",
    ],

    sourceOpportunityId:
      opportunity.id,

    generatedAt:
      new Date().toISOString(),
  };
}

function createGeneralContentPackage(
  input: ContentGenerationInput,
  opportunity: KaiOpportunity,
): ContentPackage {
  const audience =
    chooseAudience(
      input,
    );

  const destinationLink =
    chooseDestinationLink(
      input,
    );

  const recommendedPlatforms =
    choosePlatforms(
      input,
    );

  const title =
    opportunity.title;

  const hook =
    opportunity.recommendation;

  const callToAction =
    destinationLink
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
  ].join(
    "\n",
  );

  return {
    idea:
      opportunity.title,

    reason:
      opportunity.reason,

    title,
    hook,
    script,

    caption: [
      opportunity.reason,
      "",
      callToAction,
      "",
      "One Step Closer.",
    ].join(
      "\n",
    ),

    hashtags:
      createHashtags(
        input,
      ),

    thumbnailIdea:
      `Bold, clean thumbnail centered around the message: "${opportunity.title}".`,

    callToAction,

    audience,

    recommendedPlatforms,

    videoPlan: {
      openingText:
        opportunity.title,

      scenes: [
        "Open with the main problem or opportunity in bold text.",
        "Explain why the issue matters using short on-screen statements.",
        "Show the practical next action.",
        "Close with one clear call to action.",
      ],

      endingText:
        "One Step Closer.",

      estimatedLengthSeconds:
        30,
    },

    format:
      input.preferredFormat ??
      "faceless_video",

    destinationLink,

    pinnedComment:
      callToAction,

    suggestedPostingTime:
      "7:00 PM local time",

    confidence:
      Math.max(
        65,
        Math.min(
          95,
          opportunity.confidence,
        ),
      ),

    estimatedBusinessImpact:
      opportunity.expectedOutcome,

    followUpIdeas:
      opportunity.prepareNext.length > 0
        ? opportunity.prepareNext.slice(
            0,
            3,
          )
        : [
            "Create a second hook for the same topic",
            "Turn the message into a short text post",
            "Create a follow-up based on audience response",
          ],

    sourceOpportunityId:
      opportunity.id,

    generatedAt:
      new Date().toISOString(),
  };
}

export class ContentIntelligenceEngine {
  generate(
    input: ContentGenerationInput,
  ): ContentPackage {
    const opportunity =
      input.decision.topOpportunity;

    if (
      opportunity.id ===
        "create-revenue-content" ||
      opportunity.category ===
        "Revenue"
    ) {
      return createIncomeFocusedPackage(
        input,
        opportunity,
      );
    }

    if (
      opportunity.id ===
        "grow-audience" ||
      opportunity.category ===
        "Audience"
    ) {
      return createAudienceGrowthPackage(
        input,
        opportunity,
      );
    }

    return createGeneralContentPackage(
      input,
      opportunity,
    );
  }

  shouldGenerate(
    decision: KaiDecision,
  ): boolean {
    const opportunity =
      decision.topOpportunity;

    return (
      opportunity.executionOwner ===
        "KAI" ||
      opportunity.executionOwner ===
        "Shared"
    ) &&
      (
        opportunity.category ===
          "Content" ||
        opportunity.category ===
          "Revenue" ||
        opportunity.category ===
          "Audience"
      );
  }
}

export const contentIntelligenceEngine =
  new ContentIntelligenceEngine();