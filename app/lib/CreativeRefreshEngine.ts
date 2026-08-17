import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
} from "./AutonomousGrowthPlanner";
import {
  creativeWinnerSystem,
  type CreativeVideoWinner,
} from "./CreativeWinnerSystem";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";
import {
  videoExperimentPlanner,
  type VideoDirectionExperiment,
  type VideoExperimentVariable,
} from "./VideoExperimentPlanner";

const VARIABLES: VideoExperimentVariable[] = [
  "opening_style",
  "caption_style",
  "pacing",
  "visual_sequence",
  "voice_rate",
  "music_volume",
  "music_mood",
  "voice_style",
];
const DEFAULTS: Record<VideoExperimentVariable, string> = {
  pacing: "balanced",
  opening_style: "close-up",
  caption_style: "moderate",
  voice_style: "confident",
  voice_rate: "1",
  music_mood: "motivational",
  music_volume: "0.21",
  visual_sequence: "current proven sequence",
  platform_native_cut: "current platform-native cut",
};

function challenger(variable: VideoExperimentVariable, control: string) {
  if (variable === "opening_style")
    return control === "detail" ? "close-up" : "detail";
  if (variable === "caption_style")
    return control === "minimal" ? "moderate" : "minimal";
  if (variable === "pacing") return control === "rapid" ? "balanced" : "rapid";
  if (variable === "visual_sequence")
    return "alternate cinematic shot sequence";
  if (variable === "voice_rate") return Number(control) >= 1 ? "0.92" : "1.08";
  if (variable === "music_volume")
    return Number(control) >= 0.21 ? "0.17" : "0.25";
  if (variable === "music_mood")
    return control === "confident" ? "motivational" : "confident";
  return control === "energetic" ? "calm" : "energetic";
}

function matches(slot: GrowthPlanSlot, winner: CreativeVideoWinner) {
  return (
    slot.status !== "rejected" &&
    slot.format === "faceless_video" &&
    slot.product === winner.context.product &&
    slot.platform.toLowerCase() === winner.context.platform.toLowerCase() &&
    slot.hook === winner.context.hook &&
    slot.offer === winner.context.offer &&
    slot.callToAction === winner.context.callToAction
  );
}

function splitMatched(slots: GrowthPlanSlot[]) {
  const control: GrowthPlanSlot[] = [];
  const challengerSlots: GrowthPlanSlot[] = [];
  slots.slice(0, 6).forEach((slot, index) => {
    const pairIndex = Math.floor(index / 2);
    const isControl = pairIndex % 2 === 0 ? index % 2 === 0 : index % 2 === 1;
    (isControl ? control : challengerSlots).push(slot);
  });
  return { control, challenger: challengerSlots };
}

export class CreativeRefreshEngine {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = (
      await videoDirectionExperimentRepository.forPlan(growthPlan.id)
    )[0];
    if (existing)
      return await videoExperimentPlanner.evaluate(growthPlan, existing);
    const fatigued = (await creativeWinnerSystem.sync()).find(
      (winner) =>
        winner.status !== "retired" &&
        winner.recentEvidenceCount >= 2 &&
        winner.recentScore !== null &&
        winner.recentScore <= winner.promotedScore - 5,
    );
    if (!fatigued || fatigued.recentScore === null) return null;
    const eligible = growthPlan.slots.filter((slot) => matches(slot, fatigued));
    if (eligible.length < 6) return null;
    const arms = splitMatched(eligible);
    const usedVariables = new Set(
      (await videoDirectionExperimentRepository.history(1000))
        .filter((item) => item.sourceWinnerId === fatigued.id)
        .map((item) => item.variable),
    );
    const variable =
      VARIABLES.find(
        (item) => item !== fatigued.variable && !usedVariables.has(item),
      ) ?? VARIABLES.find((item) => item !== fatigued.variable)!;
    const controlValue = fatigued.directions?.[variable] ?? DEFAULTS[variable];
    const challengerValue = challenger(variable, controlValue);
    const now = new Date().toISOString();
    return videoDirectionExperimentRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      kind: "creative_refresh",
      sourceWinnerId: fatigued.id,
      fatigueEvidence: {
        promotedScore: fatigued.promotedScore,
        recentScore: fatigued.recentScore,
        verifiedReuseResults: fatigued.recentEvidenceCount,
        decline: fatigued.promotedScore - fatigued.recentScore,
      },
      status: growthPlan.ownerApprovedAt ? "active" : "awaiting_approval",
      variable,
      hypothesis: `The proven ${fatigued.variable.replaceAll("_", " ")} winner is showing verified fatigue. Changing only ${variable.replaceAll("_", " ")} from ${controlValue} to ${challengerValue} may restore attention while preserving the proven product, audience, platform, message, offer, CTA, and winning direction.`,
      control: {
        value: controlValue,
        slotIds: arms.control.map((slot) => slot.id),
        executionPlanIds: [],
        averageScore: null,
      },
      challenger: {
        value: challengerValue,
        slotIds: arms.challenger.map((slot) => slot.id),
        executionPlanIds: [],
        averageScore: null,
      },
      matchedConditions: {
        ...fatigued.context,
        postingWindow: "balanced across the approved weekly cadence",
      },
      minimumEvidencePerArm: 3,
      successRule:
        "Promote the refreshed version only after three verified publications per arm and a five-point advantage without reducing verified sales or revenue.",
      stopRule:
        "Stop the refresh after sufficient evidence if it trails by five points, or immediately for a safety or brand violation.",
      resultExplanation: growthPlan.ownerApprovedAt
        ? "The approved weekly boundary authorized this one-variable creative refresh."
        : "The refresh is prepared and waits inside the weekly approval boundary.",
      winner: null,
      ownerApprovalRequired: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  async approvePlan(growthPlan: AutonomousGrowthPlan) {
    const refresh = await this.plan(growthPlan);
    return refresh?.kind === "creative_refresh"
      ? await videoExperimentPlanner.approvePlan(growthPlan)
      : refresh;
  }

  async summary(growthPlan: AutonomousGrowthPlan) {
    const refresh = await this.plan(growthPlan);
    return {
      active: refresh?.kind === "creative_refresh" ? refresh : null,
      fatigueRule:
        "KAI prepares a refresh only after two verified reuse results fall at least five points below the winner's promoted score. Exactly one low-risk editing variable changes; three matched results per arm are required.",
    };
  }
}

export const creativeRefreshEngine = new CreativeRefreshEngine();
