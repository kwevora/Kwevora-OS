import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
} from "./AutonomousGrowthPlanner";
import {
  creativeWinnerSystem,
  type CreativeVideoWinner,
  type CreativeWinnerDirective,
} from "./CreativeWinnerSystem";
import { creativePortfolioRepository } from "./database/CreativePortfolioRepository";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";

export type CreativePortfolioAssignment = {
  slotId: string;
  position: number;
  role: "scale" | "rotate" | "test" | "learn" | "hold";
  winnerId: string | null;
  winnerScore: number | null;
  expectedAudience: string | null;
  reason: string;
};

export type CreativePortfolioPlan = {
  id: string;
  growthPlanId: string;
  assignments: CreativePortfolioAssignment[];
  rankedWinners: Array<{
    winnerId: string;
    rank: number;
    score: number;
    status: string;
    variable: string;
    value: string;
    context: CreativeVideoWinner["context"];
    reason: string;
  }>;
  allocation: {
    scale: number;
    rotate: number;
    test: number;
    learn: number;
    hold: number;
  };
  explanation: string;
  createdAt: string;
  updatedAt: string;
};
export type CreativePortfolioDirective = {
  portfolioPlanId: string;
  slotId: string;
  role: CreativePortfolioAssignment["role"];
  winnerId: string | null;
  winnerScore: number | null;
  reason: string;
};

function score(winner: CreativeVideoWinner) {
  const current = winner.recentScore ?? winner.promotedScore;
  const strength = winner.promotedScore * 0.4;
  const recent = current * 0.3;
  const lift = Math.min(15, Math.max(0, winner.lift * 1.5));
  const evidence = Math.min(
    10,
    winner.evidenceCount + winner.recentEvidenceCount,
  );
  const freshness = winner.status === "active" ? 5 : 2;
  return Math.round(
    Math.min(100, strength + recent + lift + evidence + freshness),
  );
}

function matches(winner: CreativeVideoWinner, slot: GrowthPlanSlot) {
  return (
    winner.status !== "retired" &&
    winner.context.product === slot.product &&
    winner.context.platform.toLowerCase() === slot.platform.toLowerCase() &&
    winner.context.format === slot.format &&
    winner.context.hook === slot.hook &&
    winner.context.offer === slot.offer &&
    winner.context.callToAction === slot.callToAction
  );
}

