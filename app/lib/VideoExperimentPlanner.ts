import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
} from "./AutonomousGrowthPlanner";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";
import {
  videoPerformanceIntelligence,
  type VideoEditingDimension,
} from "./VideoPerformanceIntelligence";

export type VideoExperimentVariable =
  | "pacing"
  | "opening_style"
  | "caption_style"
  | "voice_style"
  | "voice_rate"
  | "music_mood"
  | "music_volume"
  | "visual_sequence"
  | "platform_native_cut";
export type VideoExperimentDirective = {
  experimentId: string;
  arm: "control" | "challenger";
  variable: VideoExperimentVariable;
  value: string;
  hypothesis: string;
  matchedConditions: Record<string, string>;
  kind?: VideoDirectionExperiment["kind"];
  sourceWinnerId?: string | null;
  sourcePlatform?: string | null;
  destinationPlatform?: string | null;
  sourceDirections?: Partial<Record<VideoExperimentVariable, string>>;
};
export type VideoDirectionExperiment = {
  id: string;
  growthPlanId: string;
  kind?:
    | "direction_experiment"
    | "creative_refresh"
    | "cross_platform_expansion";
  sourceWinnerId?: string | null;
  sourcePlatform?: string | null;
  destinationPlatform?: string | null;
  sourceDirections?: Partial<Record<VideoExperimentVariable, string>>;
  fatigueEvidence?: {
    promotedScore: number;
    recentScore: number;
    verifiedReuseResults: number;
    decline: number;
  } | null;
  status:
    | "awaiting_approval"
    | "active"
    | "collecting"
    | "promoted"
    | "stopped"
    | "inconclusive"
    | "blocked";
  variable: VideoExperimentVariable;
  hypothesis: string;
  control: {
    value: string;
    slotIds: string[];
    executionPlanIds: string[];
    averageScore: number | null;
  };
  challenger: {
    value: string;
    slotIds: string[];
    executionPlanIds: string[];
    averageScore: number | null;
  };
  matchedConditions: {
    product: string;
    platform: string;
    format: string;
    postingWindow: string;
    audience: string;
    hook: string;
    offer: string;
    callToAction: string;
  };
  minimumEvidencePerArm: number;
  successRule: string;
  stopRule: string;
  resultExplanation: string;
  winner: "control" | "challenger" | null;
  ownerApprovalRequired: true;
  createdAt: string;
  updatedAt: string;
};

function conditionKey(slot: GrowthPlanSlot) {
  return [
    slot.product,
    slot.platform,
    slot.format,
    slot.hook,
    slot.offer,
    slot.callToAction,
  ].join("\u241f");
}
function challengerValue(
  dimension: VideoExperimentVariable,
  control: string,
): string {
  const value = control.toLowerCase();
  if (dimension === "pacing") return value === "rapid" ? "balanced" : "rapid";
  if (dimension === "opening_style")
    return value === "close-up" ? "detail" : "close-up";
  if (dimension === "caption_style")
    return value === "minimal" ? "moderate" : "minimal";
  if (dimension === "voice_style")
    return value.includes("energetic") ? "calm" : "energetic";
  if (dimension === "voice_rate")
    return String(
      Math.max(
        0.85,
        Math.min(
          1.15,
          Number(control) >= 1
            ? Number(control) - 0.08
            : Number(control) + 0.08,
        ),
      ),
    );
  if (dimension === "music_mood")
    return value === "motivational" ? "confident" : "motivational";
  if (dimension === "music_volume")
    return String(
      Math.max(
        0.14,
        Math.min(
          0.27,
          Number(control) >= 0.21
            ? Number(control) - 0.04
            : Number(control) + 0.04,
        ),
      ),
    );
  return "alternate cinematic shot sequence";
}
function metricScore(
  snapshot: Awaited<
    ReturnType<typeof contentPerformanceSnapshotRepository.history>
  >[number],
) {
  const retention = snapshot.metrics.averageViewPercentage ?? 0;
  const clicks = snapshot.metrics.clicks ?? 0;
  const sales = snapshot.metrics.sales ?? 0;
  const revenue = snapshot.metrics.revenue ?? 0;
  return Math.min(
    100,
    Math.round(
      retention * 0.55 +
        Math.min(20, clicks * 2) +
        Math.min(15, sales * 8) +
        Math.min(10, revenue * 0.2),
    ),
  );
}

