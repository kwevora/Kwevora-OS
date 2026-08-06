import { getKai } from "../core/kai";

const kai = getKai();

export const dailyBrief = {
  generatedAt: new Date().toLocaleString(),

  conversation: {
    greeting: kai.morning.greeting,
    opening: kai.morning.opening,
    observation: kai.observation.whatStoodOut,
    opinion: kai.morning.opinion,
    confidence: kai.decision.confidence,
  },

  brief: {
    title: "Here's the short version.",
    bullets: [
      kai.memory.lessonLearned,
      kai.reasoning.conclusion,
      kai.decision.nextMove,
    ],
  },

  recommendation: {
    title: "My opinion",
    reason: kai.decision.recommendation,
    confidence: kai.decision.confidence,
  },

  question: {
    title: "One thing I need from you",
    question: kai.decision.oneQuestion,
    reason: "Your answer helps me decide where to spend my energy next.",
    options: [
      "Memory",
      "Real business data",
      "Automatic content creation",
      "Keep the morning flow simple",
    ],
  },

  approval: {
    title: kai.morning.approvalButton,
    description:
      "I've prepared everything I can before you arrived. Once you approve today's direction, I'll keep working from KAI Core.",
    button: kai.morning.approvalButton,
  },

  afterApproval: {
    title: kai.morning.handoff,
    bullets: kai.afterApproval,
  },
};