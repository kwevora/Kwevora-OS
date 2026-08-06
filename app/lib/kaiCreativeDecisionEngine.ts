import type {
  KaiAudienceProfile,
  KaiBusinessContext,
} from "./kaiAudienceIntelligence";

export type KaiContentObjective =
  | "awareness"
  | "trust"
  | "engagement"
  | "education"
  | "lead-generation"
  | "sales"
  | "retention";

export type KaiCreativeFormat =
  | "cinematic-short-film"
  | "emotional-documentary"
  | "movie-trailer"
  | "educational-breakdown"
  | "problem-solution"
  | "before-and-after"
  | "social-proof"
  | "behind-the-scenes"
  | "product-demonstration"
  | "luxury-commercial"
  | "three-dimensional-visualization"
  | "animated-explainer";

export type KaiVisualTreatment =
  | "cinematic-realism"
  | "documentary-realism"
  | "premium-commercial"
  | "high-energy-social"
  | "minimal-modern"
  | "futuristic"
  | "three-dimensional"
  | "warm-lifestyle"
  | "raw-authentic";

export type KaiNarrativeStructure =
  | "hook-problem-solution-action"
  | "before-struggle-turning-point-after"
  | "question-reveal-proof-action"
  | "future-self-warning-decision-result"
  | "mistake-consequence-correction-result"
  | "demonstration-proof-invitation"
  | "story-lesson-opportunity-action"
  | "pattern-interrupt-explanation-payoff";

export type KaiEndingStyle =
  | "soft-invitation"
  | "direct-call-to-action"
  | "product-reveal"
  | "emotional-resolution"
  | "open-question"
  | "cliffhanger"
  | "proof-driven-close"
  | "brand-statement";

export type KaiPacingStyle =
  | "slow-cinematic"
  | "steady-emotional"
  | "balanced"
  | "fast-social"
  | "rapid-montage";

export type KaiMusicDirection = {
  style: string;
  emotionalProgression: string;
  energyLevel: number;
  instruments: string[];
  avoid: string[];
};

export type KaiCreativeScore = {
  format: KaiCreativeFormat;
  score: number;
  reasons: string[];
};

export type KaiCreativeDecision = {
  id: string;
  topic: string;

  objective: KaiContentObjective;
  objectiveReason: string;

  selectedFormat: KaiCreativeFormat;
  formatConfidence: number;
  formatReasoning: string[];

  alternativeFormats: KaiCreativeScore[];

  narrativeStructure: KaiNarrativeStructure;
  narrativeReason: string;

  visualTreatment: KaiVisualTreatment;
  visualReason: string;

  emotionalJourney: string[];
  dominantEmotion: string;

  hookStrategy: string;
  openingVisual: string;
  patternInterrupt: string;

  pacing: KaiPacingStyle;
  recommendedDurationSeconds: number;
  sceneCount: number;

  music: KaiMusicDirection;

  endingStyle: KaiEndingStyle;
  endingDirection: string;
  callToAction: string;

  useThreeDimensionalElements: boolean;
  threeDimensionalDirection?: string;

  creativeRules: string[];
  risksToAvoid: string[];

  decisionSummary: string;
};

export type CreateKaiCreativeDecisionInput = {
  topic: string;
  business: KaiBusinessContext;
  audience: KaiAudienceProfile;

  objective?: KaiContentObjective;
  platform?: string;
  desiredDurationSeconds?: number;

  productName?: string;
  offerDescription?: string;
  destination?: string;

  previousPerformanceInsights?: string[];
};

type FormatDefinition = {
  format: KaiCreativeFormat;
  strengths: KaiContentObjective[];
  emotionalFit: string[];
  keywords: string[];
  baseScore: number;
};

