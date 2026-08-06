import {
  createKaiAudienceProfile,
  type KaiAudienceProfile,
  type KaiBusinessContext,
} from "./kaiAudienceIntelligence";

import {
  createKaiCreativeDecision,
  type KaiContentObjective,
  type KaiCreativeDecision,
  type KaiCreativeFormat,
  type KaiNarrativeStructure,
  type KaiVisualTreatment,
} from "./kaiCreativeDecisionEngine";

export type KaiCameraShot =
  | "extreme-wide"
  | "wide"
  | "medium"
  | "close-up"
  | "extreme-close-up"
  | "over-the-shoulder"
  | "top-down"
  | "low-angle";

export type KaiCameraMovement =
  | "static"
  | "slow-push-in"
  | "slow-pull-out"
  | "pan-left"
  | "pan-right"
  | "tilt-up"
  | "tilt-down"
  | "handheld"
  | "tracking";

export type KaiSceneTransition =
  | "fade"
  | "cross-dissolve"
  | "hard-cut"
  | "blur"
  | "flash"
  | "slide-left"
  | "zoom-through";

export type KaiTextPosition =
  | "top"
  | "center"
  | "bottom"
  | "lower-third";

export type KaiScenePurpose =
  | "hook"
  | "problem"
  | "emotion"
  | "explanation"
  | "solution"
  | "proof"
  | "transformation"
  | "call-to-action";

export type KaiCreativeScene = {
  id: string;
  title: string;
  purpose: KaiScenePurpose;

  visual: string;
  visualPrompt: string;
  bRollKeywords: string[];

  cameraShot: KaiCameraShot;
  cameraMovement: KaiCameraMovement;
  transition: KaiSceneTransition;

  emotion: string;
  lighting: string;
  colorMood: string;
  backgroundStyle: string;

  narration: string;
  onScreenText: string;
  supportingText?: string;

  durationSeconds: number;
  textPosition: KaiTextPosition;

  useThreeDimensionalElements?: boolean;
  threeDimensionalDirection?: string;

  soundDesign?: string[];
};

export type KaiCreativeConcept = {
  id: string;
  name: string;
  confidence: number;
  reason: string;

  plan: {
    audience: string;
    hook: string;
    emotion: string;
    visualStyle: string;
    musicStyle: string;
    captionStyle: string;
    thumbnailIdea: string;
    callToAction: string;
    scenes: KaiCreativeScene[];
  };
};

export type KaiCreativePlan = {
  title: string;
  selectedConceptId: string;
  concepts: KaiCreativeConcept[];

  audience?: KaiAudienceProfile;
  decision?: KaiCreativeDecision;
};

export type CreateCreativePlanInput = {
  topic: string;

  business?: KaiBusinessContext;

  objective?: KaiContentObjective;
  platform?: string;
  desiredDurationSeconds?: number;

  productName?: string;
  offerDescription?: string;
  destination?: string;

  previousPerformanceInsights?: string[];
};

type SceneBlueprint = {
  purpose: KaiScenePurpose;
  title: string;
  emotionalRole: string;
};

type CameraDirection = {
  shot: KaiCameraShot;
  movement: KaiCameraMovement;
  transition: KaiSceneTransition;
};

type VisualDirection = {
  lighting: string;
  colorMood: string;
  backgroundStyle: string;
};

function cleanText(value?: string) {
  return value?.trim() ?? "";
}

function cleanTopic(topic: string) {
  return (
    cleanText(topic) ||
    "Take one meaningful step toward a better future"
  );
}

function normalizeText(value?: string) {
  return cleanText(value).toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sentenceCase(value: string) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return "";
  }

  return (
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1)
  );
}

function buildDefaultBusinessContext(
  topic: string,
): KaiBusinessContext {
  return {
    businessName: "KWEVORA",
    businessType: "AI business operating system",
    niche:
      "AI-powered business building, content creation, marketing, and automation",
    description:
      "KWEVORA learns a business, prepares the work, creates content, and helps the owner make progress with fewer tools and less wasted time.",
    products: ["KWEVORA OS"],
    services: [
      "Business planning",
      "Content creation",
      "Video production",
      "Marketing support",
      "Workflow automation",
    ],
    primaryGoal:
      topic ||
      "Help people build and grow a business with KAI",
    currentStage: "starting",
    platforms: [
      "TikTok",
      "Instagram Reels",
      "YouTube Shorts",
      "Facebook",
    ],
  };
}

