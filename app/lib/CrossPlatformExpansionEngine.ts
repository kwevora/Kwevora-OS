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
} from "./VideoExperimentPlanner";

function matchesDestination(slot: GrowthPlanSlot, winner: CreativeVideoWinner) {
  return (
    slot.status !== "rejected" &&
    slot.format === "faceless_video" &&
    slot.product === winner.context.product &&
    slot.platform.toLowerCase() !== winner.context.platform.toLowerCase() &&
    slot.hook === winner.context.hook &&
    slot.offer === winner.context.offer &&
    slot.callToAction === winner.context.callToAction
  );
}

function split(slots: GrowthPlanSlot[]) {
  const control: GrowthPlanSlot[] = [];
  const challenger: GrowthPlanSlot[] = [];
  slots.slice(0, 6).forEach((slot, index) => {
    const pairIndex = Math.floor(index / 2);
    const isControl = pairIndex % 2 === 0 ? index % 2 === 0 : index % 2 === 1;
    (isControl ? control : challenger).push(slot);
  });
  return { control, challenger };
}

function strength(winner: CreativeVideoWinner) {
  return Math.round(
    winner.promotedScore * 0.45 +
      (winner.recentScore ?? winner.promotedScore) * 0.35 +
      Math.min(12, winner.lift * 1.5) +
      Math.min(8, winner.evidenceCount + winner.recentEvidenceCount),
  );
}

export class CrossPlatformExpansionEngine {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = (
      await videoDirectionExperimentRepository.forPlan(growthPlan.id)
    )[0];
    if (existing)
      return await videoExperimentPlanner.evaluate(growthPlan, existing);
    const summary = await creativeWinnerSystem.summary();
    const held = new Set(summary.heldForEvidence.map((item) => item.id));
    const winners = summary.active
      .filter((winner) => !held.has(winner.id))
      .sort((left, right) => strength(right) - strength(left));
    for (const winner of winners) {
      const byPlatform = new Map<string, GrowthPlanSlot[]>();
      for (const slot of growthPlan.slots.filter((item) =>
        matchesDestination(item, winner),
      )) {
        byPlatform.set(slot.platform, [
          ...(byPlatform.get(slot.platform) ?? []),
          slot,
        ]);
      }
      const destination = [...byPlatform.entries()]
        .filter(([, slots]) => slots.length >= 6)
        .sort((left, right) => right[1].length - left[1].length)[0];
      if (!destination) continue;
      const [destinationPlatform, slots] = destination;
      const alreadyTested = (
        await videoDirectionExperimentRepository.history(1000)
      ).some(
        (item) =>
          item.kind === "cross_platform_expansion" &&
          item.sourceWinnerId === winner.id &&
          item.destinationPlatform?.toLowerCase() ===
            destinationPlatform.toLowerCase(),
      );
      if (alreadyTested) continue;
      const arms = split(slots);
      const now = new Date().toISOString();
      return videoDirectionExperimentRepository.save({
        id: randomUUID(),
        growthPlanId: growthPlan.id,
        kind: "cross_platform_expansion",
        sourceWinnerId: winner.id,
        sourcePlatform: winner.context.platform,
        destinationPlatform,
        sourceDirections: winner.directions ?? {
          [winner.variable]: winner.value,
        },
        fatigueEvidence: null,
        status: growthPlan.ownerApprovedAt ? "active" : "awaiting_approval",
        variable: "platform_native_cut",
        hypothesis: `The verified ${winner.context.platform} creative winner may improve ${destinationPlatform} results when rebuilt as a native ${destinationPlatform} cut while preserving the product, audience, hook, offer, CTA, and proven creative directions.`,
        control: {
          value: `native ${destinationPlatform} baseline`,
          slotIds: arms.control.map((slot) => slot.id),
          executionPlanIds: [],
          averageScore: null,
        },
        challenger: {
          value: `${winner.context.platform} winner adapted for ${destinationPlatform}`,
          slotIds: arms.challenger.map((slot) => slot.id),
          executionPlanIds: [],
          averageScore: null,
        },
        matchedConditions: {
          ...winner.context,
          platform: destinationPlatform,
          postingWindow:
            "balanced across the approved destination-platform cadence",
        },
        minimumEvidencePerArm: 3,
        successRule: `Promote only after three verified ${destinationPlatform} publications per arm and a five-point challenger advantage without reducing verified sales or revenue.`,
        stopRule: `Stop the transfer after sufficient ${destinationPlatform} evidence if it trails by five points, or immediately for a safety, brand, or platform violation.`,
        resultExplanation: growthPlan.ownerApprovedAt
          ? `The approved weekly boundary authorized one ${destinationPlatform} expansion test.`
          : `The ${destinationPlatform} expansion is prepared and waits inside the weekly approval boundary.`,
        winner: null,
        ownerApprovalRequired: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  }

  async approvePlan(growthPlan: AutonomousGrowthPlan) {
    const expansion = await this.plan(growthPlan);
    return expansion?.kind === "cross_platform_expansion"
      ? await videoExperimentPlanner.approvePlan(growthPlan)
      : expansion;
  }

  async summary(growthPlan: AutonomousGrowthPlan) {
    const expansion = await this.plan(growthPlan);
    return {
      active: expansion?.kind === "cross_platform_expansion" ? expansion : null,
      evidenceRule:
        "KAI expands one winner to one destination platform at a time. Three native controls and three adapted challengers must publish there before KAI can scale or stop the transfer.",
    };
  }
}

export const crossPlatformExpansionEngine = new CrossPlatformExpansionEngine();
