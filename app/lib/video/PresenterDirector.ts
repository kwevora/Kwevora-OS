export type PresenterGender =
  | "male"
  | "female"
  | "neutral";

export type PresenterAgeRange =
  | "young-adult"
  | "adult"
  | "middle-aged"
  | "older-adult";

export type PresenterStyle =
  | "casual"
  | "business-casual"
  | "professional"
  | "creator"
  | "cinematic";

export type PresenterEnergy =
  | "calm"
  | "conversational"
  | "confident"
  | "energetic"
  | "emotional"
  | "urgent";

export type PresenterFraming =
  | "close-up"
  | "medium-close-up"
  | "medium"
  | "waist-up";

export type PresenterBackground =
  | "clean-studio"
  | "modern-office"
  | "home-office"
  | "cinematic-dark"
  | "lifestyle"
  | "transparent";

export type PresenterVoiceStyle =
  | "warm"
  | "friendly"
  | "authoritative"
  | "motivational"
  | "calm"
  | "dramatic"
  | "energetic";

export type PresenterDirectionInput = {
  topic: string;
  title?: string;
  hook?: string;
  script?: string;
  audience?: string;
  objective?: string;
  platform?: string;
  emotion?: string;
  preferredGender?: PresenterGender;
  preferredStyle?: PresenterStyle;
};

export type PresenterProfile = {
  id: string;
  name: string;
  gender: PresenterGender;
  ageRange: PresenterAgeRange;
  style: PresenterStyle;
  energy: PresenterEnergy;
  framing: PresenterFraming;
  background: PresenterBackground;
  voiceStyle: PresenterVoiceStyle;
  speakingRate: number;
  eyeContact: boolean;
  handGestures: boolean;
  expression: string;
  wardrobe: string;
};

export type PresenterDirection = {
  presenter: PresenterProfile;
  reason: string;
  deliveryNotes: string[];
  generationPrompt: string;
};

type PresenterPreset = PresenterProfile & {
  keywords: string[];
};

const PRESENTER_PRESETS: PresenterPreset[] = [
  {
    id: "kai-confident-guide",
    name: "Confident Guide",
    gender: "male",
    ageRange: "middle-aged",
    style: "business-casual",
    energy: "confident",
    framing: "medium-close-up",
    background: "modern-office",
    voiceStyle: "authoritative",
    speakingRate: 0.96,
    eyeContact: true,
    handGestures: true,
    expression: "Calm, focused, and trustworthy",
    wardrobe:
      "Dark fitted shirt with a clean modern jacket",
    keywords: [
      "business",
      "income",
      "success",
      "growth",
      "leadership",
      "confidence",
      "strategy",
      "professional",
    ],
  },
  {
    id: "kai-warm-storyteller",
    name: "Warm Storyteller",
    gender: "female",
    ageRange: "adult",
    style: "creator",
    energy: "emotional",
    framing: "close-up",
    background: "lifestyle",
    voiceStyle: "warm",
    speakingRate: 0.9,
    eyeContact: true,
    handGestures: false,
    expression:
      "Warm, empathetic, sincere, and emotionally present",
    wardrobe:
      "Simple neutral clothing with a natural approachable look",
    keywords: [
      "family",
      "struggle",
      "pain",
      "hope",
      "life",
      "story",
      "emotional",
      "sacrifice",
      "future",
    ],
  },
  {
    id: "kai-social-creator",
    name: "Social Creator",
    gender: "neutral",
    ageRange: "young-adult",
    style: "casual",
    energy: "energetic",
    framing: "medium-close-up",
    background: "home-office",
    voiceStyle: "energetic",
    speakingRate: 1.08,
    eyeContact: true,
    handGestures: true,
    expression:
      "Animated, confident, curious, and highly engaging",
    wardrobe:
      "Modern casual creator clothing with clean bold styling",
    keywords: [
      "viral",
      "tiktok",
      "reels",
      "shorts",
      "scroll",
      "trend",
      "fast",
      "attention",
      "creator",
    ],
  },
  {
    id: "kai-cinematic-narrator",
    name: "Cinematic Narrator",
    gender: "male",
    ageRange: "adult",
    style: "cinematic",
    energy: "urgent",
    framing: "close-up",
    background: "cinematic-dark",
    voiceStyle: "dramatic",
    speakingRate: 0.88,
    eyeContact: true,
    handGestures: false,
    expression:
      "Serious, mysterious, intense, and controlled",
    wardrobe:
      "Dark cinematic clothing with subtle premium texture",
    keywords: [
      "warning",
      "secret",
      "truth",
      "mistake",
      "danger",
      "urgent",
      "trailer",
      "cinematic",
      "dramatic",
    ],
  },
  {
    id: "kai-calm-teacher",
    name: "Calm Teacher",
    gender: "female",
    ageRange: "middle-aged",
    style: "professional",
    energy: "calm",
    framing: "medium",
    background: "clean-studio",
    voiceStyle: "calm",
    speakingRate: 0.92,
    eyeContact: true,
    handGestures: true,
    expression:
      "Patient, clear, intelligent, and reassuring",
    wardrobe:
      "Professional neutral clothing with clean studio styling",
    keywords: [
      "explain",
      "learn",
      "simple",
      "steps",
      "guide",
      "education",
      "how to",
      "clear",
      "understand",
    ],
  },
];