function createConceptName(
  decision: KaiCreativeDecision,
) {
  const names: Record<KaiCreativeFormat, string> = {
    "cinematic-short-film":
      "Cinematic Short Film",
    "emotional-documentary":
      "Emotional Documentary",
    "movie-trailer":
      "Movie Trailer",
    "educational-breakdown":
      "Educational Breakdown",
    "problem-solution":
      "Problem to Solution",
    "before-and-after":
      "Before and After",
    "social-proof":
      "Proof Story",
    "behind-the-scenes":
      "Behind the Work",
    "product-demonstration":
      "Product Demonstration",
    "luxury-commercial":
      "Premium Commercial",
    "three-dimensional-visualization":
      "3D Visual Experience",
    "animated-explainer":
      "Animated Explanation",
  };

  return names[decision.selectedFormat];
}

function createSceneBlueprints(
  decision: KaiCreativeDecision,
): SceneBlueprint[] {
  const structureMaps: Record<
    KaiNarrativeStructure,
    SceneBlueprint[]
  > = {
    "hook-problem-solution-action": [
      {
        purpose: "hook",
        title: "The Pattern Interrupt",
        emotionalRole: "curiosity",
      },
      {
        purpose: "problem",
        title: "The Real Problem",
        emotionalRole: "recognition",
      },
      {
        purpose: "emotion",
        title: "What It Costs",
        emotionalRole: "tension",
      },
      {
        purpose: "solution",
        title: "The Better Way",
        emotionalRole: "relief",
      },
      {
        purpose: "proof",
        title: "Why It Works",
        emotionalRole: "confidence",
      },
      {
        purpose: "call-to-action",
        title: "The Next Move",
        emotionalRole: "action",
      },
    ],

    "before-struggle-turning-point-after": [
      {
        purpose: "hook",
        title: "The Result",
        emotionalRole: "surprise",
      },
      {
        purpose: "problem",
        title: "Before",
        emotionalRole: "recognition",
      },
      {
        purpose: "emotion",
        title: "The Struggle",
        emotionalRole: "pressure",
      },
      {
        purpose: "solution",
        title: "The Turning Point",
        emotionalRole: "decision",
      },
      {
        purpose: "transformation",
        title: "After",
        emotionalRole: "achievement",
      },
      {
        purpose: "call-to-action",
        title: "Your Turn",
        emotionalRole: "possibility",
      },
    ],

    "question-reveal-proof-action": [
      {
        purpose: "hook",
        title: "The Question",
        emotionalRole: "curiosity",
      },
      {
        purpose: "problem",
        title: "What Most People Miss",
        emotionalRole: "tension",
      },
      {
        purpose: "explanation",
        title: "The Reveal",
        emotionalRole: "clarity",
      },
      {
        purpose: "solution",
        title: "How It Works",
        emotionalRole: "relief",
      },
      {
        purpose: "proof",
        title: "The Proof",
        emotionalRole: "confidence",
      },
      {
        purpose: "call-to-action",
        title: "Take the Step",
        emotionalRole: "action",
      },
    ],

    "future-self-warning-decision-result": [
      {
        purpose: "hook",
        title: "The Message",
        emotionalRole: "mystery",
      },
      {
        purpose: "problem",
        title: "The Warning",
        emotionalRole: "urgency",
      },
      {
        purpose: "emotion",
        title: "The Cost of Waiting",
        emotionalRole: "pressure",
      },
      {
        purpose: "solution",
        title: "The Decision",
        emotionalRole: "determination",
      },
      {
        purpose: "transformation",
        title: "The Future",
        emotionalRole: "freedom",
      },
      {
        purpose: "call-to-action",
        title: "Your Move",
        emotionalRole: "action",
      },
    ],

    "mistake-consequence-correction-result": [
      {
        purpose: "hook",
        title: "The Mistake",
        emotionalRole: "surprise",
      },
      {
        purpose: "problem",
        title: "Why It Fails",
        emotionalRole: "recognition",
      },
      {
        purpose: "emotion",
        title: "The Consequence",
        emotionalRole: "concern",
      },
      {
        purpose: "explanation",
        title: "The Correction",
        emotionalRole: "clarity",
      },
      {
        purpose: "proof",
        title: "The Result",
        emotionalRole: "confidence",
      },
      {
        purpose: "call-to-action",
        title: "Use the Better Way",
        emotionalRole: "action",
      },
    ],

    "demonstration-proof-invitation": [
      {
        purpose: "hook",
        title: "The Finished Result",
        emotionalRole: "surprise",
      },
      {
        purpose: "problem",
        title: "The Old Way",
        emotionalRole: "frustration",
      },
      {
        purpose: "solution",
        title: "The Demonstration",
        emotionalRole: "curiosity",
      },
      {
        purpose: "explanation",
        title: "What Happens Automatically",
        emotionalRole: "clarity",
      },
      {
        purpose: "proof",
        title: "The Difference",
        emotionalRole: "confidence",
      },
      {
        purpose: "call-to-action",
        title: "Try the New Way",
        emotionalRole: "readiness",
      },
    ],

    "story-lesson-opportunity-action": [
      {
        purpose: "hook",
        title: "The Human Moment",
        emotionalRole: "connection",
      },
      {
        purpose: "problem",
        title: "The Struggle",
        emotionalRole: "pressure",
      },
      {
        purpose: "emotion",
        title: "The Breaking Point",
        emotionalRole: "tension",
      },
      {
        purpose: "solution",
        title: "The First Step",
        emotionalRole: "hope",
      },
      {
        purpose: "transformation",
        title: "What Became Possible",
        emotionalRole: "freedom",
      },
      {
        purpose: "call-to-action",
        title: "One Step Closer",
        emotionalRole: "action",
      },
    ],

    "pattern-interrupt-explanation-payoff": [
      {
        purpose: "hook",
        title: "The Impossible Image",
        emotionalRole: "wonder",
      },
      {
        purpose: "problem",
        title: "The World Before",
        emotionalRole: "tension",
      },
      {
        purpose: "explanation",
        title: "Something Changed",
        emotionalRole: "anticipation",
      },
      {
        purpose: "solution",
        title: "The New System",
        emotionalRole: "power",
      },
      {
        purpose: "transformation",
        title: "The Payoff",
        emotionalRole: "excitement",
      },
      {
        purpose: "call-to-action",
        title: "The Reveal",
        emotionalRole: "action",
      },
    ],
  };

  const base =
    structureMaps[decision.narrativeStructure];

  return resizeBlueprints(
    base,
    decision.sceneCount,
  );
}

