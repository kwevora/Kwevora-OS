import { kaiOrgans } from "./kaiOrgans";

type BrainOutput = {
  mainFocus: string;
  opinion: string;
  reasoning: string;
  confidence: number;
  question: string;
  preparedWork: string[];
  afterApproval: string[];
};

export function runKaiBrainEngine(): BrainOutput {
  const mainFocus = kaiOrgans.decision.recommendation;

  const opinion =
    "Based on what I remember, what I noticed, and what I worked through, today's best move is strengthening the brain before adding more features.";

  const reasoning = kaiOrgans.reasoning.whyItMatters;

  const confidence = kaiOrgans.decision.confidence;

  const question = kaiOrgans.decision.oneQuestion;

  const preparedWork = [
    kaiOrgans.memory.previousDecision,
    kaiOrgans.observation.whatChanged,
    kaiOrgans.reasoning.conclusion,
    kaiOrgans.decision.nextMove,
  ];

  const afterApproval = [
    "Use the four organs to generate tomorrow's brief",
    "Keep the morning flow simple",
    "Make KAI smarter before making KWEVORA bigger",
  ];

  return {
    mainFocus,
    opinion,
    reasoning,
    confidence,
    question,
    preparedWork,
    afterApproval,
  };
}