function normalizeText(
  ...values: Array<string | undefined>
): string {
  return values
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .join(" ")
    .trim()
    .toLowerCase();
}

function scorePreset(
  preset: PresenterPreset,
  text: string,
  input: PresenterDirectionInput,
): number {
  let score = 0;

  for (const keyword of preset.keywords) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  if (
    input.preferredGender &&
    input.preferredGender === preset.gender
  ) {
    score += 8;
  }

  if (
    input.preferredStyle &&
    input.preferredStyle === preset.style
  ) {
    score += 8;
  }

  const platform = input.platform
    ?.trim()
    .toLowerCase();

  if (
    platform &&
    ["tiktok", "instagram reels", "youtube shorts"].includes(
      platform,
    ) &&
    preset.id === "kai-social-creator"
  ) {
    score += 5;
  }

  return score;
}

function selectPresenter(
  input: PresenterDirectionInput,
): PresenterPreset {
  const text = normalizeText(
    input.topic,
    input.title,
    input.hook,
    input.script,
    input.audience,
    input.objective,
    input.platform,
    input.emotion,
  );

  const ranked = PRESENTER_PRESETS.map(
    (preset) => ({
      preset,
      score: scorePreset(
        preset,
        text,
        input,
      ),
    }),
  ).sort(
    (a, b) => b.score - a.score,
  );

  return (
    ranked[0]?.preset ??
    PRESENTER_PRESETS[0]
  );
}

function buildDeliveryNotes(
  presenter: PresenterProfile,
  input: PresenterDirectionInput,
): string[] {
  const notes = [
    "Look directly into the camera as if speaking to one person.",
    "Use natural pauses instead of reading every sentence at the same speed.",
    "Emphasize the hook during the first three seconds.",
    "Keep facial movement natural and avoid exaggerated expressions.",
    "Deliver the call to action clearly without sounding like an advertisement.",
  ];

  if (presenter.handGestures) {
    notes.push(
      "Use restrained hand gestures only when emphasizing an important point.",
    );
  }

  if (
    input.emotion
      ?.toLowerCase()
      .includes("emotional")
  ) {
    notes.push(
      "Slow down during the emotional portion and leave a short pause before the solution.",
    );
  }

  return notes;
}

function buildGenerationPrompt(
  presenter: PresenterProfile,
): string {
  return [
    "Create a realistic AI presenter speaking directly to the camera.",
    `Presenter style: ${presenter.style}.`,
    `Gender presentation: ${presenter.gender}.`,
    `Age range: ${presenter.ageRange}.`,
    `Camera framing: ${presenter.framing}.`,
    `Background: ${presenter.background}.`,
    `Wardrobe: ${presenter.wardrobe}.`,
    `Expression: ${presenter.expression}.`,
    `Delivery energy: ${presenter.energy}.`,
    `Voice style: ${presenter.voiceStyle}.`,
    `Speaking rate multiplier: ${presenter.speakingRate}.`,
    presenter.eyeContact
      ? "Maintain natural eye contact with the camera."
      : "Use occasional natural eye movement.",
    presenter.handGestures
      ? "Use subtle natural hand gestures."
      : "Keep body movement restrained.",
    "Use realistic blinking, breathing, lip movement, posture, and facial motion.",
    "Avoid uncanny facial motion, distorted hands, frozen expressions, robotic timing, or exaggerated gestures.",
    "Vertical 9:16 composition suitable for TikTok, Instagram Reels, and YouTube Shorts.",
  ].join(" ");
}

export function directVideoPresenter(
  input: PresenterDirectionInput,
): PresenterDirection {
  const selected =
    selectPresenter(input);

  const presenter: PresenterProfile = {
    id: selected.id,
    name: selected.name,
    gender: selected.gender,
    ageRange: selected.ageRange,
    style: selected.style,
    energy: selected.energy,
    framing: selected.framing,
    background: selected.background,
    voiceStyle: selected.voiceStyle,
    speakingRate: selected.speakingRate,
    eyeContact: selected.eyeContact,
    handGestures: selected.handGestures,
    expression: selected.expression,
    wardrobe: selected.wardrobe,
  };

  return {
    presenter,
    reason:
      `KAI selected ${presenter.name} because the presenter’s ` +
      "style, energy, and delivery best match the audience, topic, and platform.",
    deliveryNotes:
      buildDeliveryNotes(
        presenter,
        input,
      ),
    generationPrompt:
      buildGenerationPrompt(
        presenter,
      ),
  };
}

export function getAvailablePresenters(): ReadonlyArray<PresenterProfile> {
  return PRESENTER_PRESETS.map(
    ({
      keywords: _keywords,
      ...presenter
    }) => presenter,
  );
}