function resizeBlueprints(
  blueprints: SceneBlueprint[],
  desiredCount: number,
) {
  if (desiredCount === blueprints.length) {
    return blueprints;
  }

  if (desiredCount < blueprints.length) {
    const first = blueprints[0];
    const last =
      blueprints[blueprints.length - 1];

    const middle = blueprints.slice(
      1,
      blueprints.length - 1,
    );

    const neededMiddle = Math.max(
      0,
      desiredCount - 2,
    );

    return [
      first,
      ...middle.slice(0, neededMiddle),
      last,
    ];
  }

  const expanded = [...blueprints];

  const expandablePurposes: KaiScenePurpose[] = [
    "problem",
    "explanation",
    "solution",
    "proof",
    "transformation",
  ];

  let index = 0;

  while (expanded.length < desiredCount) {
    const purpose =
      expandablePurposes[
        index % expandablePurposes.length
      ];

    const insertionPoint = Math.max(
      1,
      expanded.length - 1,
    );

    expanded.splice(insertionPoint, 0, {
      purpose,
      title:
        purpose === "proof"
          ? "Additional Proof"
          : purpose === "solution"
            ? "The Solution in Motion"
            : purpose === "transformation"
              ? "The Change Becomes Real"
              : purpose === "explanation"
                ? "How the Pieces Connect"
                : "The Problem Deepens",
      emotionalRole:
        purpose === "proof"
          ? "confidence"
          : purpose === "solution"
            ? "relief"
            : purpose === "transformation"
              ? "achievement"
              : purpose === "explanation"
                ? "clarity"
                : "tension",
    });

    index += 1;
  }

  return expanded;
}

function distributeDurations(
  totalSeconds: number,
  count: number,
) {
  const safeCount = Math.max(1, count);
  const base = Math.floor(
    totalSeconds / safeCount,
  );

  const durations = Array.from(
    { length: safeCount },
    () => Math.max(3, base),
  );

  let currentTotal = durations.reduce(
    (sum, duration) => sum + duration,
    0,
  );

  let index = 0;

  while (currentTotal < totalSeconds) {
    durations[index % safeCount] += 1;
    currentTotal += 1;
    index += 1;
  }

  while (
    currentTotal > totalSeconds &&
    durations.some((duration) => duration > 3)
  ) {
    const durationIndex =
      index % safeCount;

    if (durations[durationIndex] > 3) {
      durations[durationIndex] -= 1;
      currentTotal -= 1;
    }

    index += 1;
  }

  return durations;
}

