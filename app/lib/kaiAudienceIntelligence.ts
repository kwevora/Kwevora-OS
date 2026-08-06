export type KaiBusinessContext = {
  businessName?: string;
  businessType?: string;
  niche?: string;
  description?: string;

  products?: string[];
  services?: string[];

  primaryGoal?: string;
  currentStage?:
    | "idea"
    | "starting"
    | "growing"
    | "established";

  location?: string;
  platforms?: string[];

  knownAudience?: string;
  previousContentInsights?: string[];

  userMemory?: Record<string, unknown>;
};

export type KaiAudienceProfile = {
  primaryAudience: string;
  secondaryAudiences: string[];

  awarenessLevel:
    | "unaware"
    | "problem-aware"
    | "solution-aware"
    | "product-aware"
    | "mixed";

  currentSituation: string[];
  painPoints: string[];
  emotionalTriggers: string[];
  motivations: string[];
  objections: string[];
  buyingReasons: string[];

  languageStyle: string;
  trustSignals: string[];
  contentAngles: string[];

  strongestHookDirection: string;
  strongestCallToAction: string;

  confidence: number;
  reasoning: string[];
};

type AudiencePreset = {
  keywords: string[];

  primaryAudience: string;
  secondaryAudiences: string[];

  currentSituation: string[];
  painPoints: string[];
  emotionalTriggers: string[];
  motivations: string[];
  objections: string[];
  buyingReasons: string[];

  languageStyle: string;
  trustSignals: string[];
  contentAngles: string[];

  strongestHookDirection: string;
  strongestCallToAction: string;
};

