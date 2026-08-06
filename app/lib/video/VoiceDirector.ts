import type {
  PresenterDirection,
  PresenterVoiceStyle,
} from "./PresenterDirector";

export type VoiceGender =
  | "male"
  | "female"
  | "neutral";

export type VoiceEmotion =
  | "calm"
  | "confident"
  | "conversational"
  | "dramatic"
  | "emotional"
  | "energetic"
  | "friendly"
  | "motivational"
  | "urgent";

export type VoicePause = {
  afterText: string;
  durationMilliseconds: number;
};

export type VoiceEmphasis = {
  text: string;
  strength: "light" | "medium" | "strong";
};

export type VoiceDirectionInput = {
  title?: string;
  hook?: string;
  script: string;
  topic?: string;
  audience?: string;
  objective?: string;
  emotion?: string;
  platform?: string;
  presenter?: PresenterDirection;
};

export type VoiceProfile = {
  id: string;
  name: string;
  gender: VoiceGender;
  style: PresenterVoiceStyle;
  emotion: VoiceEmotion;
  speakingRate: number;
  pitch: number;
  stability: number;
  clarity: number;
  warmth: number;
};

export type VoiceDirection = {
  voice: VoiceProfile;
  script: string;
  deliveryScript: string;
  pauses: VoicePause[];
  emphasis: VoiceEmphasis[];
  pronunciationNotes: string[];
  reason: string;
  generationPrompt: string;
  status:
    | "planned"
    | "generating"
    | "ready"
    | "failed";
  audioUrl?: string;
};

