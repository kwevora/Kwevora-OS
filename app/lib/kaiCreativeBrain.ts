import {
  createKaiCreativePlan,
  type CreateCreativePlanInput,
  type KaiCreativeConcept,
  type KaiCreativePlan,
  type KaiCreativeScene,
} from "./kaiCreativeDirector";

import type {
  KaiContentObjective,
} from "./kaiCreativeDecisionEngine";

export type CreativeBrainScore = {
  hookStrength: number;
  emotionalPull: number;
  visualSpecificity: number;
  storyFlow: number;
  platformFit: number;
  actionStrength: number;
  total: number;
};

export type CreativeBrainCandidate = {
  id: string;
  objective: KaiContentObjective;
  title: string;
  concept: KaiCreativeConcept;
  plan: KaiCreativePlan;
  score: CreativeBrainScore;
  strengths: string[];
  concerns: string[];
};

export type KaiCreativeBrainResult = {
  selectedCandidateId: string;
  selectedPlan: KaiCreativePlan;
  selectedConcept: KaiCreativeConcept;
  candidates: CreativeBrainCandidate[];
  recommendation: string;
  generatedAt: string;
};

export type CreateKaiCreativeBrainInput =
  CreateCreativePlanInput & {
    candidateObjectives?: KaiContentObjective[];
    candidateLimit?: number;
  };

const DEFAULT_OBJECTIVES: KaiContentObjective[] = [
  "engagement",
  "trust",
  "sales",
  "awareness",
  "education",
];

const GENERIC_HOOK_PHRASES = [
  "one step closer",
  "you are not stuck",
  "most people",
  "imagine if",
  "did you know",
  "here is the truth",
];

const STRONG_HOOK_MARKERS = [
  "without realizing",
  "before it is too late",
  "the real reason",
  "what nobody tells you",
  "stop",
  "why",
  "how",
  "never",
  "mistake",
  "cost",
  "wasting",
  "missing",
];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function scoreHook(hook: string): number {
  const normalized = normalizeText(hook);

  if (!normalized) {
    return 0;
  }

  let score = 45;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 6 && wordCount <= 18) {
    score += 18;
  } else if (wordCount > 24) {
    score -= 15;
  }

  if (normalized.includes("?")) {
    score += 8;
  }

  if (
    STRONG_HOOK_MARKERS.some((marker) =>
      normalized.includes(marker),
    )
  ) {
    score += 16;
  }

  if (
    GENERIC_HOOK_PHRASES.some((phrase) =>
      normalized === phrase || normalized.startsWith(`${phrase}.`),
    )
  ) {
    score -= 22;
  }

  if (/\b(you|your)\b/.test(normalized)) {
    score += 7;
  }

  return clampScore(score);
}

function scoreEmotionalPull(
  concept: KaiCreativeConcept,
  scenes: KaiCreativeScene[],
): number {
  const emotionText = normalizeText(concept.plan.emotion);
  const narrationText = normalizeText(
    scenes.map((scene) => scene.narration).join(" "),
  );

  let score = 42;

  const emotionalWords = [
    "fear",
    "hope",
    "pressure",
    "freedom",
    "relief",
    "family",
    "time",
    "loss",
    "future",
    "stuck",
    "frustration",
    "confidence",
    "possibility",
  ];

  const matches = emotionalWords.filter(
    (word) =>
      emotionText.includes(word) || narrationText.includes(word),
  ).length;

  score += matches * 6;

  if (concept.plan.emotion.includes("→")) {
    score += 10;
  }

  return clampScore(score);
}

function scoreVisualSpecificity(scenes: KaiCreativeScene[]): number {
  if (scenes.length === 0) {
    return 0;
  }

  let total = 0;

  for (const scene of scenes) {
    const prompt = normalizeText(scene.visualPrompt);
    let sceneScore = 35;

    if (prompt.length >= 180) {
      sceneScore += 20;
    }

    if (scene.cameraShot) {
      sceneScore += 8;
    }

    if (scene.cameraMovement) {
      sceneScore += 8;
    }

    if (scene.lighting && scene.colorMood) {
      sceneScore += 10;
    }

    if (scene.backgroundStyle) {
      sceneScore += 7;
    }

    if (
      /\b(person|worker|owner|parent|customer|creator|family|woman|man)\b/.test(
        prompt,
      )
    ) {
      sceneScore += 7;
    }

    total += clampScore(sceneScore);
  }

  return clampScore(total / scenes.length);
}

function scoreStoryFlow(scenes: KaiCreativeScene[]): number {
  if (scenes.length < 3) {
    return 25;
  }

  let score = 45;
  const purposes = scenes.map((scene) => scene.purpose);

  if (purposes[0] === "hook") {
    score += 14;
  }

  if (
    purposes.includes("problem") ||
    purposes.includes("emotion")
  ) {
    score += 10;
  }

  if (
    purposes.includes("solution") ||
    purposes.includes("transformation")
  ) {
    score += 12;
  }

  if (purposes[purposes.length - 1] === "call-to-action") {
    score += 12;
  }

  const narrationCount = scenes.filter(
    (scene) => scene.narration.trim().length > 0,
  ).length;

  if (narrationCount === scenes.length) {
    score += 7;
  }

  return clampScore(score);
}