const formatDefinitions: FormatDefinition[] = [
  {
    format: "cinematic-short-film",
    strengths: [
      "awareness",
      "trust",
      "engagement",
      "sales",
    ],
    emotionalFit: [
      "hope",
      "freedom",
      "pressure",
      "determination",
      "transformation",
    ],
    keywords: [
      "journey",
      "future",
      "dream",
      "freedom",
      "change",
      "life",
      "family",
      "struggle",
      "business",
      "story",
    ],
    baseScore: 72,
  },
  {
    format: "emotional-documentary",
    strengths: [
      "awareness",
      "trust",
      "engagement",
    ],
    emotionalFit: [
      "struggle",
      "honesty",
      "pressure",
      "relief",
      "hope",
    ],
    keywords: [
      "real",
      "truth",
      "behind",
      "struggle",
      "work",
      "family",
      "journey",
      "story",
      "why",
    ],
    baseScore: 70,
  },
  {
    format: "movie-trailer",
    strengths: [
      "awareness",
      "engagement",
      "sales",
    ],
    emotionalFit: [
      "urgency",
      "excitement",
      "curiosity",
      "power",
      "anticipation",
    ],
    keywords: [
      "launch",
      "coming",
      "introducing",
      "future",
      "change",
      "revolution",
      "power",
      "new",
    ],
    baseScore: 65,
  },
  {
    format: "educational-breakdown",
    strengths: [
      "education",
      "trust",
      "lead-generation",
    ],
    emotionalFit: [
      "clarity",
      "confidence",
      "relief",
      "curiosity",
    ],
    keywords: [
      "how",
      "why",
      "steps",
      "mistakes",
      "tips",
      "guide",
      "learn",
      "explain",
      "what",
    ],
    baseScore: 68,
  },
  {
    format: "problem-solution",
    strengths: [
      "awareness",
      "lead-generation",
      "sales",
      "education",
    ],
    emotionalFit: [
      "frustration",
      "fear",
      "relief",
      "confidence",
    ],
    keywords: [
      "problem",
      "fix",
      "solve",
      "stop",
      "avoid",
      "struggling",
      "difficult",
      "easy",
      "simple",
    ],
    baseScore: 75,
  },
  {
    format: "before-and-after",
    strengths: [
      "trust",
      "engagement",
      "sales",
    ],
    emotionalFit: [
      "surprise",
      "relief",
      "achievement",
      "transformation",
    ],
    keywords: [
      "before",
      "after",
      "transformation",
      "result",
      "changed",
      "improvement",
      "progress",
    ],
    baseScore: 67,
  },
  {
    format: "social-proof",
    strengths: [
      "trust",
      "lead-generation",
      "sales",
    ],
    emotionalFit: [
      "confidence",
      "belonging",
      "relief",
      "hope",
    ],
    keywords: [
      "customer",
      "client",
      "review",
      "testimonial",
      "result",
      "success",
      "proof",
      "sale",
    ],
    baseScore: 63,
  },
  {
    format: "behind-the-scenes",
    strengths: [
      "trust",
      "engagement",
      "retention",
    ],
    emotionalFit: [
      "curiosity",
      "authenticity",
      "connection",
      "confidence",
    ],
    keywords: [
      "behind",
      "process",
      "day",
      "building",
      "making",
      "inside",
      "workflow",
      "team",
    ],
    baseScore: 62,
  },
  {
    format: "product-demonstration",
    strengths: [
      "education",
      "lead-generation",
      "sales",
    ],
    emotionalFit: [
      "curiosity",
      "relief",
      "confidence",
      "surprise",
    ],
    keywords: [
      "app",
      "software",
      "tool",
      "product",
      "feature",
      "demo",
      "works",
      "create",
      "automatic",
    ],
    baseScore: 76,
  },
  {
    format: "luxury-commercial",
    strengths: [
      "awareness",
      "trust",
      "sales",
    ],
    emotionalFit: [
      "desire",
      "confidence",
      "aspiration",
      "exclusivity",
    ],
    keywords: [
      "premium",
      "luxury",
      "elegant",
      "exclusive",
      "quality",
      "brand",
      "experience",
    ],
    baseScore: 58,
  },
  {
    format: "three-dimensional-visualization",
    strengths: [
      "awareness",
      "engagement",
      "education",
      "sales",
    ],
    emotionalFit: [
      "wonder",
      "surprise",
      "curiosity",
      "excitement",
    ],
    keywords: [
      "3d",
      "system",
      "inside",
      "future",
      "technology",
      "visualize",
      "process",
      "platform",
      "engine",
      "world",
    ],
    baseScore: 60,
  },
  {
    format: "animated-explainer",
    strengths: [
      "education",
      "awareness",
      "lead-generation",
    ],
    emotionalFit: [
      "clarity",
      "curiosity",
      "confidence",
      "relief",
    ],
    keywords: [
      "explain",
      "system",
      "steps",
      "process",
      "simple",
      "understand",
      "how",
      "works",
    ],
    baseScore: 64,
  },
];

function cleanText(value?: string) {
  return value?.trim() ?? "";
}