type VoicePreset = VoiceProfile & {
  keywords: string[];
};

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "kai-confident-male",
    name: "Confident Male",
    gender: "male",
    style: "authoritative",
    emotion: "confident",
    speakingRate: 0.96,
    pitch: 0,
    stability: 0.78,
    clarity: 0.9,
    warmth: 0.68,
    keywords: [
      "business",
      "strategy",
      "income",
      "growth",
      "leadership",
      "success",
      "professional",
    ],
  },
  {
    id: "kai-warm-female",
    name: "Warm Female",
    gender: "female",
    style: "warm",
    emotion: "emotional",
    speakingRate: 0.9,
    pitch: 1,
    stability: 0.72,
    clarity: 0.88,
    warmth: 0.94,
    keywords: [
      "family",
      "hope",
      "struggle",
      "story",
      "future",
      "pain",
      "life",
      "emotional",
    ],
  },
  {
    id: "kai-social-neutral",
    name: "Social Creator",
    gender: "neutral",
    style: "energetic",
    emotion: "energetic",
    speakingRate: 1.08,
    pitch: 1,
    stability: 0.64,
    clarity: 0.92,
    warmth: 0.76,
    keywords: [
      "tiktok",
      "reels",
      "shorts",
      "viral",
      "creator",
      "attention",
      "scroll",
      "fast",
    ],
  },
  {
    id: "kai-dramatic-male",
    name: "Dramatic Narrator",
    gender: "male",
    style: "dramatic",
    emotion: "dramatic",
    speakingRate: 0.86,
    pitch: -1,
    stability: 0.86,
    clarity: 0.9,
    warmth: 0.52,
    keywords: [
      "warning",
      "secret",
      "truth",
      "mistake",
      "danger",
      "cinematic",
      "dramatic",
      "urgent",
    ],
  },
  {
    id: "kai-calm-female",
    name: "Calm Teacher",
    gender: "female",
    style: "calm",
    emotion: "calm",
    speakingRate: 0.92,
    pitch: 0,
    stability: 0.9,
    clarity: 0.95,
    warmth: 0.82,
    keywords: [
      "how to",
      "guide",
      "learn",
      "explain",
      "simple",
      "steps",
      "understand",
      "clear",
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

function normalizeScript(
  script: string,
): string {
  return script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function determineGender(
  presenter?: PresenterDirection,
): VoiceGender | undefined {
  const gender =
    presenter?.presenter.gender;

  if (
    gender === "male" ||
    gender === "female" ||
    gender === "neutral"
  ) {
    return gender;
  }

  return undefined;
}

function scorePreset(
  preset: VoicePreset,
  text: string,
  presenter?: PresenterDirection,
): number {
  let score = 0;

  for (const keyword of preset.keywords) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  const presenterGender =
    determineGender(presenter);

  if (
    presenterGender &&
    presenterGender === preset.gender
  ) {
    score += 10;
  }

  if (
    presenter?.presenter.voiceStyle ===
    preset.style
  ) {
    score += 10;
  }

  return score;
}

function selectVoice(
  input: VoiceDirectionInput,
): VoicePreset {
  const searchableText = normalizeText(
    input.title,
    input.hook,
    input.script,
    input.topic,
    input.audience,
    input.objective,
    input.emotion,
    input.platform,
  );

  const ranked = VOICE_PRESETS.map(
    (preset) => ({
      preset,
      score: scorePreset(
        preset,
        searchableText,
        input.presenter,
      ),
    }),
  ).sort(
    (first, second) =>
      second.score - first.score,
  );

  return (
    ranked[0]?.preset ??
    VOICE_PRESETS[0]
  );
}

function createPauses(
  script: string,
): VoicePause[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences
    .slice(0, -1)
    .map((sentence, index) => ({
      afterText: sentence,
      durationMilliseconds:
        index === 0 ? 550 : 350,
    }));
}

function createEmphasis(
  input: VoiceDirectionInput,
): VoiceEmphasis[] {
  const emphasis: VoiceEmphasis[] = [];

  const hook = input.hook?.trim();

  if (hook) {
    emphasis.push({
      text: hook,
      strength: "strong",
    });
  }

  const scriptSentences = input.script
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const finalSentence =
    scriptSentences[
      scriptSentences.length - 1
    ];

  if (
    finalSentence &&
    finalSentence !== hook
  ) {
    emphasis.push({
      text: finalSentence,
      strength: "medium",
    });
  }

  return emphasis;
}

function createDeliveryScript(
  script: string,
  pauses: VoicePause[],
): string {
  let deliveryScript = script;

  for (const pause of pauses) {
    deliveryScript =
      deliveryScript.replace(
        pause.afterText,
        `${pause.afterText} [pause ${pause.durationMilliseconds}ms]`,
      );
  }

  return deliveryScript;
}

function buildGenerationPrompt(
  voice: VoiceProfile,
  input: VoiceDirectionInput,
): string {
  return [
    "Generate natural spoken narration for a vertical social video.",
    `Voice name: ${voice.name}.`,
    `Gender presentation: ${voice.gender}.`,
    `Voice style: ${voice.style}.`,
    `Primary emotion: ${voice.emotion}.`,
    `Speaking-rate multiplier: ${voice.speakingRate}.`,
    `Pitch adjustment: ${voice.pitch}.`,
    `Stability: ${voice.stability}.`,
    `Clarity: ${voice.clarity}.`,
    `Warmth: ${voice.warmth}.`,
    "Speak directly to one person, not to a crowd.",
    "Make the first sentence immediately engaging.",
    "Use natural pauses and sentence rhythm.",
    "Avoid robotic timing, exaggerated announcer delivery, and flat emotion.",
    "Clearly pronounce KWEVORA as kweh-VOR-uh and KAI as the word sky without the s.",
    input.platform
      ? `Optimize delivery for ${input.platform}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function directVideoVoice(
  input: VoiceDirectionInput,
): VoiceDirection {
  const script =
    normalizeScript(input.script);

  const selected =
    selectVoice({
      ...input,
      script,
    });

  const voice: VoiceProfile = {
    id: selected.id,
    name: selected.name,
    gender: selected.gender,
    style: selected.style,
    emotion: selected.emotion,
    speakingRate:
      input.presenter?.presenter
        .speakingRate ??
      selected.speakingRate,
    pitch: selected.pitch,
    stability: selected.stability,
    clarity: selected.clarity,
    warmth: selected.warmth,
  };

  const pauses =
    createPauses(script);

  const emphasis =
    createEmphasis({
      ...input,
      script,
    });

  return {
    voice,
    script,
    deliveryScript:
      createDeliveryScript(
        script,
        pauses,
      ),
    pauses,
    emphasis,
    pronunciationNotes: [
      "Pronounce KWEVORA as kweh-VOR-uh.",
      "Pronounce KAI like the word sky without the s.",
      "Pause briefly before the final call to action.",
    ],
    reason:
      `KAI selected ${voice.name} because its tone, pacing, and emotion match the presenter, audience, and video message.`,
    generationPrompt:
      buildGenerationPrompt(
        voice,
        input,
      ),
    status: "planned",
  };
}

export function getAvailableVoices(): ReadonlyArray<VoiceProfile> {
  return VOICE_PRESETS.map(
    ({
      keywords: _keywords,
      ...voice
    }) => voice,
  );
}