export class VideoExperimentPlanner {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = (
      await videoDirectionExperimentRepository.forPlan(growthPlan.id)
    )[0];
    if (existing) return await this.evaluate(growthPlan, existing);
    const eligible = growthPlan.slots.filter(
      (slot) => slot.format === "faceless_video" && slot.status !== "rejected",
    );
    const groups = new Map<string, GrowthPlanSlot[]>();
    for (const slot of eligible)
      groups.set(conditionKey(slot), [
        ...(groups.get(conditionKey(slot)) ?? []),
        slot,
      ]);
    const matched =
      [...groups.values()]
        .sort((left, right) => right.length - left.length)[0]
        ?.slice(0, 6) ?? [];
    if (matched.length < 6) return null;
    const controlSlots: GrowthPlanSlot[] = [];
    const challengerSlots: GrowthPlanSlot[] = [];
    for (let index = 0; index < matched.length; index += 2) {
      const pair = matched.slice(index, index + 2);
      if (index % 4 === 0) {
        controlSlots.push(pair[0]);
        challengerSlots.push(pair[1]);
      } else {
        controlSlots.push(pair[1]);
        challengerSlots.push(pair[0]);
      }
    }
    const controlSlot = controlSlots[0];
    const playbook = await videoPerformanceIntelligence.playbook();
    const proven = playbook.provenPatterns.find(
      (item) =>
        item.platform === controlSlot!.platform.toLowerCase() ||
        item.platform === "all",
    );
    const variable = (
      proven?.dimension && proven.dimension !== "revision_type"
        ? proven.dimension
        : "pacing"
    ) as VideoExperimentVariable;
    const controlValue =
      proven?.value ??
      (variable === "pacing" ? "balanced" : "current approved direction");
    const variation = challengerValue(variable, controlValue);
    const createdAt = new Date().toISOString();
    return videoDirectionExperimentRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      kind: "direction_experiment",
      sourceWinnerId: null,
      fatigueEvidence: null,
      status: growthPlan.ownerApprovedAt ? "active" : "awaiting_approval",
      variable,
      hypothesis: `If KAI changes only ${variable.replaceAll("_", " ")} from ${controlValue} to ${variation}, the challenger should improve verified retention or business results without changing product, platform, format, or posting window.`,
      control: {
        value: controlValue,
        slotIds: controlSlots.map((slot) => slot.id),
        executionPlanIds: [],
        averageScore: null,
      },
      challenger: {
        value: variation,
        slotIds: challengerSlots.map((slot) => slot.id),
        executionPlanIds: [],
        averageScore: null,
      },
      matchedConditions: {
        product: controlSlot.product,
        platform: controlSlot.platform,
        format: controlSlot.format,
        postingWindow:
          "balanced across the approved weekly 18:00/22:00 UTC cadence",
        audience: "same approved target audience",
        hook: controlSlot.hook,
        offer: controlSlot.offer,
        callToAction: controlSlot.callToAction,
      },
      minimumEvidencePerArm: 3,
      successRule:
        "Promote only after at least three verified publications per arm and the challenger beats the control by 5 points without reducing verified sales or revenue.",
      stopRule:
        "Stop after sufficient evidence if the challenger trails the control by 5 points, or immediately for a verified safety or brand violation.",
      resultExplanation: growthPlan.ownerApprovedAt
        ? "The approved weekly boundary authorized this controlled video experiment."
        : "The experiment is prepared and waits inside the weekly approval boundary.",
      winner: null,
      ownerApprovalRequired: true,
      createdAt,
      updatedAt: createdAt,
    });
  }

  async approvePlan(growthPlan: AutonomousGrowthPlan) {
    const experiment = await this.plan(growthPlan);
    if (
      !experiment ||
      !growthPlan.ownerApprovedAt ||
      experiment.status !== "awaiting_approval"
    )
      return experiment;
    return videoDirectionExperimentRepository.save({
      ...experiment,
      status: "active",
      resultExplanation:
        "Weekly approval authorized this controlled video experiment.",
    });
  }

  async evaluate(
    growthPlan: AutonomousGrowthPlan,
    experiment: VideoDirectionExperiment,
  ) {
    const slots = new Map(growthPlan.slots.map((slot) => [slot.id, slot]));
    const controlExecution = experiment.control.slotIds
      .map((id) => slots.get(id)?.executionPlanId)
      .filter((id): id is string => Boolean(id));
    const challengerExecution = experiment.challenger.slotIds
      .map((id) => slots.get(id)?.executionPlanId)
      .filter((id): id is string => Boolean(id));
    const latest = new Map<
      string,
      Awaited<
        ReturnType<typeof contentPerformanceSnapshotRepository.history>
      >[number]
    >();
    for (const snapshot of await contentPerformanceSnapshotRepository.history(
      5000,
    )) {
      const key = `${snapshot.executionPlanId}:${snapshot.platform}:${snapshot.externalId}`;
      if (!latest.has(key)) latest.set(key, snapshot);
    }
    const controlResults = [...latest.values()].filter(
      (item) =>
        item.video?.experimentId === experiment.id &&
        item.video.experimentArm === "control",
    );
    const challengerResults = [...latest.values()].filter(
      (item) =>
        item.video?.experimentId === experiment.id &&
        item.video.experimentArm === "challenger",
    );
    const average = (values: typeof controlResults) =>
      values.length
        ? Math.round(
            values.reduce((sum, item) => sum + metricScore(item), 0) /
              values.length,
          )
        : null;
    const controlScore = average(controlResults);
    const challengerScore = average(challengerResults);
    let status = experiment.status;
    let winner = experiment.winner;
    let resultExplanation = experiment.resultExplanation;
    if (controlResults.length || challengerResults.length) {
      status = "collecting";
      resultExplanation = `Collected ${controlResults.length}/${experiment.minimumEvidencePerArm} control and ${challengerResults.length}/${experiment.minimumEvidencePerArm} challenger results. No winner is declared early.`;
    }
    if (
      controlResults.length >= experiment.minimumEvidencePerArm &&
      challengerResults.length >= experiment.minimumEvidencePerArm &&
      controlScore !== null &&
      challengerScore !== null
    ) {
      if (challengerScore >= controlScore + 5) {
        status = "promoted";
        winner = "challenger";
        resultExplanation = `The challenger won ${challengerScore} to ${controlScore} after sufficient matched evidence and becomes the new video-direction control.`;
      } else if (challengerScore <= controlScore - 5) {
        status = "stopped";
        winner = "control";
        resultExplanation = `The challenger lost ${challengerScore} to ${controlScore} after sufficient matched evidence and was stopped.`;
      } else {
        status = "inconclusive";
        winner = "control";
        resultExplanation = `The result was within 5 points (${challengerScore} versus ${controlScore}); KAI keeps the control and does not overstate a winner.`;
      }
    }
    return videoDirectionExperimentRepository.save({
      ...experiment,
      status,
      winner,
      resultExplanation,
      control: {
        ...experiment.control,
        executionPlanIds: controlExecution,
        averageScore: controlScore,
      },
      challenger: {
        ...experiment.challenger,
        executionPlanIds: challengerExecution,
        averageScore: challengerScore,
      },
    });
  }

  async directiveForSlot(slotId: string) {
    const experiment = await videoDirectionExperimentRepository.forSlot(slotId);
    if (
      !experiment ||
      !["awaiting_approval", "active", "collecting"].includes(experiment.status)
    )
      return null;
    const arm = experiment.challenger.slotIds.includes(slotId)
      ? ("challenger" as const)
      : ("control" as const);
    return {
      experimentId: experiment.id,
      arm,
      variable: experiment.variable,
      value:
        arm === "challenger"
          ? experiment.challenger.value
          : experiment.control.value,
      hypothesis: experiment.hypothesis,
      matchedConditions: experiment.matchedConditions,
      kind: experiment.kind,
      sourceWinnerId: experiment.sourceWinnerId,
      sourcePlatform: experiment.sourcePlatform,
      destinationPlatform: experiment.destinationPlatform,
      sourceDirections: experiment.sourceDirections,
    };
  }

  async summary(growthPlan: AutonomousGrowthPlan) {
    const experiment = await this.plan(growthPlan);
    return {
      active: experiment,
      total: (await videoDirectionExperimentRepository.forPlan(growthPlan.id))
        .length,
    };
  }
}

export const videoExperimentPlanner = new VideoExperimentPlanner();
