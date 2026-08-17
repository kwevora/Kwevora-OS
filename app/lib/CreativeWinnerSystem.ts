import { randomUUID } from "node:crypto";
import type { GrowthPlanSlot } from "./AutonomousGrowthPlanner";
import type { ContentPerformanceSnapshot } from "./ContentPerformanceLearningEngine";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { creativeVideoWinnerRepository } from "./database/CreativeVideoWinnerRepository";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";
import type { VideoExperimentVariable } from "./VideoExperimentPlanner";

export type CreativeVideoWinner = {
  id: string;
  sourceExperimentId: string;
  status: "active" | "watching" | "retired";
  variable: VideoExperimentVariable;
  value: string;
  directions: Partial<Record<VideoExperimentVariable, string>>;
  context: {
    product: string;
    platform: string;
    format: string;
    audience: string;
    hook: string;
    offer: string;
    callToAction: string;
    postingWindow: string;
  };
  evidenceCount: number;
  promotedScore: number;
  controlScore: number;
  lift: number;
  recentScore: number | null;
  recentEvidenceCount: number;
  appliedCount: number;
  explanation: string;
  promotedAt: string;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreativeWinnerDirective = {
  winnerId: string;
  sourceExperimentId: string;
  variable: VideoExperimentVariable;
  value: string;
  directions: Partial<Record<VideoExperimentVariable, string>>;
  context: CreativeVideoWinner["context"];
  explanation: string;
};

function score(snapshot: ContentPerformanceSnapshot) {
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

function average(values: ContentPerformanceSnapshot[]) {
  return values.length
    ? Math.round(
        values.reduce((total, item) => total + score(item), 0) / values.length,
      )
    : null;
}

function matchesSnapshot(
  winner: CreativeVideoWinner,
  snapshot: ContentPerformanceSnapshot,
) {
  return (
    snapshot.platform.toLowerCase() === winner.context.platform.toLowerCase() &&
    snapshot.content.product === winner.context.product &&
    snapshot.content.format === winner.context.format &&
    snapshot.content.audience === winner.context.audience &&
    snapshot.content.hook === winner.context.hook &&
    snapshot.content.offer === winner.context.offer &&
    snapshot.content.callToAction === winner.context.callToAction &&
    !snapshot.video?.experimentId &&
    snapshot.video?.creativeWinnerId === winner.id &&
    snapshot.video.creativeWinnerVariable === winner.variable &&
    snapshot.video.creativeWinnerValue === winner.value
  );
}

function matchesSlot(
  winner: CreativeVideoWinner,
  slot: GrowthPlanSlot,
  audience: string,
) {
  return (
    winner.status !== "retired" &&
    slot.product === winner.context.product &&
    slot.platform.toLowerCase() === winner.context.platform.toLowerCase() &&
    slot.format === winner.context.format &&
    slot.hook === winner.context.hook &&
    slot.offer === winner.context.offer &&
    slot.callToAction === winner.context.callToAction &&
    audience === winner.context.audience
  );
}

export class CreativeWinnerSystem {
  async sync() {
    for (const experiment of await videoDirectionExperimentRepository.history(
      1000,
    )) {
      const decisiveWinner =
        experiment.status === "promoted" && experiment.winner === "challenger"
          ? ("challenger" as const)
          : experiment.status === "stopped" && experiment.winner === "control"
            ? ("control" as const)
            : null;
      if (
        !decisiveWinner ||
        experiment.challenger.averageScore === null ||
        experiment.control.averageScore === null
      )
        continue;
      if (
        (experiment.kind === "creative_refresh" ||
          experiment.kind === "cross_platform_expansion") &&
        decisiveWinner !== "challenger"
      )
        continue;
      if (await creativeVideoWinnerRepository.byExperiment(experiment.id))
        continue;
      const now = new Date().toISOString();
      const winningArm = experiment[decisiveWinner];
      const losingArm =
        experiment[decisiveWinner === "challenger" ? "control" : "challenger"];
      const sourceSnapshot = (
        await contentPerformanceSnapshotRepository.history(5000)
      ).find(
        (item) =>
          item.video?.experimentId === experiment.id &&
          item.video.experimentArm === decisiveWinner,
      );
      const sourceWinner = experiment.sourceWinnerId
        ? (await creativeVideoWinnerRepository.history(1000)).find(
            (item) => item.id === experiment.sourceWinnerId,
          )
        : null;
      const directions = {
        ...(sourceWinner?.directions ??
          (sourceWinner
            ? { [sourceWinner.variable]: sourceWinner.value }
            : {})),
        [experiment.variable]: winningArm.value,
      };
      await creativeVideoWinnerRepository.save({
        id: randomUUID(),
        sourceExperimentId: experiment.id,
        status: "active",
        variable: experiment.variable,
        value: winningArm.value,
        directions,
        context: {
          ...experiment.matchedConditions,
          audience:
            sourceSnapshot?.content.audience ??
            experiment.matchedConditions.audience,
        },
        evidenceCount: experiment.minimumEvidencePerArm,
        promotedScore: winningArm.averageScore!,
        controlScore: losingArm.averageScore!,
        lift: winningArm.averageScore! - losingArm.averageScore!,
        recentScore: null,
        recentEvidenceCount: 0,
        appliedCount: 0,
        explanation: `Promoted after ${experiment.minimumEvidencePerArm} matched publications per arm. The ${decisiveWinner} beat the alternative ${winningArm.averageScore} to ${losingArm.averageScore}.`,
        promotedAt: now,
        lastVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      if (sourceWinner && experiment.kind === "creative_refresh")
        await creativeVideoWinnerRepository.save({
          ...sourceWinner,
          status: "retired",
          explanation: `Superseded by a verified creative refresh that preserved ${Object.keys(sourceWinner.directions ?? {}).length || 1} winning direction(s) and added ${experiment.variable.replaceAll("_", " ")} = ${winningArm.value}.`,
        });
    }

    const snapshots = await contentPerformanceSnapshotRepository.history(5000);
    for (const winner of (
      await creativeVideoWinnerRepository.history(1000)
    ).filter((item) => item.status !== "retired")) {
      const matching = snapshots.filter(
        (item) =>
          item.collectedAt >= winner.promotedAt &&
          matchesSnapshot(winner, item),
      );
      const recent = matching.slice(0, 6);
      const recentScore = average(recent);
      let status = winner.status;
      let explanation = winner.explanation;
      if (recent.length >= 3 && recentScore !== null) {
        if (recentScore <= winner.promotedScore - 8) {
          status = "retired";
          explanation = `Retired after ${recent.length} verified reuse results averaged ${recentScore}, at least 8 points below its promoted score of ${winner.promotedScore}.`;
        } else {
          status = "active";
          explanation = `Still active: ${recent.length} verified reuse results average ${recentScore}, compared with its promoted score of ${winner.promotedScore}.`;
        }
      } else if (recent.length > 0) {
        status = "watching";
        explanation = `Watching ${recent.length}/3 verified reuse results. KAI will not retire or reconfirm this winner early.`;
      }
      await creativeVideoWinnerRepository.save({
        ...winner,
        status,
        explanation,
        recentScore,
        recentEvidenceCount: matching.length,
        lastVerifiedAt: recent[0]?.collectedAt ?? winner.lastVerifiedAt,
      });
    }
    return creativeVideoWinnerRepository.history(1000);
  }

  async directiveForSlot(slot: GrowthPlanSlot, audience: string) {
    const winner = (await this.sync()).find((item) =>
      matchesSlot(item, slot, audience),
    );
    return winner
      ? await this.directiveForWinner(winner.id, slot, audience)
      : null;
  }

  async directiveForWinner(
    winnerId: string,
    slot: GrowthPlanSlot,
    audience: string,
  ) {
    const winner = (await this.sync()).find(
      (item) => item.id === winnerId && matchesSlot(item, slot, audience),
    );
    if (!winner) return null;
    if (winner.appliedCount - winner.recentEvidenceCount >= 6) return null;
    await creativeVideoWinnerRepository.save({
      ...winner,
      appliedCount: winner.appliedCount + 1,
    });
    return {
      winnerId: winner.id,
      sourceExperimentId: winner.sourceExperimentId,
      variable: winner.variable,
      value: winner.value,
      directions: winner.directions ?? { [winner.variable]: winner.value },
      context: winner.context,
      explanation: winner.explanation,
    };
  }

  async summary() {
    const winners = await this.sync();
    return {
      total: winners.length,
      active: winners.filter((item) => item.status === "active"),
      watching: winners.filter((item) => item.status === "watching"),
      retired: winners.filter((item) => item.status === "retired"),
      heldForEvidence: winners.filter(
        (item) =>
          item.status !== "retired" &&
          item.appliedCount - item.recentEvidenceCount >= 6,
      ),
      evidenceRule:
        "KAI promotes only matched experiment winners, reuses them only in the same creative context, pauses after six unmeasured uses, and retires them after three verified reuse results decline by at least 8 points.",
    };
  }
}

export const creativeWinnerSystem = new CreativeWinnerSystem();
