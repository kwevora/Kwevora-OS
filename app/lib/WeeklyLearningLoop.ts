import { randomUUID } from "node:crypto";
import type { AutonomousGrowthPlan } from "./AutonomousGrowthPlanner";
import { autonomousGrowthPlanRepository } from "./database/AutonomousGrowthPlanRepository";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";
import { weeklyLearningReviewRepository } from "./database/WeeklyLearningReviewRepository";
import { videoExperimentPlanner } from "./VideoExperimentPlanner";
import { creativeWinnerSystem } from "./CreativeWinnerSystem";
import { memoryBrain } from "./MemoryBrain";

export type WeeklyLesson = {
  status: "proven" | "retired" | "learning";
  category: "revenue" | "funnel" | "creative" | "video" | "operations";
  statement: string;
  evidenceCount: number;
  nextAction: string;
};
export type WeeklyLearningReview = {
  id: string;
  growthPlanId: string;
  weekStart: string;
  weekEnd: string;
  status: "collecting" | "completed";
  outcomes: {
    planned: number;
    published: number;
    measured: number;
    rejected: number;
    verifiedRevenue: number;
    revenueTarget: number;
    targetAttainment: number;
  };
  bucketResults: Array<{
    bucket: string;
    planned: number;
    measured: number;
    revenue: number;
  }>;
  lessons: WeeklyLesson[];
  experimentClosures: Array<{
    id: string;
    kind: string;
    status: string;
    winner: string | null;
    explanation: string;
  }>;
  carryForward: { repeat: string[]; avoid: string[]; stillLearning: string[] };
  summary: string;
  whyNextWeekChanges: string;
  missingEvidence: string[];
  auditTrail: Array<{ at: string; event: string; detail: string }>;
  createdAt: string;
  updatedAt: string;
};
const round = (n: number) => Math.round(n * 100) / 100;
export class WeeklyLearningLoop {
  async reconcile(plan: AutonomousGrowthPlan) {
    const prior = await weeklyLearningReviewRepository.forPlan(plan.id),
      now = new Date().toISOString();
    const terminal = plan.slots.every((s) =>
      ["measured", "rejected"].includes(s.status),
    );
    const ended = Date.now() > new Date(plan.weekEnd).getTime();
    const status: WeeklyLearningReview["status"] =
      terminal || ended ? "completed" : "collecting";
    const latest = new Map<
      string,
      Awaited<
        ReturnType<typeof contentPerformanceSnapshotRepository.history>
      >[number]
    >();
    for (const row of await contentPerformanceSnapshotRepository.history(
      5000,
    )) {
      const key = `${row.executionPlanId}:${row.platform}:${row.externalId}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    const snapshots = [...latest.values()].filter((s) =>
      plan.slots.some((slot) => slot.executionPlanId === s.executionPlanId),
    );
    const revenue = round(
      snapshots.reduce((sum, s) => sum + (s.metrics.revenue ?? 0), 0),
    );
    const bucketResults = ["winner", "challenger", "learning"].map((bucket) => {
      const slots = plan.slots.filter((s) => s.bucket === bucket),
        ids = new Set(slots.map((s) => s.executionPlanId).filter(Boolean));
      const rows = snapshots.filter((s) => ids.has(s.executionPlanId));
      return {
        bucket,
        planned: slots.length,
        measured: new Set(rows.map((s) => s.executionPlanId)).size,
        revenue: round(
          rows.reduce((sum, s) => sum + (s.metrics.revenue ?? 0), 0),
        ),
      };
    });
    const lessons: WeeklyLesson[] = [];
    for (const s of snapshots) {
      if (s.evidenceCount < 3) {
        lessons.push({
          status: "learning",
          category: "creative",
          statement: s.lesson,
          evidenceCount: s.evidenceCount,
          nextAction: s.recommendation,
        });
        continue;
      }
      const lessonStatus =
        s.decision === "repeat"
          ? "proven"
          : s.decision === "stop"
            ? "retired"
            : "learning";
      const category: WeeklyLesson["category"] =
        (s.metrics.sales ?? 0) > 0 || (s.metrics.revenue ?? 0) > 0
          ? "revenue"
          : (s.metrics.clicks ?? 0) > 0 || (s.metrics.leads ?? 0) > 0
            ? "funnel"
            : "creative";
      lessons.push({
        status: lessonStatus,
        category,
        statement: s.lesson,
        evidenceCount: s.evidenceCount,
        nextAction: s.recommendation,
      });
    }
    const unique = [
      ...new Map(
        lessons.map((x) => [`${x.status}:${x.statement}`, x]),
      ).values(),
    ].slice(0, 12);
    for (const experiment of await videoDirectionExperimentRepository.forPlan(
      plan.id,
    ))
      await videoExperimentPlanner.evaluate(plan, experiment);
    await creativeWinnerSystem.sync();
    const experimentClosures = (
      await videoDirectionExperimentRepository.forPlan(plan.id)
    )
      .filter((x) =>
        ["promoted", "stopped", "inconclusive", "blocked"].includes(x.status),
      )
      .map((x) => ({
        id: x.id,
        kind: x.kind ?? "direction_experiment",
        status: x.status,
        winner: x.winner,
        explanation: x.resultExplanation,
      }));
    const repeat = unique
        .filter((x) => x.status === "proven")
        .map((x) => x.nextAction),
      avoid = unique
        .filter((x) => x.status === "retired")
        .map((x) => x.nextAction),
      stillLearning = unique
        .filter((x) => x.status === "learning")
        .map((x) => x.nextAction);
    const measured = new Set(snapshots.map((s) => s.executionPlanId)).size,
      published = plan.slots.filter((s) =>
        ["published", "measured"].includes(s.status),
      ).length,
      rejected = plan.slots.filter((s) => s.status === "rejected").length,
      attainment = plan.weeklyRevenueTarget
        ? round((revenue / plan.weeklyRevenueTarget) * 100)
        : 0;
    const missingEvidence: string[] = [];
    if (measured < 3)
      missingEvidence.push(
        `Only ${measured} distinct execution(s) have verified results; KAI will not promote a weekly strategy before three comparable outcomes.`,
      );
    if (published > measured)
      missingEvidence.push(
        `${published - measured} published slot(s) still need verified performance results.`,
      );
    if (!snapshots.some((s) => s.metrics.clicks !== null))
      missingEvidence.push(
        "Verified click evidence is unavailable for this week.",
      );
    if (
      !snapshots.some(
        (s) => s.metrics.sales !== null || s.metrics.revenue !== null,
      )
    )
      missingEvidence.push(
        "Verified sales and revenue evidence is unavailable for this week.",
      );
    const summary =
      status === "completed"
        ? `Week reconciled: ${measured} measured execution${measured === 1 ? "" : "s"}, $${revenue.toFixed(2)} verified revenue, and ${experimentClosures.length} closed experiment${experimentClosures.length === 1 ? "" : "s"}.`
        : `Learning remains open: ${measured} of ${plan.postsPlanned} planned executions have verified outcomes.`;
    const whyNextWeekChanges = repeat.length
      ? `Next week can repeat ${repeat.length} evidence-backed lesson${repeat.length === 1 ? "" : "s"} while preserving controlled learning capacity.`
      : avoid.length
        ? `Next week will exclude ${avoid.length} repeatedly weak direction${avoid.length === 1 ? "" : "s"} and replace it with bounded learning.`
        : "No strategy earned a new automatic rule; next week remains evidence-seeking instead of guessing.";
    const createdAt = prior?.createdAt ?? now;
    const review: WeeklyLearningReview = {
      id: prior?.id ?? randomUUID(),
      growthPlanId: plan.id,
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      status,
      outcomes: {
        planned: plan.postsPlanned,
        published,
        measured,
        rejected,
        verifiedRevenue: revenue,
        revenueTarget: plan.weeklyRevenueTarget,
        targetAttainment: attainment,
      },
      bucketResults,
      lessons: unique,
      experimentClosures,
      carryForward: { repeat, avoid, stillLearning },
      summary,
      whyNextWeekChanges,
      missingEvidence,
      auditTrail: [
        ...(prior?.auditTrail ?? []).filter(
          (x) => x.event !== "results_reconciled" && x.event !== "week_closed",
        ),
        {
          at: now,
          event: "results_reconciled",
          detail: `Matched ${measured} verified execution result(s) to the weekly plan.`,
        },
        ...(status === "completed" &&
        !prior?.auditTrail.some((x) => x.event === "week_closed")
          ? [
              {
                at: now,
                event: "week_closed",
                detail:
                  "The weekly evidence window closed; durable lessons were evaluated.",
              },
            ]
          : []),
      ],
      createdAt,
      updatedAt: now,
    };
    const saved = await weeklyLearningReviewRepository.save(review);
    if (status === "completed") await this.remember(saved);
    return saved;
  }
  private async remember(review: WeeklyLearningReview) {
    const durable = [
      ...review.carryForward.repeat,
      ...review.carryForward.avoid,
    ];
    if (!durable.length) return;
    await memoryBrain.remember({
      id: `weekly-learning:${review.growthPlanId}`,
      type: "learning",
      title: `Verified weekly learning — ${review.weekStart}`,
      description: [review.summary, review.whyNextWeekChanges, ...durable].join(
        " ",
      ),
      importance: "high",
      learnedAt: review.updatedAt,
      tags: [
        "weekly-learning",
        "verified-results",
        "growth-plan",
        review.weekStart,
      ],
    });
  }
  async reconcilePrevious(currentPlan: AutonomousGrowthPlan) {
    const previous = (await autonomousGrowthPlanRepository.history(3)).find(
      (x) => x.id !== currentPlan.id,
    );
    return previous ? this.reconcile(previous) : null;
  }
  async summary(plan: AutonomousGrowthPlan) {
    return this.reconcile(plan);
  }
}
export const weeklyLearningLoop = new WeeklyLearningLoop();
