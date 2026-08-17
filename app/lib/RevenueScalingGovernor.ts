import { randomUUID } from "node:crypto";
import type { AutonomousGrowthPlan } from "./AutonomousGrowthPlanner";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { campaignFunnelRecoveryRepository } from "./database/CampaignFunnelRecoveryRepository";
import { revenueScalingDecisionRepository } from "./database/RevenueScalingDecisionRepository";
import { profitCashFlowController } from "./ProfitCashFlowController";
export type RevenueScalingDecision = {
  id: string;
  growthPlanId: string;
  status: "awaiting_approval" | "authorized";
  action: "scale" | "hold" | "reduce";
  currentWeeklyPosts: number;
  recommendedWeeklyPosts: number;
  verifiedPublications: number;
  revenuePublications: number;
  recentRevenuePerPost: number;
  previousRevenuePerPost: number | null;
  verifiedSales: number;
  verifiedRevenue: number;
  reason: string;
  protectedCapacity: {
    winnerPercent: number;
    challengerPercent: number;
    learningPercent: number;
  };
  stopRule: string;
  createdAt: string;
  updatedAt: string;
};
function round(n: number) {
  return Math.round(n * 100) / 100;
}
export class RevenueScalingGovernor {
  async recommendation() {
    const profitGate = (await profitCashFlowController.summary()).scalingGate,
      all = await contentPerformanceSnapshotRepository.history(5000);
    const latest = new Map<string, (typeof all)[number]>();
    all.forEach((x) => {
      if (!latest.has(x.executionPlanId)) latest.set(x.executionPlanId, x);
    });
    const rows = [...latest.values()],
      recent = rows.slice(0, 5),
      previous = rows.slice(5, 10),
      revenue = (list: typeof rows) =>
        list.reduce((s, x) => s + (x.metrics.revenue ?? 0), 0),
      rpp = (list: typeof rows) =>
        list.length ? round(revenue(list) / list.length) : 0,
      sales = rows.reduce((s, x) => s + (x.metrics.sales ?? 0), 0),
      money = rows.filter(
        (x) => (x.metrics.sales ?? 0) > 0 || (x.metrics.revenue ?? 0) > 0,
      ).length,
      totalRevenue = revenue(rows),
      unresolved = (await campaignFunnelRecoveryRepository.history()).some(
        (x) => ["awaiting_approval", "active", "collecting"].includes(x.status),
      ),
      recentRpp = rpp(recent),
      previousRpp = previous.length ? rpp(previous) : null;
    let action: "scale" | "hold" | "reduce" = "hold",
      posts = 10,
      reason =
        "KAI is holding the 10-post baseline while verified revenue evidence develops.";
    if (
      previousRpp !== null &&
      previousRpp > 0 &&
      recentRpp < previousRpp * 0.75
    ) {
      action = "reduce";
      posts = 8;
      reason = `Recent verified revenue per post fell ${Math.round((1 - recentRpp / previousRpp) * 100)}%, so KAI reduced volume before quality declines further.`;
    } else if (
      !unresolved &&
      profitGate.allowed &&
      money >= 3 &&
      sales >= 3 &&
      totalRevenue > 0
    ) {
      action = "scale";
      posts = 12;
      reason = `${money} revenue-producing publications, ${sales} verified sales, and positive verified profit support a gradual two-slot increase.`;
    } else if (unresolved)
      reason =
        "KAI blocked scaling while a verified campaign funnel recovery remains unresolved.";
    else if (!profitGate.allowed) reason = profitGate.explanation;
    return {
      action,
      posts,
      rows,
      money,
      sales,
      totalRevenue,
      recentRpp,
      previousRpp,
      reason,
    };
  }
  async suggestedWeeklyPosts() {
    return (await this.recommendation()).posts;
  }
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = await revenueScalingDecisionRepository.forPlan(
      growthPlan.id,
    );
    if (existing) return existing;
    const r = await this.recommendation(),
      now = new Date().toISOString();
    return revenueScalingDecisionRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      status: growthPlan.ownerApprovedAt ? "authorized" : "awaiting_approval",
      action: r.action,
      currentWeeklyPosts: 10,
      recommendedWeeklyPosts: growthPlan.postsPlanned,
      verifiedPublications: r.rows.length,
      revenuePublications: r.money,
      recentRevenuePerPost: r.recentRpp,
      previousRevenuePerPost: r.previousRpp,
      verifiedSales: r.sales,
      verifiedRevenue: round(r.totalRevenue),
      reason: r.reason,
      protectedCapacity: {
        winnerPercent: 60,
        challengerPercent: 20,
        learningPercent: 20,
      },
      stopRule:
        "Stop scaling and return to the 10-post baseline if verified revenue per post falls 25%, funnel recovery opens, production errors repeat, or review capacity is exceeded.",
      createdAt: now,
      updatedAt: now,
    });
  }
  async approve(growthPlan: AutonomousGrowthPlan) {
    const d = await this.plan(growthPlan);
    return revenueScalingDecisionRepository.save({
      ...d,
      status: "authorized",
    });
  }
  async summary(growthPlan: AutonomousGrowthPlan) {
    return {
      decision: await this.plan(growthPlan),
      evidenceRule:
        "Scale only from verified sales and revenue, never views alone; change weekly volume by at most two posts; preserve 20% challenger and 20% learning capacity.",
    };
  }
}
export const revenueScalingGovernor = new RevenueScalingGovernor();
