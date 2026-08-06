export type CognitiveStage =
  | "observe"
  | "remember"
  | "understand"
  | "question"
  | "predict"
  | "explore"
  | "prioritize"
  | "decide"
  | "execute"
  | "reflect";

export type CognitiveThought = {
  stage: CognitiveStage;
  title: string;
  reasoning: string;
  confidence: number;
  completedAt: string;
};

export type CognitiveSession = {
  id: string;

  startedAt: string;
  completedAt: string;

  thoughts: CognitiveThought[];

  observation: string;

  rememberedKnowledge: string[];

  assumptions: string[];

  predictions: string[];

  options: string[];

  priority: string;

  decision: string;

  executionPlan: string[];

  reflection: string;

  confidence: number;

  reasoningTrace: string[];

  uncertainties: string[];

  evidenceUsed: string[];

  nextQuestions: string[];
};

export type CognitiveInput = {
  observation: string;

  rememberedKnowledge?: string[];

  assumptions?: string[];

  predictions?: string[];

  options?: string[];
};

export class CognitiveCore {
  think(
    input: CognitiveInput,
  ): CognitiveSession {
    const now =
      new Date().toISOString();

    const thoughts: CognitiveThought[] = [
      {
        stage: "observe",
        title: "Observe",
        reasoning: input.observation,
        confidence: 100,
        completedAt: now,
      },
      {
        stage: "remember",
        title: "Remember",
        reasoning:
          "Recall everything already known before asking for more information.",
        confidence: 95,
        completedAt: now,
      },
      {
        stage: "understand",
        title: "Understand",
        reasoning:
          "Determine why the observation matters to the business.",
        confidence: 90,
        completedAt: now,
      },
      {
        stage: "question",
        title: "Challenge Assumptions",
        reasoning:
          "Avoid jumping to conclusions before making recommendations.",
        confidence: 90,
        completedAt: now,
      },
      {
        stage: "predict",
        title: "Predict",
        reasoning:
          "Estimate what happens if nothing changes.",
        confidence: 85,
        completedAt: now,
      },
      {
        stage: "explore",
        title: "Explore",
        reasoning:
          "Generate multiple realistic options.",
        confidence: 90,
        completedAt: now,
      },
      {
        stage: "prioritize",
        title: "Prioritize",
        reasoning:
          "Choose the option with the highest business value.",
        confidence: 95,
        completedAt: now,
      },
      {
        stage: "decide",
        title: "Decide",
        reasoning:
          "Commit to one clear recommendation.",
        confidence: 95,
        completedAt: now,
      },
      {
        stage: "execute",
        title: "Execute",
        reasoning:
          "Finish as much work as possible before involving the owner.",
        confidence: 100,
        completedAt: now,
      },
      {
        stage: "reflect",
        title: "Reflect",
        reasoning:
          "Capture lessons to improve future decisions.",
        confidence: 100,
        completedAt: now,
      },
    ];

    return {
      id: crypto.randomUUID(),

      startedAt: now,
      completedAt: now,

      thoughts,

      observation: input.observation,

      rememberedKnowledge:
        input.rememberedKnowledge ?? [],

      assumptions:
        input.assumptions ?? [],

      predictions:
        input.predictions ?? [],

      options:
        input.options ?? [],

      priority: "",

      decision: "",

      executionPlan: [],

      reflection: "",

      confidence: 94,

      reasoningTrace: thoughts.map(
        (thought) =>
          `${thought.stage.toUpperCase()}: ${thought.reasoning}`,
      ),

      uncertainties: [],

      evidenceUsed:
        input.rememberedKnowledge ?? [],

      nextQuestions: [],
    };
  }
}

export const cognitiveCore =
  new CognitiveCore();