function getCameraDirection(
  purpose: KaiScenePurpose,
  sceneIndex: number,
  decision: KaiCreativeDecision,
): CameraDirection {
  if (purpose === "hook") {
    if (
      decision.selectedFormat ===
      "three-dimensional-visualization"
    ) {
      return {
        shot: "extreme-wide",
        movement: "tracking",
        transition: "zoom-through",
      };
    }

    if (
      decision.selectedFormat ===
      "movie-trailer"
    ) {
      return {
        shot: "extreme-close-up",
        movement: "slow-push-in",
        transition: "flash",
      };
    }

    return {
      shot: "close-up",
      movement: "slow-push-in",
      transition: "fade",
    };
  }

  if (purpose === "problem") {
    return {
      shot:
        sceneIndex % 2 === 0
          ? "wide"
          : "top-down",
      movement:
        decision.pacing === "fast-social"
          ? "handheld"
          : "slow-push-in",
      transition: "hard-cut",
    };
  }

  if (purpose === "emotion") {
    return {
      shot: "close-up",
      movement: "slow-push-in",
      transition: "cross-dissolve",
    };
  }

  if (purpose === "explanation") {
    return {
      shot: "over-the-shoulder",
      movement: "tracking",
      transition: "slide-left",
    };
  }

  if (purpose === "solution") {
    return {
      shot: "medium",
      movement: "tracking",
      transition: "hard-cut",
    };
  }

  if (purpose === "proof") {
    return {
      shot: "close-up",
      movement: "slow-push-in",
      transition: "flash",
    };
  }

  if (purpose === "transformation") {
    return {
      shot: "wide",
      movement: "slow-pull-out",
      transition: "cross-dissolve",
    };
  }

  return {
    shot: "wide",
    movement: "slow-push-in",
    transition: "zoom-through",
  };
}

function getVisualDirection(
  treatment: KaiVisualTreatment,
  purpose: KaiScenePurpose,
): VisualDirection {
  const base: Record<
    KaiVisualTreatment,
    VisualDirection
  > = {
    "cinematic-realism": {
      lighting:
        "Cinematic motivated lighting with realistic shadows and controlled highlights",
      colorMood:
        "Deep charcoal, warm amber, and restrained teal",
      backgroundStyle:
        "Grounded cinematic environment with realistic lived-in details",
    },

    "documentary-realism": {
      lighting:
        "Natural available light with honest contrast and minimal artificial polish",
      colorMood:
        "Muted earth tones, soft gray, and natural skin tones",
      backgroundStyle:
        "Authentic real-world documentary setting",
    },

    "premium-commercial": {
      lighting:
        "Premium studio-quality lighting with sculpted highlights and clean separation",
      colorMood:
        "Black, bright white, electric teal, and controlled warm accents",
      backgroundStyle:
        "Polished commercial environment with precise visual composition",
    },

    "high-energy-social": {
      lighting:
        "Bright high-contrast lighting designed for immediate mobile visibility",
      colorMood:
        "Bold contrast with energetic modern accents",
      backgroundStyle:
        "Fast-moving social video environment with strong foreground action",
    },

    "minimal-modern": {
      lighting:
        "Clean soft lighting with even visibility and subtle depth",
      colorMood:
        "White, charcoal, soft teal, and restrained neutral tones",
      backgroundStyle:
        "Minimal modern environment that keeps attention on the explanation",
    },

    futuristic: {
      lighting:
        "Dramatic rim lighting, glowing practical lights, and deep cinematic shadow",
      colorMood:
        "Midnight blue, black, electric teal, silver, and warm gold",
      backgroundStyle:
        "Futuristic cinematic world with subtle technology and atmospheric depth",
    },

    "three-dimensional": {
      lighting:
        "Volumetric dimensional lighting with glowing edges and visible depth",
      colorMood:
        "Dark space, electric teal, warm gold, white light, and translucent layers",
      backgroundStyle:
        "Immersive three-dimensional environment with floating interfaces and spatial movement",
    },

    "warm-lifestyle": {
      lighting:
        "Soft golden natural light with warm practical lighting",
      colorMood:
        "Warm amber, natural green, soft blue, and realistic skin tones",
      backgroundStyle:
        "Comfortable human lifestyle environment with authentic emotional detail",
    },

    "raw-authentic": {
      lighting:
        "Natural imperfect lighting that feels captured rather than staged",
      colorMood:
        "Realistic neutral tones with subtle warmth",
      backgroundStyle:
        "Authentic working environment with visible real-life detail",
    },
  };

  const selected = base[treatment];

  if (purpose === "problem") {
    return {
      lighting:
        "Lower-key lighting with deeper shadows and restrained highlights",
      colorMood:
        "Muted charcoal, cold blue, and subdued neutral tones",
      backgroundStyle:
        selected.backgroundStyle,
    };
  }

  if (
    purpose === "solution" ||
    purpose === "proof"
  ) {
    return {
      lighting:
        "Clear focused lighting with brighter highlights and increasing warmth",
      colorMood:
        "Teal, warm gold, clean white, and deep black",
      backgroundStyle:
        selected.backgroundStyle,
    };
  }

  if (
    purpose === "transformation" ||
    purpose === "call-to-action"
  ) {
    return {
      lighting:
        "Bright directional light emerging through controlled darkness",
      colorMood:
        "Warm gold, electric teal, white, and rich black",
      backgroundStyle:
        selected.backgroundStyle,
    };
  }

  return selected;
}

