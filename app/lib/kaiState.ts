import { getKai } from "../core/kai";
import { getRuntime } from "../core/runtime/state";

export function getKaiState() {
  const runtime = getRuntime();
  const kai = getKai();

  return {
    status: runtime.status,
    mode: kai.state.mode,
    currentFocus: kai.state.currentFocus,
    priority: "High",
    confidence: kai.decision.confidence,
    waitingOn: kai.state.waitingOn,

    workingOn: [
      kai.decision.nextMove,
      "Keeping every screen synchronized",
      "Preparing tomorrow before you arrive",
    ],

    learningFrom: [
      "Your approvals",
      "Your decisions",
      "Your daily activity",
      "Your long-term goals",
    ],

    today: {
      recommendation: kai.decision.recommendation,
      question: kai.decision.oneQuestion,
      approvalButton: kai.morning.approvalButton,
    },

    memory: {
      lastDecision: kai.memory.previousDecision,
      lesson: kai.memory.lessonLearned,
      avoid: kai.memory.avoid,
    },

    next: {
      afterApproval: kai.afterApproval,
      nextReview: "Tomorrow morning",
    },
  };
}