import {
  revenueAttributionBrain,
  type RevenueAttribution,
} from "./RevenueAttributionBrain";

export type RevenueOptimizationAction =
  | "learning"
  | "scale"
  | "revise"
  | "pause"
  | "replace";

export type StrategyPerformance = {
  key: string;
  product: string;
  platform: string;
  format: string;
  hook: string;
  callToAction: string;
  offer: string;
  posts: number;
  views: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  revenuePerPost: number;
  clickRate: number;
  salesConversionRate: number;
  declining: boolean;
  sufficientEvidence: boolean;
  action: RevenueOptimizationAction;
  allocationPercent: number;
  explanation: string;
};

export type RevenueOptimizationDecision = {
  generatedAt: string;
  minimumEvidencePosts: number;
  winner: StrategyPerformance | null;
  ranked: StrategyPerformance[];
  challenger: {
    variable: "hook" | "call_to_action" | "offer" | "platform" | "format";
    control: string;
    variation: string;
    hypothesis: string;
    allocationPercent: number;
  } | null;
  nextRevenueTarget: number;
  priorityReason: string;
};

const MINIMUM_EVIDENCE_POSTS = 3;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function strategyKey(item: RevenueAttribution): string {
  return [
    item.product,
    item.platform,
    item.format,
    item.hook,
    item.callToAction,
    item.offer,
  ].join("\u241f");
}

function aggregate(items: RevenueAttribution[]): StrategyPerformance {
  const ordered = [...items].sort((a, b) =>
    a.updatedAt.localeCompare(b.updatedAt),
  );
  const first = ordered[0];
  const posts = ordered.length;
  const views = ordered.reduce((sum, item) => sum + item.views, 0);
  const clicks = ordered.reduce((sum, item) => sum + item.clicks, 0);
  const leads = ordered.reduce((sum, item) => sum + item.leads, 0);
  const sales = ordered.reduce((sum, item) => sum + item.sales, 0);
  const revenue = round(ordered.reduce((sum, item) => sum + item.revenue, 0));
  const midpoint = Math.floor(posts / 2);
  const earlier = ordered.slice(0, midpoint);
  const recent = ordered.slice(midpoint);
  const earlierRate = earlier.length
    ? earlier.reduce((sum, item) => sum + item.revenue, 0) / earlier.length
    : 0;
  const recentRate = recent.length
    ? recent.reduce((sum, item) => sum + item.revenue, 0) / recent.length
    : 0;
  const declining =
    posts >= 4 && earlierRate > 0 && recentRate < earlierRate * 0.75;
  const sufficientEvidence = posts >= MINIMUM_EVIDENCE_POSTS;
  let action: RevenueOptimizationAction = "learning";
  let explanation = `Keep learning until this exact combination has ${MINIMUM_EVIDENCE_POSTS} completed posts.`;
  if (sufficientEvidence && revenue > 0 && sales >= 2 && !declining) {
    action = "scale";
    explanation = `Scale: ${posts} posts produced ${sales} sales and $${revenue.toFixed(2)}, not a one-sale spike.`;
  } else if (sufficientEvidence && declining) {
    action = "revise";
    explanation =
      "Revise: the proven combination's recent revenue per post fell more than 25% from its earlier baseline.";
  } else if (sufficientEvidence && (clicks > 0 || leads > 0) && sales === 0) {
    action = "revise";
    explanation =
      "Revise the offer or call to action: attention is moving into the funnel but is not becoming sales.";
  } else if (
    sufficientEvidence &&
    views >= 300 &&
    clicks === 0 &&
    sales === 0
  ) {
    action = "pause";
    explanation =
      "Pause: repeated attention produced no click, lead, sale, or revenue.";
  }
  return {
    key: strategyKey(first),
    product: first.product,
    platform: first.platform,
    format: first.format,
    hook: first.hook,
    callToAction: first.callToAction,
    offer: first.offer,
    posts,
    views,
    clicks,
    leads,
    sales,
    revenue,
    revenuePerPost: round(revenue / posts),
    clickRate: views ? round((clicks / views) * 100) : 0,
    salesConversionRate: clicks ? round((sales / clicks) * 100) : 0,
    declining,
    sufficientEvidence,
    action,
    allocationPercent: 0,
    explanation,
  };
}

function rankValue(item: StrategyPerformance): number {
  const evidence = Math.min(1, item.posts / MINIMUM_EVIDENCE_POSTS);
  return (
    evidence *
    (item.revenuePerPost * 1000 +
      item.salesConversionRate * 20 +
      item.sales * 10 +
      item.leads * 2 +
      item.clicks * 0.1)
  );
}

function challengerFor(winner: StrategyPerformance) {
  if (winner.clickRate < 2)
    return {
      variable: "hook" as const,
      control: winner.hook,
      variation: `${winner.hook} — problem-first variant`,
      hypothesis:
        "Changing only the opening hook can lift clicks while preserving the revenue-proven offer, format, CTA, and platform.",
    };
  if (winner.salesConversionRate < 5)
    return {
      variable: "call_to_action" as const,
      control: winner.callToAction,
      variation: `${winner.callToAction} — direct benefit-led variant`,
      hypothesis:
        "Changing only the CTA can improve sales conversion without discarding the proven traffic source.",
    };
  return {
    variable: "hook" as const,
    control: winner.hook,
    variation: `${winner.hook} — specificity variant`,
    hypothesis:
      "Test one more specific hook while holding every revenue-proven element constant.",
  };
}

export class RevenueOptimizationEngine {
  optimize(attributions: RevenueAttribution[]): RevenueOptimizationDecision {
    const groups = new Map<string, RevenueAttribution[]>();
    for (const item of attributions)
      groups.set(strategyKey(item), [
        ...(groups.get(strategyKey(item)) ?? []),
        item,
      ]);
    const ranked = [...groups.values()]
      .map(aggregate)
      .sort((a, b) => rankValue(b) - rankValue(a));
    const winner = ranked.find((item) => item.action === "scale") ?? null;
    for (const item of ranked) {
      if (winner && item.key === winner.key) item.allocationPercent = 60;
      else if (
        winner &&
        item.sufficientEvidence &&
        item.revenuePerPost < winner.revenuePerPost * 0.25 &&
        item.action === "learning"
      ) {
        item.action = "replace";
        item.explanation =
          "Replace: a sufficiently tested alternative earns less than 25% of the proven winner per post.";
      }
    }
    const challenger = winner ? challengerFor(winner) : null;
    const nextRevenueTarget = winner ? round(winner.revenuePerPost * 1.1) : 0;
    const priorityReason = winner
      ? `Prioritize ${winner.product} on ${winner.platform} in ${winner.format}: ${winner.posts} posts averaged $${winner.revenuePerPost.toFixed(2)} revenue per post. Allocate 60% to the winner and 20% to one controlled ${challenger?.variable.replaceAll("_", " ")} challenger; target $${nextRevenueTarget.toFixed(2)} revenue from the next post.`
      : `No strategy has earned scale status yet. Preserve learning until an exact combination reaches ${MINIMUM_EVIDENCE_POSTS} posts; one sale alone cannot redirect KAI.`;
    return {
      generatedAt: new Date().toISOString(),
      minimumEvidencePosts: MINIMUM_EVIDENCE_POSTS,
      winner,
      ranked,
      challenger: challenger ? { ...challenger, allocationPercent: 20 } : null,
      nextRevenueTarget,
      priorityReason,
    };
  }
}

export const revenueOptimizationEngine = new RevenueOptimizationEngine();