function createSceneVisual(
  blueprint: SceneBlueprint,
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  const businessName =
    cleanText(input.business?.businessName) ||
    "the business";

  const product =
    cleanText(input.productName) ||
    cleanText(input.business?.products?.[0]) ||
    businessName;

  const primaryPain =
    audience.painPoints[0] ||
    "feeling stuck without a clear next move";

  const primaryMotivation =
    audience.motivations[0] ||
    "making meaningful progress";

  const format =
    decision.selectedFormat;

  if (blueprint.purpose === "hook") {
    if (format === "product-demonstration") {
      return `The completed result produced by ${product} appears immediately while the work assembles itself in real time.`;
    }

    if (
      format ===
      "three-dimensional-visualization"
    ) {
      return `The viewer moves through a three-dimensional world representing ${primaryPain}, then sees the system begin reorganizing itself.`;
    }

    if (format === "movie-trailer") {
      return `A rapid glimpse of the final transformation appears, followed by darkness and one dramatic human reaction.`;
    }

    return `A visually honest human moment instantly communicates ${primaryPain} without explanation.`;
  }

  if (blueprint.purpose === "problem") {
    return `The audience's real struggle is shown through specific daily details that communicate ${primaryPain}.`;
  }

  if (blueprint.purpose === "emotion") {
    return `A close human moment reveals the emotional cost of remaining in the same situation.`;
  }

  if (blueprint.purpose === "explanation") {
    return `The important parts of the process become visible, showing how the problem connects to the solution.`;
  }

  if (blueprint.purpose === "solution") {
    return `${product} begins completing the difficult work while the user makes only the decisions that require them.`;
  }

  if (blueprint.purpose === "proof") {
    return `The result is shown through finished work, visible progress, and a believable improvement in the user's day.`;
  }

  if (blueprint.purpose === "transformation") {
    return `The person experiences ${primaryMotivation} through a grounded, believable change in daily life.`;
  }

  return `The story resolves into a premium ${businessName} end moment with one clear path forward.`;
}

function createVisualPrompt(
  visual: string,
  blueprint: SceneBlueprint,
  decision: KaiCreativeDecision,
  visualDirection: VisualDirection,
) {
  const dimensionalText =
    decision.useThreeDimensionalElements
      ? `Include tasteful dimensional depth, layered particles, spatial movement, and physically believable 3D elements that support the idea. ${decision.threeDimensionalDirection ?? ""}`
      : "Use realistic depth and cinematic separation without unnecessary visual effects.";

  return [
    `Create a premium vertical 9:16 video scene.`,
    visual,
    `Creative format: ${decision.selectedFormat.replaceAll("-", " ")}.`,
    `Visual treatment: ${decision.visualTreatment.replaceAll("-", " ")}.`,
    `Scene purpose: ${blueprint.purpose}.`,
    `Emotion: ${blueprint.emotionalRole}.`,
    `Lighting: ${visualDirection.lighting}.`,
    `Color direction: ${visualDirection.colorMood}.`,
    `Environment: ${visualDirection.backgroundStyle}.`,
    dimensionalText,
    `Natural human detail, believable materials, cinematic composition, no text inside the generated visual, no logos unless specifically supplied, no private information, no distorted hands, no duplicate people.`,
  ].join(" ");
}

function createBRollKeywords(
  blueprint: SceneBlueprint,
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
) {
  const businessType =
    cleanText(input.business?.businessType) ||
    cleanText(input.business?.niche) ||
    "small business";

  const pain =
    audience.painPoints[0] ||
    "business struggle";

  const motivation =
    audience.motivations[0] ||
    "business progress";

  const purposeKeywords: Record<
    KaiScenePurpose,
    string[]
  > = {
    hook: [
      `${businessType} cinematic opening`,
      `${pain} visual story`,
      "scroll stopping human moment",
    ],

    problem: [
      pain,
      `${businessType} daily struggle`,
      "frustrated business owner",
    ],

    emotion: [
      "emotional close up",
      "pressure and determination",
      "authentic human reaction",
    ],

    explanation: [
      `${businessType} process`,
      "workflow visualization",
      "how the system works",
    ],

    solution: [
      `${businessType} solution`,
      "AI completing work",
      "automated business workflow",
    ],

    proof: [
      "finished business content",
      "visible progress dashboard",
      "business result proof",
    ],

    transformation: [
      motivation,
      "business owner time freedom",
      "before and after lifestyle",
    ],

    "call-to-action": [
      "premium brand outro",
      "glowing path forward",
      "cinematic call to action",
    ],
  };

  return unique(
    purposeKeywords[blueprint.purpose],
  );
}

