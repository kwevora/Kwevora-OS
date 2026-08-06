export type BusinessMemory = {
  previousDecision: string;
  lessonLearned: string;
  ownerPreference: string;
  avoid: string;
};

export type BusinessObservation = {
  whatChanged: string;
  whatStoodOut: string;
  risk: string;
  opportunity: string;
};

export type BusinessReasoning = {
  conclusion: string;
  whyItMatters: string;
  tradeoff: string;
};

export type BusinessDecision = {
  recommendation: string;
  confidence: number;
  oneQuestion: string;
  nextMove: string;
};

export const kaiOrgans = {
  memory: {
    previousDecision:
      "We decided KWEVORA should stay focused on the simple morning promise: wake up, approve your day, and go live your life.",
    lessonLearned:
      "The product feels strongest when KAI gives one clear direction instead of overwhelming the owner with options.",
    ownerPreference:
      "Kent prefers plain language, complete file replacements, and building real working releases instead of endless planning.",
    avoid:
      "Avoid adding more screens before the core morning flow feels simple, useful, and alive.",
  } satisfies BusinessMemory,

  observation: {
    whatChanged:
      "KWEVORA now has an approval flow that changes after the user approves the day.",
    whatStoodOut:
      "The app feels most real when KAI moves from planning into working.",
    risk:
      "If we keep adding static sections, KWEVORA could start feeling like another dashboard.",
    opportunity:
      "The next opportunity is making KAI's brain more structured so every recommendation comes from the same process.",
  } satisfies BusinessObservation,

  reasoning: {
    conclusion:
      "The interface is strong enough to prove the experience. The brain needs to become stronger next.",
    whyItMatters:
      "A smarter brain makes every page better. More pages only make the app bigger.",
    tradeoff:
      "We are choosing deeper intelligence over more visual features right now.",
  } satisfies BusinessReasoning,

  decision: {
    recommendation:
      "Build KAI's four organs: Memory, Observation, Reasoning, and Decision.",
    confidence: 97,
    oneQuestion:
      "Do you want KAI to focus next on memory, real business data, or automatic content creation?",
    nextMove:
      "Create the organ structure first, then connect the daily brief to it.",
  } satisfies BusinessDecision,
};