import type { RuntimeActivity, ClientRuntimeState } from "./clientRuntime";
import type { KaiMemoryEntry } from "./memoryStore";
import { generateContentIdeas, type KaiContentIdea } from "./contentGenerator";
import {
  runReasoningEngine,
  type KaiDecisionFactor,
  type KaiRankedPriority,
} from "./reasoningEngine";

export type KaiMemoryInput = {
  previousDecision: string;
  lessonLearned: string;
  ownerPreference: string;
  savedMemory?: KaiMemoryEntry[];
  runtime?: ClientRuntimeState;
};

export type KaiBrainOutput = {
  summary: string;
  recommendation: string;
  question: string;
  contentIdeas: KaiContentIdea[];
  activities: RuntimeActivity[];
  confidence: number;
  contentDirection: string;
  executiveSummary: string;
  chosenStrategy: string;
  nextAction: string;
  decisionFactors: KaiDecisionFactor[];
  rejectedOptions: KaiDecisionFactor[];
  priorities: KaiRankedPriority[];
};

function now() {
  return new Date().toISOString();
}

function activity(
  status: RuntimeActivity["status"],
  title: string,
  detail: string
): RuntimeActivity {
  return {
    id: crypto.randomUUID(),
    time: now(),
    status,
    title,
    detail,
  };
}

export function runKaiBrainPipeline(input: KaiMemoryInput): KaiBrainOutput {
  const savedMemory = input.savedMemory ?? [];

  const reasoning = runReasoningEngine(savedMemory, input.runtime);
  const contentIdeas = generateContentIdeas(savedMemory);

  return {
    summary: reasoning.executiveSummary,
    recommendation: reasoning.recommendation,
    question: reasoning.question,
    contentIdeas,
    confidence: reasoning.confidence,
    contentDirection: reasoning.contentDirection,
    executiveSummary: reasoning.executiveSummary,
    chosenStrategy: reasoning.chosenStrategy,
    nextAction: reasoning.nextAction,
    decisionFactors: reasoning.decisionFactors,
    rejectedOptions: reasoning.rejectedOptions,
    priorities: reasoning.priorities,
    activities: [
      activity(
        "sleeping",
        "Started Money Mode reasoning",
        "KAI reviewed memory, runtime state, content readiness, owner preference, and the fastest path toward income."
      ),
      activity(
        "done",
        "Chose today’s money path",
        reasoning.recommendation
      ),
      activity(
        "done",
        "Ranked revenue-focused priorities",
        `KAI ranked ${reasoning.priorities.length} priorities by impact, speed, difficulty, revenue potential, and urgency.`
      ),
      activity(
        "done",
        "Prepared content direction",
        reasoning.contentDirection
      ),
      activity(
        "done",
        "Rejected lower-value work",
        `KAI ruled out ${reasoning.rejectedOptions.length} option(s) that would slow down Version 1.0.`
      ),
      activity(
        "waiting",
        "Waiting for Kent’s link",
        reasoning.question
      ),
      activity(
        "waiting",
        "Next action ready",
        reasoning.nextAction
      ),
    ],
  };
}