function createNarration(
  blueprint: SceneBlueprint,
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  const topic = cleanTopic(input.topic);

  const businessName =
    cleanText(input.business?.businessName) ||
    "KAI";

  const product =
    cleanText(input.productName) ||
    cleanText(input.business?.products?.[0]) ||
    businessName;

  const pain =
    audience.painPoints[0] ||
    "not knowing what to do next";

  const motivation =
    audience.motivations[0] ||
    "moving forward with confidence";

  const objection =
    audience.objections[0] ||
    "another tool will only create more work";

  if (blueprint.purpose === "hook") {
    if (
      decision.selectedFormat ===
      "product-demonstration"
    ) {
      return `This was not built one step at a time by the user. ${product} prepared it.`;
    }

    if (
      decision.selectedFormat ===
      "movie-trailer"
    ) {
      return `The way people build a business is about to change.`;
    }

    if (
      decision.selectedFormat ===
      "three-dimensional-visualization"
    ) {
      return `What if you could see every moving part of your business finally working together?`;
    }

    return `Most people do not stop because they lack ambition. They stop because they cannot see the next clear move.`;
  }

  if (blueprint.purpose === "problem") {
    return `The real problem is not effort. It is ${pain}, while the work keeps piling up.`;
  }

  if (blueprint.purpose === "emotion") {
    return `That pressure follows people home, steals their time, and makes progress feel farther away than it should.`;
  }

  if (blueprint.purpose === "explanation") {
    return `${businessName} learns the business, understands the goal, and organizes the work into a clear direction.`;
  }

  if (blueprint.purpose === "solution") {
    return `Instead of waiting for another instruction, ${product} prepares the plan, creates the work, and brings back only the decisions that matter.`;
  }

  if (blueprint.purpose === "proof") {
    return `The proof is not another promise. It is finished work waiting for approval instead of another blank screen.`;
  }

  if (blueprint.purpose === "transformation") {
    return `That is how ${motivation} becomes more than an idea. One completed step begins creating the next.`;
  }

  if (decision.objective === "sales") {
    return `${decision.callToAction}`;
  }

  if (objection) {
    return `${decision.callToAction}`;
  }

  return `Start with ${topic}. Then take one clear step forward.`;
}

function createOnScreenText(
  blueprint: SceneBlueprint,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  const pain =
    audience.painPoints[0] ||
    "NO CLEAR NEXT STEP";

  const motivation =
    audience.motivations[0] ||
    "REAL PROGRESS";

  const maps: Record<
    KaiScenePurpose,
    string
  > = {
    hook:
      decision.selectedFormat ===
      "product-demonstration"
        ? "THE WORK IS ALREADY DONE"
        : decision.selectedFormat ===
            "movie-trailer"
          ? "A NEW WAY IS COMING"
          : "YOU ARE NOT STUCK",

    problem: sentenceCase(pain).toUpperCase(),

    emotion: "THE COST IS MORE THAN MONEY",

    explanation: "KAI CONNECTS THE PIECES",

    solution: "THE WORK GETS PREPARED",

    proof: "NOT A PROMISE. PROOF.",

    transformation:
      sentenceCase(motivation).toUpperCase(),

    "call-to-action": "ONE STEP CLOSER",
  };

  return maps[blueprint.purpose];
}

function createSupportingText(
  blueprint: SceneBlueprint,
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  if (blueprint.purpose === "hook") {
    return decision.hookStrategy;
  }

  if (blueprint.purpose === "problem") {
    return (
      audience.currentSituation[0] ||
      "The old way creates more work."
    );
  }

  if (blueprint.purpose === "emotion") {
    return (
      audience.emotionalTriggers[0] ||
      "Time keeps moving."
    );
  }

  if (blueprint.purpose === "explanation") {
    return "Learn. Decide. Prepare. Execute.";
  }

  if (blueprint.purpose === "solution") {
    return "Wake up to work already prepared.";
  }

  if (blueprint.purpose === "proof") {
    return (
      audience.trustSignals[0] ||
      "See the finished result."
    );
  }

  if (blueprint.purpose === "transformation") {
    return (
      audience.motivations[0] ||
      "More progress. Less wasted time."
    );
  }

  return (
    cleanText(input.destination) ||
    decision.callToAction
  );
}

function selectTextPosition(
  purpose: KaiScenePurpose,
  sceneIndex: number,
): KaiTextPosition {
  if (purpose === "hook") {
    return "center";
  }

  if (purpose === "problem") {
    return sceneIndex % 2 === 0
      ? "lower-third"
      : "center";
  }

  if (purpose === "emotion") {
    return "center";
  }

  if (
    purpose === "explanation" ||
    purpose === "solution"
  ) {
    return "lower-third";
  }

  if (
    purpose === "proof" ||
    purpose === "transformation"
  ) {
    return "bottom";
  }

  return "center";
}

