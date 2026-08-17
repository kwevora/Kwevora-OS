import { randomUUID } from "node:crypto";
import type {
  RevenueOptimizationDecision,
  StrategyPerformance,
} from "./RevenueOptimizationEngine";

export type GrowthPlanBucket = "winner" | "challenger" | "learning";
export type GrowthPlanSlotStatus =
  | "planned"
  | "awaiting_review"
  | "approved"
  | "publishing_blocked"
  | "scheduled"
  | "published"
  | "measured"
  | "rejected";

export type GrowthPlanSlot = {
  id: string;
  position: number;
  scheduledFor: string;
  bucket: GrowthPlanBucket;
  product: string;
  platform: string;
  format: string;
  hook: string;
  callToAction: string;
  offer: string;
  changedVariable: string | null;
  expectedOutcome: string;
  revenueTarget: number;
  stopRule: string;
  status: GrowthPlanSlotStatus;
  executionPlanId: string | null;
  reviewItemId: string | null;
  replacementFor: string | null;
  publishedAt: string | null;
  revenueActual: number;
  updatedAt: string;
};

export type AutonomousGrowthPlan = {
  id: string;
  status: "ready_for_approval" | "active" | "completed" | "needs_attention";
  weekStart: string;
  weekEnd: string;
  postsPlanned: number;
  weeklyRevenueTarget: number;
  allocation: { winner: number; challenger: number; learning: number };
  suppressedStrategies: Array<{ key: string; action: "pause" | "replace"; reason: string }>;
  slots: GrowthPlanSlot[];
  approvalBrief: string;
  recoveryHistory?: Array<{
    id: string;
    at: string;
    diagnosis: string;
    action: string;
    slotId: string | null;
    ownerApprovalRequired: boolean;
  }>;
  ownerApprovedAt?: string | null;
  acknowledgedRecoveryActionIds?: string[];
  autonomyStatus?: "awaiting_approval" | "authorized" | "paused" | "revision_requested";
  revisionCount?: number;
  approvedHighRiskSlotIds?: string[];
  authorizationLog?: Array<{
    id: string;
    at: string;
    actor: "owner" | "kai";
    action: string;
    detail: string;
  }>;
  createdAt: string;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function monday(value: Date): Date {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function scheduledAt(start: Date, position: number, posts: number): string {
  const date = new Date(start);
  const dayOffset = Math.min(6, Math.floor(position * 7 / posts));
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(position % 2 === 0 ? 18 : 22, 0, 0, 0);
  return date.toISOString();
}

function applyChallenger(strategy: StrategyPerformance, decision: RevenueOptimizationDecision): StrategyPerformance {
  const challenger = decision.challenger;
  if (!challenger) return strategy;
  if (challenger.variable === "hook") return { ...strategy, hook: challenger.variation };
  if (challenger.variable === "call_to_action") return { ...strategy, callToAction: challenger.variation };
  if (challenger.variable === "offer") return { ...strategy, offer: challenger.variation };
  if (challenger.variable === "platform") return { ...strategy, platform: challenger.variation };
  return { ...strategy, format: challenger.variation };
}

function slot(input: {
  strategy: StrategyPerformance;
  bucket: GrowthPlanBucket;
  position: number;
  posts: number;
  weekStart: Date;
  changedVariable?: string;
  revenueTarget: number;
  expectedOutcome: string;
}): GrowthPlanSlot {
  return {
    id: randomUUID(), position: input.position + 1,
    scheduledFor: scheduledAt(input.weekStart, input.position, input.posts),
    bucket: input.bucket, product: input.strategy.product, platform: input.strategy.platform,
    format: input.strategy.format, hook: input.strategy.hook,
    callToAction: input.strategy.callToAction, offer: input.strategy.offer,
    changedVariable: input.changedVariable ?? null,
    expectedOutcome: input.expectedOutcome, revenueTarget: round(input.revenueTarget),
    stopRule: input.bucket === "winner"
      ? "Revise instead of scaling if recent revenue per post falls more than 25% below the proven baseline."
      : input.bucket === "challenger"
        ? "Do not promote the challenger until it has three posts and beats the control on revenue per post or sales conversion."
        : "Pause after three posts if the strategy produces attention without clicks, leads, sales, or revenue.",
    status: "planned", executionPlanId: null, reviewItemId: null, replacementFor: null,
    publishedAt: null, revenueActual: 0, updatedAt: new Date().toISOString(),
  };
}

export class AutonomousGrowthPlanner {
  plan(decision: RevenueOptimizationDecision, options: {
    postsPerWeek?: number;
    now?: Date;
    fallback?: Partial<Pick<StrategyPerformance, "product" | "platform" | "format" | "hook" | "callToAction" | "offer">>;
  } = {}): AutonomousGrowthPlan {
    const posts = Math.max(1, Math.min(30, Math.floor(options.postsPerWeek ?? 10)));
    const createdAt = (options.now ?? new Date()).toISOString();
    const weekStartDate = monday(options.now ?? new Date());
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const usable = decision.ranked.filter((item) => item.action !== "pause" && item.action !== "replace");
    const suppressedStrategies = decision.ranked
      .filter((item): item is StrategyPerformance & { action: "pause" | "replace" } => item.action === "pause" || item.action === "replace")
      .map((item) => ({ key: item.key, action: item.action, reason: item.explanation }));
    let winnerCount = 0;
    let challengerCount = 0;
    let learningCount = posts;
    if (decision.winner) {
      winnerCount = Math.round(posts * 0.6);
      challengerCount = Math.round(posts * 0.2);
      learningCount = posts - winnerCount - challengerCount;
    }
    const slots: GrowthPlanSlot[] = [];
    if (decision.winner) {
      for (let index = 0; index < winnerCount; index += 1) slots.push(slot({
        strategy: decision.winner, bucket: "winner", position: slots.length, posts, weekStart: weekStartDate,
        revenueTarget: decision.nextRevenueTarget,
        expectedOutcome: `Protect and scale the proven $${decision.winner.revenuePerPost.toFixed(2)} revenue-per-post control.`,
      }));
      const challenger = applyChallenger(decision.winner, decision);
      for (let index = 0; index < challengerCount; index += 1) slots.push(slot({
        strategy: challenger, bucket: "challenger", position: slots.length, posts, weekStart: weekStartDate,
        changedVariable: decision.challenger?.variable,
        revenueTarget: decision.nextRevenueTarget,
        expectedOutcome: decision.challenger?.hypothesis ?? "Measure one controlled change against the winner.",
      }));
    }
    const learningStrategies = usable.filter((item) => item.key !== decision.winner?.key);
    const fallback = decision.winner ?? usable[0] ?? {
      key: "new-learning-strategy",
      product: options.fallback?.product ?? "Current priority product",
      platform: options.fallback?.platform ?? "TikTok",
      format: options.fallback?.format ?? "faceless_video",
      hook: options.fallback?.hook ?? "Test a clear problem-first opening",
      callToAction: options.fallback?.callToAction ?? "Take the next useful step",
      offer: options.fallback?.offer ?? options.fallback?.product ?? "Current priority offer",
      posts: 0, views: 0, clicks: 0, leads: 0, sales: 0, revenue: 0,
      revenuePerPost: 0, clickRate: 0, salesConversionRate: 0, declining: false,
      sufficientEvidence: false, action: "learning" as const, allocationPercent: 0,
      explanation: "This is a new strategy and needs measured evidence.",
    };
    for (let index = 0; index < learningCount && fallback; index += 1) {
      const strategy = learningStrategies[index % Math.max(1, learningStrategies.length)] ?? fallback;
      slots.push(slot({
        strategy, bucket: "learning", position: slots.length, posts, weekStart: weekStartDate,
        revenueTarget: 0,
        expectedOutcome: strategy.action === "revise"
          ? `Repair the weak point identified by KAI: ${strategy.explanation}`
          : "Collect enough evidence to decide whether this strategy deserves scale, revision, or pause.",
      }));
    }
    const weeklyRevenueTarget = round(slots.reduce((total, item) => total + item.revenueTarget, 0));
    const approvalBrief = decision.winner
      ? `KAI prepared ${slots.length} posts: ${winnerCount} proven-winner posts, ${challengerCount} controlled challenger posts, and ${learningCount} learning posts. The weekly revenue target is $${weeklyRevenueTarget.toFixed(2)}. ${suppressedStrategies.length} paused or replaced strateg${suppressedStrategies.length === 1 ? "y was" : "ies were"} excluded.`
      : `KAI prepared ${slots.length} learning posts. No strategy receives scale allocation until it earns at least ${decision.minimumEvidencePosts} posts of evidence. ${suppressedStrategies.length} paused or replaced strateg${suppressedStrategies.length === 1 ? "y was" : "ies were"} excluded.`;
    return {
      id: randomUUID(), status: "ready_for_approval", weekStart: weekStartDate.toISOString(),
      weekEnd: weekEndDate.toISOString(), postsPlanned: slots.length, weeklyRevenueTarget,
      allocation: { winner: winnerCount, challenger: challengerCount, learning: slots.filter((item) => item.bucket === "learning").length },
      suppressedStrategies, slots, approvalBrief, createdAt,
      recoveryHistory: [],
      ownerApprovedAt: null,
      acknowledgedRecoveryActionIds: [],
      autonomyStatus: "awaiting_approval",
      revisionCount: 0,
      approvedHighRiskSlotIds: [],
      authorizationLog: [],
    };
  }
}

export const autonomousGrowthPlanner = new AutonomousGrowthPlanner();