function scorePlatformFit(
  platform: string | undefined,
  scenes: KaiCreativeScene[],
): number {
  const normalizedPlatform = normalizeText(platform);
  const duration = scenes.reduce(
    (total, scene) => total + scene.durationSeconds,
    0,
  );

  let score = 60;

  if (
    normalizedPlatform.includes("tiktok") ||
    normalizedPlatform.includes("reel") ||
    normalizedPlatform.includes("short")
  ) {
    if (duration >= 20 && duration <= 60) {
      score += 25;
    } else if (duration > 75) {
      score -= 20;
    }

    if (scenes.length >= 5 && scenes.length <= 9) {
      score += 10;
    }
  } else if (duration >= 30 && duration <= 90) {
    score += 15;
  }

  return clampScore(score);
}

function scoreActionStrength(callToAction: string): number {
  const normalized = normalizeText(callToAction);

  if (!normalized) {
    return 0;
  }

  let score = 48;

  if (/\b(start|click|try|build|tell|download|watch|join|create|take)\b/.test(normalized)) {
    score += 22;
  }

  if (/\b(today|now|first|next)\b/.test(normalized)) {
    score += 12;
  }

  if (normalized.length <= 120) {
    score += 8;
  }

  if (normalized === "one step closer") {
    score -= 22;
  }

  return clampScore(score);
}

function calculateScore(
  concept: KaiCreativeConcept,
  platform: string | undefined,
): CreativeBrainScore {
  const scenes = concept.plan.scenes;

  const hookStrength = scoreHook(concept.plan.hook);
  const emotionalPull = scoreEmotionalPull(concept, scenes);
  const visualSpecificity = scoreVisualSpecificity(scenes);
  const storyFlow = scoreStoryFlow(scenes);
  const platformFit = scorePlatformFit(platform, scenes);
  const actionStrength = scoreActionStrength(
    concept.plan.callToAction,
  );

  const total = clampScore(
    hookStrength * 0.24 +
      emotionalPull * 0.17 +
      visualSpecificity * 0.2 +
      storyFlow * 0.17 +
      platformFit * 0.12 +
      actionStrength * 0.1,
  );

  return {
    hookStrength,
    emotionalPull,
    visualSpecificity,
    storyFlow,
    platformFit,
    actionStrength,
    total,
  };
}

function buildStrengths(score: CreativeBrainScore): string[] {
  const entries: Array<[string, number]> = [
    ["Strong opening hook", score.hookStrength],
    ["Clear emotional pull", score.emotionalPull],
    ["Detailed cinematic visuals", score.visualSpecificity],
    ["Complete story progression", score.storyFlow],
    ["Good fit for the selected platform", score.platformFit],
    ["Clear next action", score.actionStrength],
  ];

  return entries
    .filter(([, value]) => value >= 75)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .slice(0, 4);
}

function buildConcerns(score: CreativeBrainScore): string[] {
  const entries: Array<[string, number]> = [
    ["The hook needs a sharper pattern interrupt", score.hookStrength],
    ["The emotion needs to feel more personal", score.emotionalPull],
    ["The visuals need more specific human detail", score.visualSpecificity],
    ["The story needs a clearer beginning, change, and ending", score.storyFlow],
    ["The pacing may not fit the selected platform", score.platformFit],
    ["The call to action needs a clearer next step", score.actionStrength],
  ];

  return entries
    .filter(([, value]) => value < 62)
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label)
    .slice(0, 3);
}

function getSelectedConcept(plan: KaiCreativePlan): KaiCreativeConcept {
  const selected =
    plan.concepts.find(
      (concept) => concept.id === plan.selectedConceptId,
    ) ?? plan.concepts[0];

  if (!selected) {
    throw new Error("KAI Creative Brain could not select a concept.");
  }

  return selected;
}

function buildRecommendation(candidate: CreativeBrainCandidate): string {
  const strength = candidate.strengths[0] ?? "the strongest overall balance";

  return `KAI selected ${candidate.concept.name} because it has ${strength.toLowerCase()} and earned the highest creative score (${candidate.score.total}/100).`;
}

export async function createKaiCreativeBrainPlan(
  input: CreateKaiCreativeBrainInput,
): Promise<KaiCreativeBrainResult> {
  const objectives = unique(
    input.candidateObjectives?.length
      ? input.candidateObjectives
      : DEFAULT_OBJECTIVES,
  );

  const limit = Math.max(
    1,
    Math.min(input.candidateLimit ?? 5, objectives.length),
  );

  const candidates = await Promise.all(
    objectives.slice(0, limit).map(async (objective, index) => {
      const plan = await createKaiCreativePlan({
        topic: input.topic,
        business: input.business,
        objective,
        platform: input.platform,
        desiredDurationSeconds: input.desiredDurationSeconds,
        productName: input.productName,
        offerDescription: input.offerDescription,
        destination: input.destination,
        previousPerformanceInsights: input.previousPerformanceInsights,
      });

      const concept = getSelectedConcept(plan);
      const score = calculateScore(concept, input.platform);

      return {
        id: `${concept.id}-brain-${index + 1}`,
        objective,
        title: plan.title,
        concept,
        plan,
        score,
        strengths: buildStrengths(score),
        concerns: buildConcerns(score),
      } satisfies CreativeBrainCandidate;
    }),
  );

  const rankedCandidates = [...candidates].sort(
    (a, b) =>
      b.score.total - a.score.total ||
      b.concept.confidence - a.concept.confidence,
  );

  const winner = rankedCandidates[0];

  if (!winner) {
    throw new Error("KAI Creative Brain did not produce a usable concept.");
  }

  return {
    selectedCandidateId: winner.id,
    selectedPlan: winner.plan,
    selectedConcept: winner.concept,
    candidates: rankedCandidates,
    recommendation: buildRecommendation(winner),
    generatedAt: new Date().toISOString(),
  };
}