function createSoundDesign(
  purpose: KaiScenePurpose,
  decision: KaiCreativeDecision,
) {
  const sounds: Record<
    KaiScenePurpose,
    string[]
  > = {
    hook: [
      "Subtle low-frequency impact",
      "Short atmospheric rise",
    ],

    problem: [
      "Quiet environmental detail",
      "Restrained tension pulse",
    ],

    emotion: [
      "Soft room tone",
      "Subtle cinematic bass movement",
    ],

    explanation: [
      "Clean transition sweep",
      "Soft interface movement",
    ],

    solution: [
      "Precise activation sound",
      "Forward-moving rhythmic pulse",
    ],

    proof: [
      "Controlled confirmation impact",
      "Warm tonal lift",
    ],

    transformation: [
      "Cinematic emotional rise",
      "Natural lifestyle ambience",
    ],

    "call-to-action": [
      "Final brand impact",
      "Resolved tonal tail",
    ],
  };

  if (
    decision.useThreeDimensionalElements
  ) {
    return unique([
      ...sounds[purpose],
      "Spatial movement synchronized with dimensional objects",
    ]);
  }

  return sounds[purpose];
}

function createScenes(
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  const blueprints =
    createSceneBlueprints(decision);

  const durations = distributeDurations(
    decision.recommendedDurationSeconds,
    blueprints.length,
  );

  return blueprints.map(
    (blueprint, sceneIndex) => {
      const visual = createSceneVisual(
        blueprint,
        input,
        audience,
        decision,
      );

      const visualDirection =
        getVisualDirection(
          decision.visualTreatment,
          blueprint.purpose,
        );

      const camera = getCameraDirection(
        blueprint.purpose,
        sceneIndex,
        decision,
      );

      return {
        id: `${decision.id}-scene-${sceneIndex + 1}`,
        title: blueprint.title,
        purpose: blueprint.purpose,

        visual,

        visualPrompt: createVisualPrompt(
          visual,
          blueprint,
          decision,
          visualDirection,
        ),

        bRollKeywords: createBRollKeywords(
          blueprint,
          input,
          audience,
        ),

        cameraShot: camera.shot,
        cameraMovement: camera.movement,
        transition: camera.transition,

        emotion: blueprint.emotionalRole,
        lighting: visualDirection.lighting,
        colorMood: visualDirection.colorMood,
        backgroundStyle:
          visualDirection.backgroundStyle,

        narration: createNarration(
          blueprint,
          input,
          audience,
          decision,
        ),

        onScreenText: createOnScreenText(
          blueprint,
          audience,
          decision,
        ),

        supportingText:
          createSupportingText(
            blueprint,
            input,
            audience,
            decision,
          ),

        durationSeconds:
          durations[sceneIndex],

        textPosition: selectTextPosition(
          blueprint.purpose,
          sceneIndex,
        ),

        useThreeDimensionalElements:
          decision.useThreeDimensionalElements,

        threeDimensionalDirection:
          decision.useThreeDimensionalElements
            ? decision.threeDimensionalDirection
            : undefined,

        soundDesign: createSoundDesign(
          blueprint.purpose,
          decision,
        ),
      } satisfies KaiCreativeScene;
    },
  );
}

function createThumbnailIdea(
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
) {
  const product =
    cleanText(input.productName) ||
    cleanText(input.business?.products?.[0]) ||
    cleanText(input.business?.businessName) ||
    "the solution";

  const pain =
    audience.painPoints[0] ||
    "the audience's struggle";

  if (
    decision.selectedFormat ===
    "product-demonstration"
  ) {
    return `A split visual showing an overwhelmed person facing ${pain} on one side and the finished result created by ${product} on the other.`;
  }

  if (
    decision.selectedFormat ===
    "three-dimensional-visualization"
  ) {
    return `A person standing before a glowing three-dimensional business system while scattered tasks reorganize into one clear path.`;
  }

  if (
    decision.selectedFormat ===
    "movie-trailer"
  ) {
    return `A dramatic silhouette facing a glowing doorway with bold cinematic contrast and one mysterious visual clue.`;
  }

  if (
    decision.selectedFormat ===
    "before-and-after"
  ) {
    return `A strong before-and-after contrast with the finished transformation occupying most of the frame.`;
  }

  return `A believable human reaction showing the emotional contrast between ${pain} and finally seeing a clear path forward.`;
}

