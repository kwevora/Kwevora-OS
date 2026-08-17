import { outcomeEvaluationRepository } from "./database/OutcomeEvaluationRepository";

import { overnightReportRepository } from "./database/OvernightReportRepository";

import {
  outcomeFollowUpEngine,
  type OutcomeFollowUp,
} from "./OutcomeFollowUpEngine";

import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";

import type { AutonomousCycleStatus } from "./AutonomousContentCycleEngine";

import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { crossPlatformLearningBrain } from "./CrossPlatformLearningBrain";

export type MorningLearningStatus =
  | "success"
  | "partial"
  | "failure"
  | "monitoring"
  | "waiting";

export type MorningLearningReport = {
  generatedAt: string;
  status: MorningLearningStatus;
  headline: string;
  measuredResult: string;
  observations: string[];
  lesson: string;
  decisionImpact: string;
  todayRecommendation: string;
  appliedToCurrentPlan: boolean;
  ownerQuestion: OutcomeFollowUp | null;
  monitoringCount: number;
  waitingCount: number;
  autonomousCycle: {
    status: AutonomousCycleStatus;
    title: string;
    nextAction: string;
    ownerAttentionRequired: boolean;
    whatChanged: string[];
  } | null;
};

function outcomeImpact(outcome: string): string {
  if (outcome === "success") {
    return "KAI strengthened matching opportunities because the approach has measured evidence that it worked.";
  }

  if (outcome === "partial") {
    return "KAI kept matching opportunities available, reduced certainty, and will adjust the weaker parts before repeating them.";
  }

  return "KAI lowered matching opportunities and will choose a different approach instead of repeating the failed one unchanged.";
}

