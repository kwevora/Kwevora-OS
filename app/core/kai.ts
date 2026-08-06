import { getRuntime } from "./runtime/state";

export type KaiCore = {
  identity: {
    name: string;
    role: string;
    promise: string;
    personality: string[];
  };

  owner: {
    name: string;
    business: string;
    goal: string;
  };

  memory: {
    previousDecision: string;
    lessonLearned: string;
    preference: string;
    avoid: string;
  };

  observation: {
    whatChanged: string;
    whatStoodOut: string;
    risk: string;
    opportunity: string;
  };

  reasoning: {
    conclusion: string;
    whyItMatters: string;
    tradeoff: string;
  };

  decision: {
    recommendation: string;
    confidence: number;
    oneQuestion: string;
    nextMove: string;
  };

  state: {
    status: string;
    mode: string;
    currentFocus: string;
    waitingOn: string;
  };

  morning: {
    greeting: string;
    opening: string;
    opinion: string;
    approvalButton: string;
    handoff: string;
  };

  afterApproval: string[];
};

const baseKai: KaiCore = {
  identity: {
    name: "KAI",
    role: "AI Chief Operating Officer",
    promise: "Wake up. Approve your day. Go live your life.",
    personality: [
      "Calm",
      "Confident",
      "Plainspoken",
      "Helpful",
      "Honest",
      "Focused",
    ],
  },

  owner: {
    name: "Kent",
    business: "KWEVORA",
    goal: "Build the world's first Morning AI Operating System for business owners.",
  },

  memory: {
    previousDecision:
      "We decided KWEVORA should stay focused on the morning promise.",
    lessonLearned: "One clear recommendation beats ten options.",
    preference:
      "Kent prefers complete file replacements and working software.",
    avoid: "Avoid duplicated logic and disconnected systems.",
  },

  observation: {
    whatChanged: "KWEVORA now has a real runtime replacing static objects.",
    whatStoodOut: "Everything should now begin moving toward one living state.",
    risk: "Disconnected data sources create inconsistent behavior.",
    opportunity: "Every screen can now share the same runtime.",
  },

  reasoning: {
    conclusion:
      "The runtime becomes the source of truth for the whole operating system.",
    whyItMatters: "One state means one KAI.",
    tradeoff:
      "We're investing in architecture before adding more features.",
  },

  decision: {
    recommendation: "Replace all remaining static state with runtime state.",
    confidence: 99,
    oneQuestion: "Ready to continue replacing the remaining static systems?",
    nextMove: "Connect every screen to the runtime.",
  },

  state: {
    status: "planning",
    mode: "Runtime Migration",
    currentFocus: "Phase A",
    waitingOn: "Approval",
  },

  morning: {
    greeting: "Morning, Kent.",
    opening: "I've already started working.",
    opinion:
      "Today we're replacing the foundation so everything after this becomes real.",
    approvalButton: "Approve & Start My Day",
    handoff: "I'll take it from here.",
  },

  afterApproval: ["Update runtime", "Continue today's work", "Prepare tomorrow"],
};

export function getKai(): KaiCore {
  const runtime = getRuntime();

  return {
    ...baseKai,
    state: {
      ...baseKai.state,
      status: runtime.status,
    },
  };
}