function createCaptionStyle(
  decision: KaiCreativeDecision,
) {
  if (
    decision.pacing === "rapid-montage" ||
    decision.pacing === "fast-social"
  ) {
    return "Short bold animated captions timed to visual changes, using no more than one important phrase at a time.";
  }

  if (
    decision.selectedFormat ===
    "emotional-documentary"
  ) {
    return "Restrained documentary captions with clean lower-thirds and occasional centered emotional statements.";
  }

  if (
    decision.selectedFormat ===
    "luxury-commercial"
  ) {
    return "Minimal premium typography with generous spacing and very few carefully chosen words.";
  }

  return "Large readable captions with one key phrase emphasized per scene and enough empty space to preserve the visual.";
}

function createAlternativeConcepts(
  input: CreateCreativePlanInput,
  audience: KaiAudienceProfile,
  decision: KaiCreativeDecision,
): KaiCreativeConcept[] {
  return decision.alternativeFormats.map(
    (alternative, index) => {
      const alternateDecision: KaiCreativeDecision = {
        ...decision,
        id: `${decision.id}-alternative-${index + 1}`,
        selectedFormat: alternative.format,
        formatConfidence: alternative.score,
        formatReasoning:
          alternative.reasons,
      };

      return {
        id: alternateDecision.id,
        name: createConceptName(
          alternateDecision,
        ),
        confidence: alternative.score,
        reason:
          alternative.reasons.join(" ") ||
          "This is a strong alternate creative direction.",

        plan: {
          audience:
            audience.primaryAudience,

          hook:
            audience.strongestHookDirection,

          emotion:
            alternateDecision.emotionalJourney.join(
              " → ",
            ),

          visualStyle:
            alternateDecision.visualTreatment.replaceAll(
              "-",
              " ",
            ),

          musicStyle:
            alternateDecision.music.style,

          captionStyle:
            createCaptionStyle(
              alternateDecision,
            ),

          thumbnailIdea:
            createThumbnailIdea(
              input,
              audience,
              alternateDecision,
            ),

          callToAction:
            alternateDecision.callToAction,

          scenes: [],
        },
      };
    },
  );
}

export async function createKaiCreativePlan({
  topic,
  business,
  objective,
  platform,
  desiredDurationSeconds,
  productName,
  offerDescription,
  destination,
  previousPerformanceInsights,
}: CreateCreativePlanInput): Promise<KaiCreativePlan> {
  const finalTopic = cleanTopic(topic);

  const businessContext =
    business ??
    buildDefaultBusinessContext(finalTopic);

  const audience =
    await createKaiAudienceProfile({
      ...businessContext,

      primaryGoal:
        businessContext.primaryGoal ||
        finalTopic,

      previousContentInsights:
        unique([
          ...(businessContext.previousContentInsights ??
            []),
          ...(previousPerformanceInsights ?? []),
        ]),
    });

  const decision =
    await createKaiCreativeDecision({
      topic: finalTopic,
      business: businessContext,
      audience,

      objective,
      platform,
      desiredDurationSeconds,

      productName,
      offerDescription,
      destination,

      previousPerformanceInsights,
    });

  const selectedConcept: KaiCreativeConcept = {
    id: decision.id,
    name: createConceptName(decision),
    confidence: decision.formatConfidence,
    reason: decision.decisionSummary,

    plan: {
      audience: audience.primaryAudience,

      hook: decision.hookStrategy,

      emotion:
        decision.emotionalJourney.join(" → "),

      visualStyle: [
        decision.visualTreatment.replaceAll(
          "-",
          " ",
        ),
        decision.useThreeDimensionalElements
          ? "with purposeful three-dimensional elements"
          : "",
      ]
        .filter(Boolean)
        .join(" "),

      musicStyle: decision.music.style,

      captionStyle:
        createCaptionStyle(decision),

      thumbnailIdea:
        createThumbnailIdea(
          {
            topic: finalTopic,
            business: businessContext,
            objective,
            platform,
            desiredDurationSeconds,
            productName,
            offerDescription,
            destination,
            previousPerformanceInsights,
          },
          audience,
          decision,
        ),

      callToAction:
        decision.callToAction,

      scenes: createScenes(
        {
          topic: finalTopic,
          business: businessContext,
          objective,
          platform,
          desiredDurationSeconds,
          productName,
          offerDescription,
          destination,
          previousPerformanceInsights,
        },
        audience,
        decision,
      ),
    },
  };

  const alternativeConcepts =
    createAlternativeConcepts(
      {
        topic: finalTopic,
        business: businessContext,
        objective,
        platform,
        desiredDurationSeconds,
        productName,
        offerDescription,
        destination,
        previousPerformanceInsights,
      },
      audience,
      decision,
    );

  const concepts = [
    selectedConcept,
    ...alternativeConcepts,
  ];

  return {
    title: finalTopic,
    selectedConceptId:
      selectedConcept.id,
    concepts,
    audience,
    decision,
  };
}