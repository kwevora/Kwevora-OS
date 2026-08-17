import type { ContentPackage } from "./ContentIntelligenceEngine";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";
import {
  revenueAttributionRepository,
  type AttributionEventType,
  type RevenueAttributionEvent,
} from "./database/RevenueAttributionRepository";

export type RevenueFunnel = {
  views: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  clickRate: number;
  leadRate: number;
  salesConversionRate: number;
  revenuePerPost: number;
};

export type RevenueAttribution = RevenueFunnel & {
  executionPlanId: string;
  title: string;
  product: string;
  platform: string;
  format: string;
  hook: string;
  callToAction: string;
  offer: string;
  trackingLink: string;
  classification:
    | "revenue_winner"
    | "attention_only"
    | "conversion_builder"
    | "learning";
  strategyScore: number;
  updatedAt: string;
};

function sum(
  events: RevenueAttributionEvent[],
  type: AttributionEventType,
): number {
  return events
    .filter((event) => event.eventType === type)
    .reduce((total, event) => total + event.quantity, 0);
}

function funnel(events: RevenueAttributionEvent[]): RevenueFunnel {
  const views = sum(events, "view");
  const clicks = sum(events, "click");
  const leads = sum(events, "lead");
  const sales = sum(events, "sale");
  const revenue = events
    .filter((event) => ["revenue", "sale", "refund"].includes(event.eventType))
    .reduce(
      (total, event) =>
        total + (event.eventType === "refund" ? -event.amount : event.amount),
      0,
    );
  return {
    views,
    clicks,
    leads,
    sales,
    revenue,
    clickRate: views ? Math.round((clicks / views) * 10000) / 100 : 0,
    leadRate: clicks ? Math.round((leads / clicks) * 10000) / 100 : 0,
    salesConversionRate: clicks
      ? Math.round((sales / clicks) * 10000) / 100
      : 0,
    revenuePerPost: Math.round(revenue * 100) / 100,
  };
}

function trackingLink(link: string, executionPlanId: string): string {
  if (!link.trim()) return "";
  try {
    const url = new URL(link);
    url.searchParams.set("kw_cycle", executionPlanId);
    url.searchParams.set("utm_source", "kwevora");
    url.searchParams.set("utm_campaign", executionPlanId);
    return url.toString();
  } catch {
    const separator = link.includes("?") ? "&" : "?";
    return `${link}${separator}kw_cycle=${encodeURIComponent(executionPlanId)}`;
  }
}

export class RevenueAttributionBrain {
  instrument(content: ContentPackage, executionPlanId: string): ContentPackage {
    const link = trackingLink(content.destinationLink, executionPlanId);
    if (!link) return content;
    return {
      ...content,
      destinationLink: link,
      callToAction: content.callToAction.replace(content.destinationLink, link),
      pinnedComment: content.pinnedComment.replace(
        content.destinationLink,
        link,
      ),
    };
  }

  async record(input: {
    executionPlanId: string;
    eventType: AttributionEventType;
    quantity?: number;
    amount?: number;
    currency?: string;
    source: string;
    externalEventId?: string;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  }) {
    if (
      !(await autonomousCycleRepository.forExecutionPlan(input.executionPlanId))
    ) {
      throw new Error(
        "The attribution event does not match a known KWEVORA content cycle.",
      );
    }
    return revenueAttributionRepository.save({
      executionPlanId: input.executionPlanId,
      eventType: input.eventType,
      quantity: Math.max(0, input.quantity ?? 1),
      amount: Math.max(0, input.amount ?? 0),
      currency: (input.currency ?? "USD").toUpperCase(),
      source: input.source.trim() || "owner",
      externalEventId: input.externalEventId,
      metadata: input.metadata ?? {},
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
  }

  async forCycle(executionPlanId: string) {
    const cycle =
      await autonomousCycleRepository.forExecutionPlan(executionPlanId);
    if (!cycle) return null;
    const metrics = funnel(
      await revenueAttributionRepository.forExecutionPlan(executionPlanId),
    );
    const content = cycle.originalContent;
    const offer =
      content.attributionContext?.offer ??
      content.strategyApplication.contextTags.find(
        (tag) =>
          ![
            "youtube",
            "tiktok",
            "instagram",
            "facebook",
            "video",
            "content",
            "audience",
          ].includes(tag),
      ) ??
      cycle.product;
    const classification: RevenueAttribution["classification"] =
      metrics.sales > 0 || metrics.revenue > 0
        ? "revenue_winner"
        : metrics.clicks > 0 || metrics.leads > 0
          ? "conversion_builder"
          : metrics.views >= 100
            ? "attention_only"
            : "learning";
    const strategyScore = Math.round(
      metrics.revenue * 5 +
        metrics.sales * 35 +
        metrics.leads * 10 +
        metrics.clicks * 2 +
        Math.min(20, metrics.views / 100),
    );
    return {
      executionPlanId,
      title: cycle.title,
      product: content.attributionContext?.product ?? cycle.product,
      platform:
        cycle.publication?.platform ??
        content.recommendedPlatforms[0] ??
        "unknown",
      format: String(content.format),
      hook: content.hook,
      callToAction: content.callToAction,
      offer,
      trackingLink: content.destinationLink,
      classification,
      strategyScore,
      updatedAt: cycle.updatedAt,
      ...metrics,
    };
  }

  async report(): Promise<RevenueAttribution[]> {
    const cycles = await autonomousCycleRepository.history(500);
    const results: Array<RevenueAttribution | null> = await Promise.all(
      cycles.map((cycle) => this.forCycle(cycle.executionPlanId)),
    );
    return results
      .filter((item): item is RevenueAttribution => item !== null)
      .sort((left, right) => right.strategyScore - left.strategyScore);
  }

  async summary() {
    const cycles = await this.report();
    return {
      totals: cycles.reduce(
        (total, item) => ({
          views: total.views + item.views,
          clicks: total.clicks + item.clicks,
          leads: total.leads + item.leads,
          sales: total.sales + item.sales,
          revenue: Math.round((total.revenue + item.revenue) * 100) / 100,
        }),
        { views: 0, clicks: 0, leads: 0, sales: 0, revenue: 0 },
      ),
      topRevenueCycle:
        cycles.find((item) => item.classification === "revenue_winner") ?? null,
      attentionOnly: cycles.filter(
        (item) => item.classification === "attention_only",
      ),
      ranked: cycles,
    };
  }
}

export const revenueAttributionBrain = new RevenueAttributionBrain();