export class MorningLearningReportEngine {
  async build(): Promise<MorningLearningReport> {
    const generatedAt = new Date().toISOString();

    const latestOutcome = await outcomeEvaluationRepository.latest();

    const latestPerformance =
      (await contentPerformanceSnapshotRepository.history(1))[0] ?? null;

    const crossPlatformPlaybook = await crossPlatformLearningBrain.playbook();

    const latestOvernight = await overnightReportRepository.latest();

    const latestCycle = await autonomousCycleRepository.latest();

    const autonomousCycle = latestCycle
      ? {
          status: latestCycle.status,
          title: latestCycle.title,
          nextAction: latestCycle.nextAction,
          ownerAttentionRequired: latestCycle.ownerAttentionRequired,
          whatChanged: latestCycle.events
            .slice(-3)
            .map((event) => event.message),
        }
      : null;

    const followUps = await outcomeFollowUpEngine.scan();

    const ownerQuestion =
      followUps.find((followUp) => followUp.ownerAttentionRequired) ?? null;

    const monitoringCount = followUps.filter(
      (followUp) => followUp.status === "monitoring",
    ).length;

    const waitingCount = followUps.filter(
      (followUp) =>
        followUp.status === "waiting_for_execution" ||
        followUp.status === "ready_to_collect",
    ).length;

    const todayRecommendation =
      (crossPlatformPlaybook.verifiedPublications > 0
        ? crossPlatformPlaybook.nextActions[0]
        : "") ||
      latestPerformance?.recommendation ||
      latestOvernight?.report.biggestOpportunity ||
      latestOvernight?.report.executivePriority ||
      "KAI will choose the next recommendation after the current results are ready.";

    const performanceIsNewest = Boolean(
      latestPerformance &&
      (!latestOutcome ||
        new Date(latestPerformance.collectedAt).getTime() >=
          new Date(latestOutcome.createdAt).getTime()),
    );

    if (latestPerformance && performanceIsNewest) {
      const measured = Object.entries(latestPerformance.metrics)
        .filter(([, value]) => value !== null)
        .slice(0, 5)
        .map(
          ([name, value]) =>
            `${name.replaceAll(/([A-Z])/g, " $1").toLowerCase()}: ${value}`,
        );
      const appliedToCurrentPlan = Boolean(
        latestOvernight &&
        new Date(latestOvernight.finishedAt).getTime() >=
          new Date(latestPerformance.collectedAt).getTime(),
      );
      const status: MorningLearningStatus =
        latestPerformance.decision === "repeat"
          ? "success"
          : latestPerformance.decision === "stop"
            ? "failure"
            : latestPerformance.decision === "improve"
              ? "partial"
              : "monitoring";
      return {
        generatedAt,
        status,
        headline:
          latestPerformance.decision === "repeat"
            ? "KAI found a verified content pattern worth repeating."
            : latestPerformance.decision === "stop"
              ? "KAI found a verified pattern that should stop."
              : latestPerformance.decision === "improve"
                ? "KAI found a verified result that needs one focused improvement."
                : "KAI saved the result and is gathering enough evidence to decide.",
        measuredResult: `${latestPerformance.platform.toUpperCase()} · ${latestPerformance.confidence}% confidence`,
        observations: [
          ...measured,
          ...(crossPlatformPlaybook.platformRanking[0]?.evidenceCount >= 3
            ? [
                `Strongest verified platform so far: ${crossPlatformPlaybook.platformRanking[0].platform} (${crossPlatformPlaybook.platformRanking[0].averageScore}% average evidence score).`,
              ]
            : []),
          ...(crossPlatformPlaybook.provenPatterns[0]
            ? [
                `Proven pattern: ${crossPlatformPlaybook.provenPatterns[0].dimension.replaceAll("_", " ")} — ${crossPlatformPlaybook.provenPatterns[0].value}.`,
              ]
            : []),
          ...(latestPerformance.missingMetrics.length
            ? [
                `Unavailable—not estimated: ${latestPerformance.missingMetrics.join(", ")}.`,
              ]
            : []),
        ],
        lesson: latestPerformance.lesson,
        decisionImpact: appliedToCurrentPlan
          ? "This verified evidence is already reflected in KAI's current growth recommendation."
          : "KAI will apply this verified evidence when it builds the next growth plan.",
        todayRecommendation,
        appliedToCurrentPlan,
        ownerQuestion,
        monitoringCount,
        waitingCount,
        autonomousCycle,
      };
    }

    if (latestOutcome) {
      const evaluation = latestOutcome.evaluation;

      const appliedToCurrentPlan = Boolean(
        latestOvernight &&
        new Date(latestOvernight.finishedAt).getTime() >=
          new Date(latestOutcome.createdAt).getTime(),
      );

      return {
        generatedAt,
        status: evaluation.outcome,
        headline:
          evaluation.outcome === "success"
            ? "KAI found a result worth repeating."
            : evaluation.outcome === "partial"
              ? "KAI found what worked and what needs adjustment."
              : "KAI found an approach that should change.",
        measuredResult: `${evaluation.outcome.toUpperCase()} · ${evaluation.score}% outcome score`,
        observations: evaluation.observations,
        lesson:
          evaluation.lessons[0] ||
          "KAI recorded the measured result for future decisions.",
        decisionImpact: `${outcomeImpact(evaluation.outcome)} ${
          appliedToCurrentPlan
            ? "That evidence is already included in today's recommendation."
            : "That evidence will be applied during KAI's next decision cycle."
        }`,
        todayRecommendation,
        appliedToCurrentPlan,
        ownerQuestion,
        monitoringCount,
        waitingCount,
        autonomousCycle,
      };
    }

    return {
      generatedAt,
      status: monitoringCount > 0 ? "monitoring" : "waiting",
      headline:
        monitoringCount > 0
          ? "KAI is giving live work time to produce meaningful results."
          : "KAI is waiting for measurable work to reach the audience.",
      measuredResult: "No new completed measurement yet.",
      observations: [],
      lesson: "KAI will not claim a lesson until a real result is available.",
      decisionImpact:
        "Today's recommendation continues using the strongest verified evidence already in memory.",
      todayRecommendation,
      appliedToCurrentPlan: false,
      ownerQuestion,
      monitoringCount,
      waitingCount,
      autonomousCycle,
    };
  }
}

export const morningLearningReportEngine = new MorningLearningReportEngine();
