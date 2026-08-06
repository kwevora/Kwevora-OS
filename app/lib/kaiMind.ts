import { runKaiDecisionEngine } from "./kaiDecisionEngine";

const decision = runKaiDecisionEngine();

export const kaiMind = {
  owner: {
    name: "Kent",
    businessName: "KWEVORA",
    businessType: "Morning AI Operating System",
    mainGoal:
      "Build the world's first Morning AI Operating System that helps business owners wake up, approve their day, and go live their life.",
  },

  decision,

  yesterday: {
    summary:
      "Yesterday we made KAI feel more like a Chief Operating Officer and less like a dashboard.",
    whatHappened: decision.whatHappened,
  },

  today: {
    mainFocus: "Build reasoning, memory, and conversation.",
    plainEnglishReason: decision.reason,
    bestMove: decision.recommendation,
    reviewTime: "12 minutes",
  },

  recommendation: {
    title: decision.recommendation,
    reason: decision.reason,
    confidence: decision.confidence,
    evidence: decision.evidence.map((item) => item.meaning),
  },

  reasoning: {
    observation: decision.observation,
    pattern: decision.pattern,
    conclusion: decision.conclusion,
    expectedOutcome: decision.expectedOutcome,
    evidence: decision.evidence,
  },

  memory: {
    whatWeDecided:
      "KAI should wake up with an opinion, explain the reason behind it, and keep building on yesterday instead of starting over.",
    whatKaiLearned: decision.whatMattersMost,
    whatToKeepDoing: decision.keepDoing.join(" "),
    whatToAvoid:
      "Avoid robotic language, repeated sections, random screens, and recommendations without reasons.",
  },

  morningConversation: {
    opener: "Morning, Kent.",
    lineOne: "I started before you got here.",
    lineTwo:
      "Yesterday made one thing clear: KAI feels stronger when it explains what it noticed instead of just showing cards.",
    lineThree: decision.conclusion,
    lineFour: decision.reason,
    handoff: "You answer what only you can know. I'll take it from there.",
  },

  morningQuestion: decision.morningQuestion,

  desk: {
    onMyDesk: decision.prepareNext,
    watching: decision.evidence.map((item) => item.label),
    exploring: decision.changeToday,
    waitingOnYou: [
      decision.morningQuestion.question,
      "Approve the direction when it feels right",
    ],
    alreadyFinished: decision.whatHappened,
  },

  thoughtStream: [
    {
      mood: "Observing",
      title: decision.observation,
      text: "I am starting with what changed before deciding what to recommend.",
    },
    {
      mood: "Finding the pattern",
      title: decision.pattern,
      text: "A good recommendation should come from a pattern, not a random guess.",
    },
    {
      mood: "Recommending",
      title: decision.recommendation,
      text: decision.reason,
    },
    {
      mood: "Asking",
      title: decision.morningQuestion.question,
      text: decision.morningQuestion.reason,
    },
  ],
};