function normalizeText(value?: string) {
  return cleanText(value).toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function createDecisionId(topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `creative-decision-${slug || "untitled"}`;
}

function inferObjective(
  input: CreateKaiCreativeDecisionInput,
): {
  objective: KaiContentObjective;
  reason: string;
} {
  if (input.objective) {
    return {
      objective: input.objective,
      reason:
        "The objective was provided directly for this piece of content.",
    };
  }

  const searchable = [
    input.topic,
    input.business.primaryGoal,
    input.offerDescription,
    input.destination,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    searchable.includes("buy") ||
    searchable.includes("sale") ||
    searchable.includes("purchase") ||
    searchable.includes("offer") ||
    searchable.includes("subscribe")
  ) {
    return {
      objective: "sales",
      reason:
        "The topic and business goal indicate that the content should move viewers toward a purchase.",
    };
  }

  if (
    searchable.includes("lead") ||
    searchable.includes("book") ||
    searchable.includes("call") ||
    searchable.includes("quote") ||
    searchable.includes("consultation")
  ) {
    return {
      objective: "lead-generation",
      reason:
        "The strongest likely outcome is generating an inquiry, booking, quote, or contact.",
    };
  }

  if (
    searchable.includes("how") ||
    searchable.includes("teach") ||
    searchable.includes("explain") ||
    searchable.includes("guide") ||
    searchable.includes("tips")
  ) {
    return {
      objective: "education",
      reason:
        "The topic is best served by teaching the audience something useful and understandable.",
    };
  }

  if (
    searchable.includes("trust") ||
    searchable.includes("story") ||
    searchable.includes("why") ||
    searchable.includes("journey")
  ) {
    return {
      objective: "trust",
      reason:
        "The topic is positioned to deepen trust and emotional connection with the business.",
    };
  }

  if (
    input.business.currentStage === "idea" ||
    input.business.currentStage === "starting"
  ) {
    return {
      objective: "awareness",
      reason:
        "The business is early in its development, so building awareness is the strongest default objective.",
    };
  }

  return {
    objective: "engagement",
    reason:
      "No stronger conversion objective was detected, so KAI selected engagement to earn attention and learn from audience response.",
  };
}

function scoreFormat(
  definition: FormatDefinition,
  input: CreateKaiCreativeDecisionInput,
  objective: KaiContentObjective,
) {
  let score = definition.baseScore;
  const reasons: string[] = [];

  const searchable = [
    input.topic,
    input.business.businessType,
    input.business.niche,
    input.business.description,
    input.business.primaryGoal,
    input.offerDescription,
    ...input.audience.painPoints,
    ...input.audience.emotionalTriggers,
    ...input.audience.motivations,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (definition.strengths.includes(objective)) {
    score += 18;
    reasons.push(
      `${definition.format} is well suited to the ${objective} objective.`,
    );
  }

  const matchedKeywords = definition.keywords.filter(
    (keyword) => searchable.includes(keyword),
  );

  if (matchedKeywords.length > 0) {
    score += Math.min(16, matchedKeywords.length * 4);
    reasons.push(
      `The topic matches creative signals including ${matchedKeywords
        .slice(0, 4)
        .join(", ")}.`,
    );
  }

  const audienceEmotions = input.audience.emotionalTriggers
    .join(" ")
    .toLowerCase();

  const matchedEmotions = definition.emotionalFit.filter(
    (emotion) => audienceEmotions.includes(emotion),
  );

  if (matchedEmotions.length > 0) {
    score += Math.min(12, matchedEmotions.length * 4);
    reasons.push(
      `The format supports audience emotions including ${matchedEmotions.join(
        ", ",
      )}.`,
    );
  }

  const businessText = [
    input.business.businessType,
    input.business.niche,
    input.business.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isTechnologyBusiness =
    businessText.includes("software") ||
    businessText.includes("app") ||
    businessText.includes("technology") ||
    businessText.includes("ai") ||
    businessText.includes("automation");

  if (
    isTechnologyBusiness &&
    definition.format === "product-demonstration"
  ) {
    score += 14;
    reasons.push(
      "The business is technology-related, making a visible product demonstration especially persuasive.",
    );
  }

  if (
    isTechnologyBusiness &&
    definition.format ===
      "three-dimensional-visualization"
  ) {
    score += 9;
    reasons.push(
      "Three-dimensional visuals can make an invisible software process feel physical and memorable.",
    );
  }

  const isLocalService =
    businessText.includes("roof") ||
    businessText.includes("plumb") ||
    businessText.includes("hvac") ||
    businessText.includes("contract") ||
    businessText.includes("landscap") ||
    businessText.includes("repair");

  if (
    isLocalService &&
    definition.format === "problem-solution"
  ) {
    score += 14;
    reasons.push(
      "Local service customers respond strongly to visible problems followed by clear solutions.",
    );
  }

  if (
    input.previousPerformanceInsights?.some((insight) =>
      insight
        .toLowerCase()
        .includes(definition.format.replaceAll("-", " ")),
    )
  ) {
    score += 12;
    reasons.push(
      "Previous performance information supports using this creative format again.",
    );
  }

  return {
    format: definition.format,
    score: Math.min(100, score),
    reasons,
  };
}

function selectNarrativeStructure(
  format: KaiCreativeFormat,
  objective: KaiContentObjective,
): {
  structure: KaiNarrativeStructure;
  reason: string;
} {
  if (
    format === "product-demonstration" ||
    format === "three-dimensional-visualization"
  ) {
    return {
      structure: "demonstration-proof-invitation",
      reason:
        "The viewer should see the result, understand how it works, receive proof, and then be invited to act.",
    };
  }

  if (
    format === "educational-breakdown" ||
    format === "animated-explainer"
  ) {
    return {
      structure: "mistake-consequence-correction-result",
      reason:
        "Teaching becomes more compelling when KAI first exposes a recognizable mistake and then demonstrates the correction.",
    };
  }

  if (format === "before-and-after") {
    return {
      structure:
        "before-struggle-turning-point-after",
      reason:
        "The transformation should be unmistakable, emotionally clear, and easy to follow.",
    };
  }

  if (format === "movie-trailer") {
    return {
      structure:
        "pattern-interrupt-explanation-payoff",
      reason:
        "A trailer must immediately disrupt attention, increase anticipation, and deliver a strong final reveal.",
    };
  }

  if (
    format === "cinematic-short-film" ||
    format === "emotional-documentary"
  ) {
    return {
      structure: "story-lesson-opportunity-action",
      reason:
        "The emotional story should lead naturally into a lesson, an opportunity, and a believable next move.",
    };
  }

  if (
    objective === "lead-generation" ||
    objective === "sales"
  ) {
    return {
      structure: "hook-problem-solution-action",
      reason:
        "Conversion content should clearly connect the viewer's problem to the solution and next action.",
    };
  }

  return {
    structure: "question-reveal-proof-action",
    reason:
      "Curiosity should open the video before KAI reveals the answer, supports it with proof, and closes with direction.",
  };
}

function selectVisualTreatment(
  format: KaiCreativeFormat,
): {
  treatment: KaiVisualTreatment;
  reason: string;
} {
  const map: Record<
    KaiCreativeFormat,
    {
      treatment: KaiVisualTreatment;
      reason: string;
    }
  > = {
    "cinematic-short-film": {
      treatment: "cinematic-realism",
      reason:
        "Realistic cinematic imagery will make the emotional story feel believable rather than artificial.",
    },

    "emotional-documentary": {
      treatment: "documentary-realism",
      reason:
        "Natural environments, honest details, and restrained camera work strengthen trust.",
    },

    "movie-trailer": {
      treatment: "futuristic",
      reason:
        "Dramatic lighting, large visual reveals, and heightened motion support trailer-style anticipation.",
    },

    "educational-breakdown": {
      treatment: "minimal-modern",
      reason:
        "Clean visuals keep the explanation easy to understand without distracting from the lesson.",
    },

    "problem-solution": {
      treatment: "cinematic-realism",
      reason:
        "The audience should clearly recognize the real-world problem before seeing the relief of the solution.",
    },

    "before-and-after": {
      treatment: "high-energy-social",
      reason:
        "Fast visual contrast makes the transformation immediately understandable.",
    },

    "social-proof": {
      treatment: "raw-authentic",
      reason:
        "Authenticity is more persuasive than excessive polish when presenting proof.",
    },

    "behind-the-scenes": {
      treatment: "raw-authentic",
      reason:
        "The audience should feel as though they are seeing the real process rather than a staged commercial.",
    },

    "product-demonstration": {
      treatment: "premium-commercial",
      reason:
        "The product should look polished while remaining clear enough for viewers to understand immediately.",
    },

    "luxury-commercial": {
      treatment: "premium-commercial",
      reason:
        "Controlled lighting, detail shots, and deliberate pacing create perceived quality.",
    },

    "three-dimensional-visualization": {
      treatment: "three-dimensional",
      reason:
        "Spatial movement and dimensional objects can make systems, data, and invisible processes visually understandable.",
    },

    "animated-explainer": {
      treatment: "minimal-modern",
      reason:
        "Simple animation and focused movement make complex ideas easier to follow.",
    },
  };

  return map[format];
}

function selectEmotionalJourney(
  objective: KaiContentObjective,
  audience: KaiAudienceProfile,
) {
  const trigger =
    audience.emotionalTriggers[0] || "curiosity";

  const motivation =
    audience.motivations[0] || "progress";

  const maps: Record<KaiContentObjective, string[]> = {
    awareness: [
      "curiosity",
      trigger,
      "recognition",
      "possibility",
    ],

    trust: [
      "recognition",
      "understanding",
      "relief",
      "confidence",
    ],

    engagement: [
      "surprise",
      "curiosity",
      "emotional connection",
      "anticipation",
    ],

    education: [
      "confusion",
      "curiosity",
      "clarity",
      "confidence",
    ],

    "lead-generation": [
      "frustration",
      "recognition",
      "relief",
      "readiness",
    ],

    sales: [
      "desire",
      "tension",
      "proof",
      "confidence",
      motivation,
    ],

    retention: [
      "familiarity",
      "value",
      "progress",
      "belonging",
    ],
  };

  return unique(maps[objective]);
}

function selectPacing(
  format: KaiCreativeFormat,
  platform?: string,
): KaiPacingStyle {
  const normalizedPlatform =
    normalizeText(platform);

  if (
    format === "movie-trailer" ||
    format === "before-and-after"
  ) {
    return "rapid-montage";
  }

  if (
    normalizedPlatform.includes("tiktok") ||
    normalizedPlatform.includes("reel") ||
    normalizedPlatform.includes("short")
  ) {
    return "fast-social";
  }

  if (
    format === "cinematic-short-film"
  ) {
    return "slow-cinematic";
  }

  if (
    format === "emotional-documentary"
  ) {
    return "steady-emotional";
  }

  return "balanced";
}

function determineDuration(
  input: CreateKaiCreativeDecisionInput,
  pacing: KaiPacingStyle,
) {
  if (input.desiredDurationSeconds) {
    return Math.max(
      15,
      Math.min(180, input.desiredDurationSeconds),
    );
  }

  const platform = normalizeText(input.platform);

  if (
    platform.includes("tiktok") ||
    platform.includes("reel") ||
    platform.includes("short")
  ) {
    return pacing === "rapid-montage" ? 30 : 42;
  }

  if (pacing === "slow-cinematic") {
    return 60;
  }

  return 45;
}

function determineSceneCount(
  durationSeconds: number,
  pacing: KaiPacingStyle,
) {
  const secondsPerScene: Record<
    KaiPacingStyle,
    number
  > = {
    "slow-cinematic": 7,
    "steady-emotional": 6,
    balanced: 5,
    "fast-social": 4,
    "rapid-montage": 3,
  };

  return Math.max(
    4,
    Math.min(
      12,
      Math.round(
        durationSeconds /
          secondsPerScene[pacing],
      ),
    ),
  );
}

function createMusicDirection(
  format: KaiCreativeFormat,
  journey: string[],
): KaiMusicDirection {
  const finalEmotion =
    journey[journey.length - 1] || "confidence";

  const map: Record<
    KaiCreativeFormat,
    KaiMusicDirection
  > = {
    "cinematic-short-film": {
      style:
        "Emotional cinematic score that begins intimate and grows into a powerful, hopeful resolution",
      emotionalProgression: `Quiet tension into ${finalEmotion}`,
      energyLevel: 6,
      instruments: [
        "soft piano",
        "warm strings",
        "subtle percussion",
        "cinematic bass",
      ],
      avoid: [
        "cheerful corporate music",
        "overly dramatic trailer hits",
        "generic stock-music loops",
      ],
    },

    "emotional-documentary": {
      style:
        "Restrained documentary score with natural emotional growth",
      emotionalProgression: `Honesty into ${finalEmotion}`,
      energyLevel: 4,
      instruments: [
        "felt piano",
        "ambient texture",
        "light strings",
        "soft pulse",
      ],
      avoid: [
        "heavy percussion",
        "melodramatic swells",
        "distracting melodies",
      ],
    },

    "movie-trailer": {
      style:
        "Modern cinematic trailer score with suspense, impact, and a large final rise",
      emotionalProgression: `Mystery into ${finalEmotion}`,
      energyLevel: 9,
      instruments: [
        "cinematic drums",
        "deep bass",
        "braams",
        "rising synths",
        "orchestral strings",
      ],
      avoid: [
        "constant maximum volume",
        "dated action music",
        "overcrowded sound design",
      ],
    },

    "educational-breakdown": {
      style:
        "Focused modern rhythm that supports clarity without competing with narration",
      emotionalProgression: `Curiosity into ${finalEmotion}`,
      energyLevel: 5,
      instruments: [
        "light electronic pulse",
        "soft percussion",
        "minimal synth",
      ],
      avoid: [
        "emotional orchestral music",
        "aggressive bass",
        "busy melodies",
      ],
    },

    "problem-solution": {
      style:
        "Tense opening pulse resolving into a confident uplifting beat",
      emotionalProgression: `Frustration into ${finalEmotion}`,
      energyLevel: 6,
      instruments: [
        "low pulse",
        "subtle piano",
        "modern drums",
        "warm synth",
      ],
      avoid: [
        "comedic music",
        "false urgency",
        "overly cheerful openings",
      ],
    },

    "before-and-after": {
      style:
        "Energetic transformation music with a strong reveal moment",
      emotionalProgression: `Anticipation into ${finalEmotion}`,
      energyLevel: 8,
      instruments: [
        "punchy drums",
        "riser",
        "impact",
        "bright synth",
      ],
      avoid: [
        "slow introductions",
        "flat energy",
        "weak reveal moments",
      ],
    },

    "social-proof": {
      style:
        "Warm, trustworthy music that leaves space for authentic voices and proof",
      emotionalProgression: `Uncertainty into ${finalEmotion}`,
      energyLevel: 4,
      instruments: [
        "warm piano",
        "light guitar",
        "soft percussion",
      ],
      avoid: [
        "sales-heavy music",
        "dramatic trailer scoring",
        "overly polished corporate tracks",
      ],
    },

    "behind-the-scenes": {
      style:
        "Natural modern rhythm that feels active, human, and unscripted",
      emotionalProgression: `Curiosity into ${finalEmotion}`,
      energyLevel: 5,
      instruments: [
        "light drums",
        "muted guitar",
        "subtle bass",
      ],
      avoid: [
        "epic orchestration",
        "luxury commercial music",
        "overly emotional scoring",
      ],
    },

    "product-demonstration": {
      style:
        "Premium modern electronic track with precise movement and a confident finish",
      emotionalProgression: `Curiosity into ${finalEmotion}`,
      energyLevel: 7,
      instruments: [
        "clean synth",
        "electronic pulse",
        "tight percussion",
        "sub bass",
      ],
      avoid: [
        "generic corporate ukulele",
        "chaotic sound design",
        "music louder than the demonstration",
      ],
    },

    "luxury-commercial": {
      style:
        "Minimal premium score with space, texture, and controlled intensity",
      emotionalProgression: `Intrigue into ${finalEmotion}`,
      energyLevel: 5,
      instruments: [
        "deep ambient bass",
        "single piano notes",
        "textural percussion",
        "soft strings",
      ],
      avoid: [
        "busy rhythms",
        "cheap-sounding synths",
        "over-explaining through music",
      ],
    },

    "three-dimensional-visualization": {
      style:
        "Immersive futuristic soundscape synchronized with spatial movement",
      emotionalProgression: `Wonder into ${finalEmotion}`,
      energyLevel: 7,
      instruments: [
        "spatial synth",
        "deep pulse",
        "digital impacts",
        "cinematic riser",
      ],
      avoid: [
        "retro science-fiction sounds",
        "constant glitch effects",
        "overly mechanical repetition",
      ],
    },

    "animated-explainer": {
      style:
        "Friendly modern electronic rhythm supporting visual explanations",
      emotionalProgression: `Confusion into ${finalEmotion}`,
      energyLevel: 5,
      instruments: [
        "light synth",
        "soft percussion",
        "simple melodic pulse",
      ],
      avoid: [
        "childish cartoon music",
        "excessive sound effects",
        "dramatic scoring",
      ],
    },
  };

  return map[format];
}

function selectEnding(
  objective: KaiContentObjective,
  format: KaiCreativeFormat,
  audience: KaiAudienceProfile,
  destination?: string,
) {
  if (format === "movie-trailer") {
    return {
      style: "product-reveal" as KaiEndingStyle,
      direction:
        "Build to the strongest visual reveal, briefly hold the brand or offer on screen, and end before the energy falls.",
    };
  }

  if (
    objective === "sales" ||
    objective === "lead-generation"
  ) {
    return {
      style:
        "direct-call-to-action" as KaiEndingStyle,
      direction: destination
        ? `Clearly show the next action and direct the viewer toward ${destination}.`
        : "Clearly show the next action without introducing a second competing request.",
    };
  }

  if (
    format === "cinematic-short-film" ||
    format === "emotional-documentary"
  ) {
    return {
      style:
        "emotional-resolution" as KaiEndingStyle,
      direction:
        "Resolve the emotional tension, connect the lesson to the viewer's life, and close with one believable next move.",
    };
  }

  if (objective === "engagement") {
    return {
      style: "open-question" as KaiEndingStyle,
      direction:
        "End with a specific question that encourages the viewer to respond from personal experience.",
    };
  }

  return {
    style: "soft-invitation" as KaiEndingStyle,
    direction:
      audience.strongestCallToAction ||
      "Invite the viewer to take one clear next step.",
  };
}

function shouldUseThreeDimensionalElements(
  selectedFormat: KaiCreativeFormat,
  input: CreateKaiCreativeDecisionInput,
) {
  if (
    selectedFormat ===
    "three-dimensional-visualization"
  ) {
    return true;
  }

  const searchable = [
    input.topic,
    input.business.businessType,
    input.business.niche,
    input.business.description,
    input.offerDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    searchable.includes("software") ||
    searchable.includes("app") ||
    searchable.includes("ai") ||
    searchable.includes("system") ||
    searchable.includes("technology") ||
    searchable.includes("future")
  );
}

function createOpeningVisual(
  format: KaiCreativeFormat,
  input: CreateKaiCreativeDecisionInput,
) {
  const painPoint =
    input.audience.painPoints[0] ||
    "the audience's most recognizable struggle";

  const product =
    cleanText(input.productName) ||
    cleanText(input.business.businessName) ||
    "the solution";

  if (format === "product-demonstration") {
    return `Open on the finished result created by ${product}, not on a menu, logo, or explanation.`;
  }

  if (
    format === "three-dimensional-visualization"
  ) {
    return `Open inside a three-dimensional representation of the problem, then reveal how ${product} reorganizes or solves it.`;
  }

  if (
    format === "cinematic-short-film" ||
    format === "emotional-documentary"
  ) {
    return `Open on a human moment that visually communicates ${painPoint} before any explanation begins.`;
  }

  if (format === "movie-trailer") {
    return `Open with a visually impossible-to-ignore glimpse of the final transformation, followed by an abrupt cut to darkness.`;
  }

  if (format === "before-and-after") {
    return `Show the final transformation for less than one second, then return immediately to the starting point.`;
  }

  return `Open with a specific visual example of ${painPoint} that the audience can recognize without reading a caption.`;
}

function createPatternInterrupt(
  format: KaiCreativeFormat,
) {
  const map: Record<KaiCreativeFormat, string> = {
    "cinematic-short-film":
      "Begin with an unfinished emotional moment rather than an introduction.",

    "emotional-documentary":
      "Use a quiet, unusually honest image while the first narration line challenges a common assumption.",

    "movie-trailer":
      "Use a dramatic sound drop, one-frame reveal, or sudden shift from darkness into motion.",

    "educational-breakdown":
      "Present the result or surprising truth before explaining the steps.",

    "problem-solution":
      "Show the consequence of the problem before naming the problem itself.",

    "before-and-after":
      "Flash the finished transformation before revealing the starting condition.",

    "social-proof":
      "Open with the strongest believable result before identifying who achieved it.",

    "behind-the-scenes":
      "Begin in the middle of real work rather than with a greeting or setup.",

    "product-demonstration":
      "Start with the product completing meaningful work immediately.",

    "luxury-commercial":
      "Use an extreme-detail shot that makes an ordinary object or action feel unfamiliar.",

    "three-dimensional-visualization":
      "Move the camera through an object, interface, or system that could not be filmed conventionally.",

    "animated-explainer":
      "Transform the audience's problem into a moving visual metaphor within the first second.",
  };

  return map[format];
}

function buildCreativeRules(
  input: CreateKaiCreativeDecisionInput,
  format: KaiCreativeFormat,
) {
  return unique([
    "Do not begin with a logo, greeting, or explanation.",
    "Every scene must either increase curiosity, deepen emotion, provide proof, or move the viewer toward action.",
    "Show the meaning visually before repeating it in narration or captions.",
    "Use captions to strengthen important moments, not to display the entire script.",
    "Keep each scene visually distinct while preserving one consistent world and color direction.",
    "The call to action must feel like the natural conclusion of the story.",
    "Do not make claims that the business cannot honestly support.",
    input.audience.languageStyle
      ? `Use this audience language style: ${input.audience.languageStyle}`
      : "",
    format === "three-dimensional-visualization"
      ? "Three-dimensional effects must clarify the idea rather than exist only as decoration."
      : "",
  ]);
}

function buildRisksToAvoid(
  input: CreateKaiCreativeDecisionInput,
) {
  return unique([
    "Generic motivational footage disconnected from the business or offer",
    "Scenes that repeat the same emotional beat",
    "Excessive text covering important visuals",
    "A slow opening that explains before earning attention",
    "Stock footage that feels staged or unrelated",
    "Music that competes with narration",
    "Several calls to action in the same video",
    "Promises of guaranteed or unrealistic results",
    ...input.audience.objections
      .slice(0, 3)
      .map(
        (objection) =>
          `Do not accidentally reinforce this objection: ${objection}`,
      ),
  ]);
}

export async function createKaiCreativeDecision(
  input: CreateKaiCreativeDecisionInput,
): Promise<KaiCreativeDecision> {
  const topic =
    cleanText(input.topic) ||
    "Take one meaningful step forward";

  const inferredObjective =
    inferObjective(input);

  const rankedFormats = formatDefinitions
    .map((definition) =>
      scoreFormat(
        definition,
        input,
        inferredObjective.objective,
      ),
    )
    .sort((a, b) => b.score - a.score);

  const selected =
    rankedFormats[0] ??
    ({
      format:
        "problem-solution" as KaiCreativeFormat,
      score: 70,
      reasons: [
        "KAI selected a flexible problem-and-solution structure as the safest creative starting point.",
      ],
    } satisfies KaiCreativeScore);

  const narrative = selectNarrativeStructure(
    selected.format,
    inferredObjective.objective,
  );

  const visual = selectVisualTreatment(
    selected.format,
  );

  const emotionalJourney =
    selectEmotionalJourney(
      inferredObjective.objective,
      input.audience,
    );

  const pacing = selectPacing(
    selected.format,
    input.platform,
  );

  const recommendedDurationSeconds =
    determineDuration(input, pacing);

  const sceneCount = determineSceneCount(
    recommendedDurationSeconds,
    pacing,
  );

  const ending = selectEnding(
    inferredObjective.objective,
    selected.format,
    input.audience,
    input.destination,
  );

  const useThreeDimensionalElements =
    shouldUseThreeDimensionalElements(
      selected.format,
      input,
    );

  const callToAction =
    input.audience.strongestCallToAction ||
    "Take the clearest next step.";

  const alternativeFormats =
    rankedFormats
      .slice(1, 4)
      .map((result) => ({
        ...result,
        reasons:
          result.reasons.length > 0
            ? result.reasons
            : [
                "This format remains a useful alternative but scored below the selected direction.",
              ],
      }));

  const decision: KaiCreativeDecision = {
    id: createDecisionId(topic),
    topic,

    objective: inferredObjective.objective,
    objectiveReason: inferredObjective.reason,

    selectedFormat: selected.format,
    formatConfidence: selected.score,
    formatReasoning:
      selected.reasons.length > 0
        ? selected.reasons
        : [
            "The selected format provides the strongest balance of audience fit, objective fit, and creative flexibility.",
          ],

    alternativeFormats,

    narrativeStructure:
      narrative.structure,
    narrativeReason: narrative.reason,

    visualTreatment: visual.treatment,
    visualReason: visual.reason,

    emotionalJourney,
    dominantEmotion:
      emotionalJourney[
        emotionalJourney.length - 1
      ] || "confidence",

    hookStrategy:
      input.audience.strongestHookDirection,
    openingVisual: createOpeningVisual(
      selected.format,
      input,
    ),
    patternInterrupt:
      createPatternInterrupt(selected.format),

    pacing,
    recommendedDurationSeconds,
    sceneCount,

    music: createMusicDirection(
      selected.format,
      emotionalJourney,
    ),

    endingStyle: ending.style,
    endingDirection: ending.direction,
    callToAction,

    useThreeDimensionalElements,
    threeDimensionalDirection:
      useThreeDimensionalElements
        ? "Use dimensional movement, depth, particles, interface layers, environmental transitions, or objects entering the viewer's space. Every effect must support the story or explain the system."
        : undefined,

    creativeRules: buildCreativeRules(
      input,
      selected.format,
    ),

    risksToAvoid: buildRisksToAvoid(input),

    decisionSummary: [
      `KAI selected ${selected.format.replaceAll(
        "-",
        " ",
      )}.`,
      `The primary objective is ${inferredObjective.objective}.`,
      `The video should move the viewer through ${emotionalJourney.join(
        " → ",
      )}.`,
      `The recommended treatment is ${visual.treatment.replaceAll(
        "-",
        " ",
      )}.`,
      `The video should run approximately ${recommendedDurationSeconds} seconds across ${sceneCount} scenes.`,
    ].join(" "),
  };

  return decision;
}

export function summarizeKaiCreativeDecision(
  decision: KaiCreativeDecision,
) {
  return {
    objective: decision.objective,
    format: decision.selectedFormat,
    confidence: decision.formatConfidence,
    narrative: decision.narrativeStructure,
    visualTreatment:
      decision.visualTreatment,
    emotionalJourney:
      decision.emotionalJourney,
    durationSeconds:
      decision.recommendedDurationSeconds,
    sceneCount: decision.sceneCount,
    pacing: decision.pacing,
    music: decision.music.style,
    hook: decision.hookStrategy,
    callToAction: decision.callToAction,
    useThreeDimensionalElements:
      decision.useThreeDimensionalElements,
  };
}