export class CreativePortfolioManager {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = await creativePortfolioRepository.forGrowthPlan(
      growthPlan.id,
    );
    if (existing) return existing;
    const winnerSummary = await creativeWinnerSystem.summary();
    const winners = [...winnerSummary.active, ...winnerSummary.watching];
    const held = new Set(winnerSummary.heldForEvidence.map((item) => item.id));
    const ranked = winners
      .map((winner) => ({ winner, score: score(winner) }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.winner.promotedAt.localeCompare(left.winner.promotedAt),
      );
    const experiments = await videoDirectionExperimentRepository.forPlan(
      growthPlan.id,
    );
    const experimentBySlot = new Map(
      experiments.flatMap((item) =>
        [...item.control.slotIds, ...item.challenger.slotIds].map(
          (slotId) => [slotId, item] as const,
        ),
      ),
    );
    const usage = new Map<string, number>();
    let previousWinnerId: string | null = null;

    const assignments = growthPlan.slots.map(
      (slot): CreativePortfolioAssignment => {
        const matching = ranked.filter((item) => matches(item.winner, slot));
        const experiment = experimentBySlot.get(slot.id);
        const requiredBaseline =
          experiment?.kind === "creative_refresh" && experiment.sourceWinnerId
            ? matching.filter(
                (item) => item.winner.id === experiment.sourceWinnerId,
              )
            : [];
        const available = requiredBaseline.length
          ? requiredBaseline
          : matching.filter((item) => !held.has(item.winner.id));
        const isExperiment = Boolean(experiment);
        if (slot.format !== "faceless_video")
          return {
            slotId: slot.id,
            position: slot.position,
            role: "learn",
            winnerId: null,
            winnerScore: null,
            expectedAudience: null,
            reason:
              "This slot is not a faceless video, so no video creative template is forced onto it.",
          };
        if (experiment?.kind === "cross_platform_expansion")
          return {
            slotId: slot.id,
            position: slot.position,
            role: "test",
            winnerId: null,
            winnerScore: null,
            expectedAudience: experiment.matchedConditions.audience,
            reason: `Keep the ${experiment.destinationPlatform} native control clean while the challenger receives only the isolated ${experiment.sourcePlatform} winner-transfer treatment.`,
          };
        if (!isExperiment && slot.bucket === "learning")
          return {
            slotId: slot.id,
            position: slot.position,
            role: "learn",
            winnerId: null,
            winnerScore: null,
            expectedAudience: null,
            reason:
              "This learning slot stays open so KAI can discover a genuinely new creative direction.",
          };
        if (!available.length) {
          const waiting = matching.length > 0;
          return {
            slotId: slot.id,
            position: slot.position,
            role: waiting ? "hold" : "learn",
            winnerId: null,
            winnerScore: null,
            expectedAudience: null,
            reason: waiting
              ? "Every matching winner is waiting for verified evidence, so KAI will not overuse it."
              : "No verified winner matches this exact product, platform, format, hook, offer, and CTA.",
          };
        }
        const rotated =
          available.length > 1 && available[0].winner.id === previousWinnerId
            ? available.slice(1)
            : available;
        const selected = [...rotated].sort((left, right) => {
          const leftUses = usage.get(left.winner.id) ?? 0;
          const rightUses = usage.get(right.winner.id) ?? 0;
          return leftUses - rightUses || right.score - left.score;
        })[0];
        usage.set(selected.winner.id, (usage.get(selected.winner.id) ?? 0) + 1);
        previousWinnerId = selected.winner.id;
        const role = isExperiment
          ? ("test" as const)
          : slot.bucket === "winner"
            ? ("scale" as const)
            : ("rotate" as const);
        return {
          slotId: slot.id,
          position: slot.position,
          role,
          winnerId: selected.winner.id,
          winnerScore: selected.score,
          expectedAudience: selected.winner.context.audience,
          reason:
            role === "test"
              ? `Preserve ranked winner #${ranked.findIndex((item) => item.winner.id === selected.winner.id) + 1} as the baseline beneath the approved one-variable test.`
              : role === "scale"
                ? `Scale the strongest compatible winner at portfolio score ${selected.score}.`
                : `Rotate a compatible winner at portfolio score ${selected.score} without repeating the previous template.`,
        };
      },
    );
    const allocation = { scale: 0, rotate: 0, test: 0, learn: 0, hold: 0 };
    assignments.forEach((item) => {
      allocation[item.role] += 1;
    });
    const now = new Date().toISOString();
    return creativePortfolioRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      assignments,
      rankedWinners: ranked.map((item, index) => ({
        winnerId: item.winner.id,
        rank: index + 1,
        score: item.score,
        status: item.winner.status,
        variable: item.winner.variable,
        value: item.winner.value,
        context: item.winner.context,
        reason: `${item.winner.promotedScore} promoted score · ${item.winner.recentScore ?? "no recent"} recent score · ${item.winner.lift} point lift · ${item.winner.evidenceCount + item.winner.recentEvidenceCount} verified evidence.`,
      })),
      allocation,
      explanation: `KAI ranked ${ranked.length} active creative winner${ranked.length === 1 ? "" : "s"} and allocated ${allocation.scale} scale, ${allocation.rotate} rotation, ${allocation.test} controlled-test, ${allocation.learn} learning, and ${allocation.hold} evidence-hold slot(s).`,
      createdAt: now,
      updatedAt: now,
    });
  }

  async directiveForSlot(
    growthPlan: AutonomousGrowthPlan,
    slot: GrowthPlanSlot,
    audience: string,
  ) {
    const portfolio = await this.plan(growthPlan);
    const assignment = portfolio.assignments.find(
      (item) => item.slotId === slot.id,
    );
    if (!assignment?.winnerId || assignment.expectedAudience !== audience)
      return null;
    const assigned = await creativeWinnerSystem.directiveForWinner(
      assignment.winnerId,
      slot,
      audience,
    );
    if (assigned) return assigned;
    const summary = await creativeWinnerSystem.summary();
    const held = new Set(summary.heldForEvidence.map((item) => item.id));
    const replacement = [...summary.active, ...summary.watching]
      .filter(
        (winner) =>
          winner.id !== assignment.winnerId &&
          !held.has(winner.id) &&
          matches(winner, slot) &&
          winner.context.audience === audience,
      )
      .map((winner) => ({ winner, score: score(winner) }))
      .sort((left, right) => right.score - left.score)[0];
    if (!replacement) return null;
    await creativePortfolioRepository.save({
      ...portfolio,
      assignments: portfolio.assignments.map((item) =>
        item.slotId === slot.id
          ? {
              ...item,
              winnerId: replacement.winner.id,
              winnerScore: replacement.score,
              expectedAudience: replacement.winner.context.audience,
              reason: `Automatically replaced an unavailable or retired assignment with the next compatible verified winner at portfolio score ${replacement.score}.`,
            }
          : item,
      ),
    });
    return await creativeWinnerSystem.directiveForWinner(
      replacement.winner.id,
      slot,
      audience,
    );
  }

  async portfolioDirectiveForSlot(
    growthPlan: AutonomousGrowthPlan,
    slot: GrowthPlanSlot,
    audience: string,
  ) {
    const portfolio = await this.plan(growthPlan);
    const assignment = portfolio.assignments.find(
      (item) => item.slotId === slot.id,
    );
    if (
      assignment?.expectedAudience &&
      assignment.expectedAudience !== audience
    )
      return null;
    return assignment
      ? {
          portfolioPlanId: portfolio.id,
          slotId: slot.id,
          role: assignment.role,
          winnerId: assignment.winnerId,
          winnerScore: assignment.winnerScore,
          reason: assignment.reason,
        }
      : null;
  }

  async summary(growthPlan: AutonomousGrowthPlan) {
    const portfolio = await this.plan(growthPlan);
    return {
      ...portfolio,
      evidenceRule:
        "Portfolio scores use verified promoted strength, recent results, experiment lift, and evidence. KAI never crosses creative contexts, never repeats a winner when a compatible alternative exists, and never uses a winner waiting on measurement.",
    };
  }
}

export const creativePortfolioManager = new CreativePortfolioManager();