const audiencePresets: AudiencePreset[] = [
  {
    keywords: [
      "affiliate",
      "affiliate marketing",
      "digital marketing",
      "online income",
      "make money online",
    ],

    primaryAudience:
      "People who want to earn income online but feel overwhelmed, uncertain, or unsure where to begin.",

    secondaryAudiences: [
      "New affiliate marketers struggling to gain traction",
      "Working adults searching for additional income",
      "Creators who have an audience but no clear monetization system",
      "People who have purchased programs but still lack a working plan",
    ],

    currentSituation: [
      "They are consuming information but taking inconsistent action",
      "They are unsure which platform, offer, or strategy to focus on",
      "They may be working a full-time job while trying to build income",
      "They often feel behind compared with successful creators",
    ],

    painPoints: [
      "Information overload",
      "Fear of wasting time or money",
      "Difficulty creating consistent content",
      "Low views, clicks, or sales",
      "Confusion about what to promote",
      "Lack of confidence and direction",
    ],

    emotionalTriggers: [
      "Feeling trapped financially",
      "Missing time with family",
      "Fear of remaining in the same situation",
      "Hope that one working system could change their direction",
      "Relief from finally having clear guidance",
    ],

    motivations: [
      "Supplementing or replacing job income",
      "Creating more freedom and flexibility",
      "Building something they own",
      "Proving they can succeed online",
      "Providing more for their family",
    ],

    objections: [
      "This is probably another scam",
      "I do not have enough followers",
      "I am not good on camera",
      "I do not know enough about marketing",
      "I cannot afford to keep buying tools",
      "I have tried before and failed",
    ],

    buyingReasons: [
      "The system removes confusion",
      "The work is prepared for them",
      "They can begin without advanced experience",
      "They receive clear actions instead of more information",
      "The product saves time and replaces multiple tools",
    ],

    languageStyle:
      "Simple, encouraging, direct, honest, and grounded in realistic progress rather than overnight-success promises.",

    trustSignals: [
      "Show the actual workflow",
      "Demonstrate real content being created",
      "Use believable results and timelines",
      "Explain what KAI handles automatically",
      "Acknowledge common fears without exaggeration",
    ],

    contentAngles: [
      "You do not need to know everything before starting",
      "Stop collecting advice and begin completing steps",
      "Build income without becoming a full-time content creator",
      "What KAI prepares while you are away",
      "One clear plan instead of several disconnected tools",
      "Starting an online business with no marketing experience",
    ],

    strongestHookDirection:
      "Expose the exhausting gap between wanting online income and not knowing what to do next, then reveal that KAI has already prepared the work.",

    strongestCallToAction:
      "Tell KAI what business you want to build and let it prepare your first move.",
  },

  {
    keywords: [
      "roofing",
      "roofer",
      "plumbing",
      "plumber",
      "electrician",
      "hvac",
      "contractor",
      "construction",
      "landscaping",
      "handyman",
      "home service",
    ],

    primaryAudience:
      "Local homeowners who need dependable help solving an urgent, expensive, or stressful property problem.",

    secondaryAudiences: [
      "Homeowners comparing local providers",
      "Property managers",
      "Real estate professionals",
      "Landlords",
      "Commercial property owners",
    ],

    currentSituation: [
      "They may not understand the technical problem",
      "They are worried about cost and reliability",
      "They often need help quickly",
      "They are comparing several local companies",
    ],

    painPoints: [
      "Fear of being overcharged",
      "Uncertainty about the seriousness of the problem",
      "Difficulty finding trustworthy contractors",
      "Poor communication from service providers",
      "Concern about damage becoming worse",
    ],

    emotionalTriggers: [
      "Protecting their home and family",
      "Avoiding a larger future repair",
      "Relief from receiving a clear answer",
      "Confidence that the job will be completed correctly",
    ],

    motivations: [
      "Fixing the problem quickly",
      "Protecting property value",
      "Avoiding repeat repairs",
      "Hiring someone trustworthy and responsive",
    ],

    objections: [
      "The price may be too high",
      "The company may not show up",
      "The repair may be unnecessary",
      "The work may not last",
    ],

    buyingReasons: [
      "Fast response",
      "Clear explanation",
      "Visible proof of quality",
      "Strong local reviews",
      "Warranty or service guarantee",
      "Professional communication",
    ],

    languageStyle:
      "Clear, reassuring, practical, local, and free of unnecessary technical language.",

    trustSignals: [
      "Before-and-after results",
      "Customer reviews",
      "Licensing and insurance",
      "Transparent explanations",
      "Real team members and completed jobs",
      "Local familiarity",
    ],

    contentAngles: [
      "Warning signs homeowners should not ignore",
      "What the repair process actually looks like",
      "How to prevent a costly future problem",
      "Before-and-after transformations",
      "Common homeowner myths",
      "What makes this company different",
    ],

    strongestHookDirection:
      "Show a recognizable warning sign and explain what could happen if the homeowner ignores it.",

    strongestCallToAction:
      "Get a clear professional assessment before the problem becomes more expensive.",
  },

  {
    keywords: [
      "realtor",
      "real estate",
      "real estate agent",
      "broker",
      "property",
      "homes",
    ],

    primaryAudience:
      "People preparing to buy or sell a home who want guidance, confidence, and fewer costly surprises.",

    secondaryAudiences: [
      "First-time homebuyers",
      "Homeowners considering selling",
      "People relocating",
      "Property investors",
    ],

    currentSituation: [
      "They are making a major financial decision",
      "They may not understand the process",
      "They are uncertain about timing and affordability",
      "They need someone they can trust",
    ],

    painPoints: [
      "Fear of making an expensive mistake",
      "Confusion about financing or negotiations",
      "Stress about moving",
      "Difficulty understanding the local market",
    ],

    emotionalTriggers: [
      "Finding the right home",
      "Protecting their financial future",
      "Starting a new chapter",
      "Avoiding regret",
    ],

    motivations: [
      "Buying confidently",
      "Selling for a strong price",
      "Moving with less stress",
      "Making a smart investment",
    ],

    objections: [
      "I am not ready yet",
      "Rates or prices are too high",
      "I can do this without an agent",
      "I do not know whom to trust",
    ],

    buyingReasons: [
      "Local expertise",
      "Strong communication",
      "Negotiation ability",
      "A simple, clearly explained process",
      "Evidence of successful transactions",
    ],

    languageStyle:
      "Warm, informed, reassuring, local, and focused on making complicated decisions feel manageable.",

    trustSignals: [
      "Local market knowledge",
      "Client success stories",
      "Clear process explanations",
      "Neighborhood insights",
      "Responsive communication",
    ],

    contentAngles: [
      "What buyers should know before beginning",
      "Seller mistakes that reduce offers",
      "Local neighborhood guidance",
      "Behind-the-scenes transaction education",
      "Myths about the current market",
    ],

    strongestHookDirection:
      "Reveal one costly mistake buyers or sellers commonly make before they understand the process.",

    strongestCallToAction:
      "Start with a simple conversation about your goals and next best move.",
  },

  {
    keywords: [
      "coach",
      "consultant",
      "course",
      "mentor",
      "training",
      "education",
      "personal brand",
    ],

    primaryAudience:
      "People who want a specific transformation but need expertise, structure, accountability, or confidence to achieve it.",

    secondaryAudiences: [
      "Beginners seeking a clear path",
      "People who have tried alone without success",
      "Professionals trying to improve a skill or result",
      "People ready to invest in guided progress",
    ],

    currentSituation: [
      "They understand the desired result but not the path",
      "They may have tried free information without progress",
      "They want certainty and structure",
      "They are evaluating whether the expert truly understands them",
    ],

    painPoints: [
      "Lack of direction",
      "Inconsistent action",
      "Information without implementation",
      "Fear of choosing the wrong program",
      "Difficulty staying accountable",
    ],

    emotionalTriggers: [
      "Being understood",
      "Seeing a believable transformation",
      "Relief from having a proven path",
      "Confidence gained through support",
    ],

    motivations: [
      "Achieving the result faster",
      "Avoiding preventable mistakes",
      "Receiving personalized guidance",
      "Becoming more capable or confident",
    ],

    objections: [
      "I can find this information free",
      "This may not work for me",
      "I do not have time",
      "The investment may not be worth it",
    ],

    buyingReasons: [
      "A clear transformation",
      "A credible process",
      "Relatable proof",
      "Personalized help",
      "Simple next steps",
    ],

    languageStyle:
      "Empathetic, authoritative, straightforward, and centered on the audience's transformation rather than the expert's credentials.",

    trustSignals: [
      "Specific client outcomes",
      "A clearly explained method",
      "Useful teaching before asking for a sale",
      "Honest expectations",
      "Visible understanding of the audience's struggle",
    ],

    contentAngles: [
      "Why common attempts fail",
      "The first step most people skip",
      "A simple framework for progress",
      "Transformation stories",
      "Mistakes that delay results",
    ],

    strongestHookDirection:
      "Describe the audience's struggle so accurately that they immediately feel understood.",

    strongestCallToAction:
      "Take the next guided step toward the result you have been trying to reach.",
  },

  {
    keywords: [
      "restaurant",
      "food truck",
      "catering",
      "bakery",
      "chef",
      "food",
      "coffee shop",
      "cafe",
    ],

    primaryAudience:
      "Local customers looking for food, convenience, atmosphere, or a memorable experience worth sharing.",

    secondaryAudiences: [
      "Families deciding where to eat",
      "Workers searching for a convenient meal",
      "Food enthusiasts",
      "Event planners",
      "Local community members",
    ],

    currentSituation: [
      "They are making a quick visual decision",
      "Taste and appearance strongly influence interest",
      "They may be comparing several nearby options",
      "Social proof matters",
    ],

    painPoints: [
      "Not knowing whether the food will be worth the price",
      "Concern about quality or service",
      "Difficulty choosing where to eat",
      "Limited awareness of the business",
    ],

    emotionalTriggers: [
      "Hunger",
      "Comfort",
      "Celebration",
      "Curiosity",
      "Belonging and local pride",
    ],

    motivations: [
      "Enjoying great food",
      "Trying something new",
      "Sharing an experience",
      "Finding convenience and value",
    ],

    objections: [
      "It may not taste as good as it looks",
      "The price may be too high",
      "The wait may be too long",
      "I already have another favorite place",
    ],

    buyingReasons: [
      "Irresistible visuals",
      "Strong reviews",
      "Unique menu items",
      "Convenience",
      "Friendly atmosphere",
      "Limited-time offers",
    ],

    languageStyle:
      "Sensory, inviting, energetic, local, and focused on showing rather than merely describing.",

    trustSignals: [
      "Real food preparation",
      "Customer reactions",
      "Consistent quality",
      "Behind-the-scenes cleanliness",
      "Local reviews",
    ],

    contentAngles: [
      "Close-up food transformations",
      "How a signature item is made",
      "Customer-favorite dishes",
      "Limited-time specials",
      "Behind-the-scenes preparation",
      "Local community stories",
    ],

    strongestHookDirection:
      "Open with an extreme close-up transformation or reveal that makes the viewer immediately imagine the taste.",

    strongestCallToAction:
      "Come experience the dish people keep returning for.",
  },

  {
    keywords: [
      "software",
      "saas",
      "app",
      "technology",
      "ai tool",
      "automation",
      "platform",
    ],

    primaryAudience:
      "People or businesses frustrated by a difficult, repetitive, expensive, or time-consuming process the product can simplify.",

    secondaryAudiences: [
      "Solo business owners",
      "Small teams",
      "Creators",
      "Marketing professionals",
      "People searching for a simpler alternative",
    ],

    currentSituation: [
      "They are piecing together several tools",
      "They are losing time to repetitive work",
      "They may be unsure whether another subscription is worthwhile",
      "They want results without a steep learning curve",
    ],

    painPoints: [
      "Too many disconnected tools",
      "Complicated setup",
      "Repetitive manual work",
      "High subscription costs",
      "Software that requires too much learning",
    ],

    emotionalTriggers: [
      "Relief from complexity",
      "Feeling capable immediately",
      "Recovering lost time",
      "Seeing difficult work completed automatically",
    ],

    motivations: [
      "Saving time",
      "Reducing costs",
      "Getting better results",
      "Operating with a smaller team",
      "Simplifying daily work",
    ],

    objections: [
      "This will be difficult to learn",
      "It may not work for my business",
      "I already use other tools",
      "AI output may feel generic",
      "The subscription may not be worth it",
    ],

    buyingReasons: [
      "Immediate useful output",
      "Simple onboarding",
      "Clear proof of time saved",
      "Personalized results",
      "Fewer tools required",
      "A product that improves with use",
    ],

    languageStyle:
      "Simple, confident, outcome-focused, visual, and free of unnecessary technical language.",

    trustSignals: [
      "Live product demonstrations",
      "Before-and-after workflows",
      "Real output generated inside the app",
      "Clear explanations of what happens automatically",
      "Customer proof",
    ],

    contentAngles: [
      "What happens after a new user tells KAI about their business",
      "A full day of work prepared automatically",
      "Replacing several tools with one clear workflow",
      "From blank screen to finished campaign",
      "What KAI completed while the user was away",
    ],

    strongestHookDirection:
      "Show the finished result first, then reveal that the user only provided their name and business.",

    strongestCallToAction:
      "Tell KAI what you do and watch it prepare the work.",
  },
];

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function buildSearchableContext(
  context: KaiBusinessContext,
) {
  return [
    context.businessName,
    context.businessType,
    context.niche,
    context.description,
    context.primaryGoal,
    context.knownAudience,
    ...(context.products ?? []),
    ...(context.services ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scorePreset(
  searchableContext: string,
  preset: AudiencePreset,
) {
  return preset.keywords.reduce(
    (score, keyword) => {
      if (
        searchableContext.includes(
          keyword.toLowerCase(),
        )
      ) {
        return score + Math.max(1, keyword.split(" ").length);
      }

      return score;
    },
    0,
  );
}

function createGeneralProfile(
  context: KaiBusinessContext,
): AudiencePreset {
  const businessLabel =
    context.businessType ||
    context.niche ||
    context.businessName ||
    "business";

  return {
    keywords: [],

    primaryAudience:
      context.knownAudience ||
      `People most likely to need, value, or benefit from this ${businessLabel}.`,

    secondaryAudiences: [
      "People actively searching for a solution",
      "People dissatisfied with their current option",
      "Beginners who need clear guidance",
      "People influenced by recommendations and visible proof",
    ],

    currentSituation: [
      "They have a problem, desire, or goal that has not been fully resolved",
      "They may not yet know which solution is right",
      "They are evaluating trust, value, simplicity, and likely results",
    ],

    painPoints: [
      "Uncertainty about the best next step",
      "Fear of wasting time or money",
      "Difficulty comparing available options",
      "Lack of confidence in unfamiliar providers",
    ],

    emotionalTriggers: [
      "Relief",
      "Hope",
      "Confidence",
      "Curiosity",
      "Fear of remaining stuck",
    ],

    motivations: [
      "Solving the problem",
      "Saving time",
      "Avoiding mistakes",
      "Improving their situation",
      "Feeling confident in their decision",
    ],

    objections: [
      "This may not work for me",
      "The cost may not be worth it",
      "I am not ready",
      "I do not know whether I can trust this business",
    ],

    buyingReasons: [
      "Clear value",
      "Visible proof",
      "Easy next steps",
      "Trustworthy communication",
      "A believable outcome",
    ],

    languageStyle:
      "Simple, specific, empathetic, conversational, and focused on the audience's real situation.",

    trustSignals: [
      "Real demonstrations",
      "Customer experiences",
      "Specific outcomes",
      "Transparent explanations",
      "Consistent useful content",
    ],

    contentAngles: [
      "A common problem the audience immediately recognizes",
      "A mistake that is costing them time or money",
      "A transformation from before to after",
      "What makes this solution simpler",
      "The first step toward the desired result",
    ],

    strongestHookDirection:
      "Open with a specific situation the audience recognizes immediately, then reveal a simpler path forward.",

    strongestCallToAction:
      "Take the clearest next step toward solving the problem.",
  };
}

function inferAwarenessLevel(
  context: KaiBusinessContext,
): KaiAudienceProfile["awarenessLevel"] {
  const stage = context.currentStage;

  if (stage === "idea" || stage === "starting") {
    return "problem-aware";
  }

  if (
    stage === "growing" ||
    stage === "established"
  ) {
    return "mixed";
  }

  return "mixed";
}

export async function createKaiAudienceProfile(
  context: KaiBusinessContext,
): Promise<KaiAudienceProfile> {
  const searchableContext =
    buildSearchableContext(context);

  const rankedPresets = audiencePresets
    .map((preset) => ({
      preset,
      score: scorePreset(
        searchableContext,
        preset,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const strongestMatch = rankedPresets[0];

  const selectedPreset =
    strongestMatch &&
    strongestMatch.score > 0
      ? strongestMatch.preset
      : createGeneralProfile(context);

  const previousInsights =
    context.previousContentInsights ?? [];

  const profile: KaiAudienceProfile = {
    primaryAudience:
      context.knownAudience?.trim() ||
      selectedPreset.primaryAudience,

    secondaryAudiences: unique(
      selectedPreset.secondaryAudiences,
    ),

    awarenessLevel:
      inferAwarenessLevel(context),

    currentSituation: unique(
      selectedPreset.currentSituation,
    ),

    painPoints: unique(
      selectedPreset.painPoints,
    ),

    emotionalTriggers: unique(
      selectedPreset.emotionalTriggers,
    ),

    motivations: unique(
      selectedPreset.motivations,
    ),

    objections: unique(
      selectedPreset.objections,
    ),

    buyingReasons: unique(
      selectedPreset.buyingReasons,
    ),

    languageStyle:
      selectedPreset.languageStyle,

    trustSignals: unique(
      selectedPreset.trustSignals,
    ),

    contentAngles: unique([
      ...selectedPreset.contentAngles,
      ...previousInsights,
    ]),

    strongestHookDirection:
      selectedPreset.strongestHookDirection,

    strongestCallToAction:
      selectedPreset.strongestCallToAction,

    confidence:
      strongestMatch &&
      strongestMatch.score > 0
        ? Math.min(
            98,
            76 + strongestMatch.score * 4,
          )
        : 68,

    reasoning: unique([
      context.businessType
        ? `The business type is ${context.businessType}.`
        : "",

      context.niche
        ? `The identified niche is ${context.niche}.`
        : "",

      context.primaryGoal
        ? `The current business goal is ${context.primaryGoal}.`
        : "",

      strongestMatch &&
      strongestMatch.score > 0
        ? `KAI matched the business to audience behavior associated with: ${strongestMatch.preset.keywords
            .slice(0, 4)
            .join(", ")}.`
        : "KAI created a broad starting profile because the available business information did not strongly match a specialized audience model.",

      previousInsights.length
        ? "Previous content insights were included so the profile can improve from observed performance."
        : "No previous content-performance insights were available yet.",
    ]),
  };

  return profile;
}

export function summarizeKaiAudienceProfile(
  profile: KaiAudienceProfile,
) {
  return {
    audience: profile.primaryAudience,
    painPoints: profile.painPoints.slice(0, 5),
    motivations: profile.motivations.slice(0, 5),
    objections: profile.objections.slice(0, 4),
    contentAngles: profile.contentAngles.slice(0, 6),
    hookDirection:
      profile.strongestHookDirection,
    callToAction:
      profile.strongestCallToAction,
    confidence: profile.confidence,
  };
}

export function describeKaiAudience(
  context: KaiBusinessContext,
  profile: KaiAudienceProfile,
) {
  const business =
    normalizeText(context.businessName) ||
    normalizeText(context.businessType) ||
    "the business";

  return [
    `KAI analyzed ${business}.`,
    `The strongest audience is ${profile.primaryAudience}`,
    `The strongest emotional direction is ${profile.emotionalTriggers
      .slice(0, 3)
      .join(", ")}.`,
    `The recommended hook direction is: ${profile.strongestHookDirection}`,
  ].join(" ");
}