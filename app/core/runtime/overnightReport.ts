import type { KaiContentIdea } from "./contentGenerator";
import type { KaiGamePlanItem, RuntimeActivity } from "./clientRuntime";
import type { KaiMemoryEntry } from "./memoryStore";

export type OvernightReviewItem = {
  id: string;
  type: "content" | "task" | "idea" | "video";
  title: string;
  description: string;
  status: "waiting_review" | "approved" | "rejected";
};

export type OvernightOpportunity = {
  id: string;
  title: string;
  reason: string;
  nextMove: string;
};

export type OvernightReport = {
  id: string;
  generatedAt: string;

  summary: string;
  morningBrief: string;
  recommendation: string;
  question: string;

  gamePlan: KaiGamePlanItem[];
  contentIdeas: KaiContentIdea[];
  reviewQueue: OvernightReviewItem[];
  opportunities: OvernightOpportunity[];

  activity: RuntimeActivity[];
  memorySnapshot: KaiMemoryEntry[];
};

export function createOvernightReport(input: {
  summary: string;
  morningBrief: string;
  recommendation: string;
  question: string;
  gamePlan: KaiGamePlanItem[];
  contentIdeas: KaiContentIdea[];
  activity: RuntimeActivity[];
  memorySnapshot: KaiMemoryEntry[];
  opportunities?: OvernightOpportunity[];
}): OvernightReport {
  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),

    summary: input.summary,
    morningBrief: input.morningBrief,
    recommendation: input.recommendation,
    question: input.question,

    gamePlan: input.gamePlan,
    contentIdeas: input.contentIdeas,
    activity: input.activity,
    memorySnapshot: input.memorySnapshot,

    reviewQueue: input.contentIdeas.map((idea) => ({
      id: crypto.randomUUID(),
      type: "content",
      title: idea.title,
      description: idea.hook,
      status: "waiting_review",
    })),

    opportunities: input.opportunities ?? [],
  };
}