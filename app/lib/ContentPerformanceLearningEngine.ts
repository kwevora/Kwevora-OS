import { randomUUID } from "node:crypto";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { revenueAttributionRepository } from "./database/RevenueAttributionRepository";
import { revenueAttributionBrain } from "./RevenueAttributionBrain";
import { crossPlatformLearningBrain } from "./CrossPlatformLearningBrain";
import { autonomousPublishingHandoffRepository } from "./database/AutonomousPublishingHandoffRepository";
import { videoPerformanceIntelligence } from "./VideoPerformanceIntelligence";

export type VerifiedPerformanceMetrics = {
  views: number | null;
  watchTimeMinutes: number | null;
  averageViewDurationSeconds: number | null;
  averageViewPercentage: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
  clicks: number | null;
  leads: number | null;
  sales: number | null;
  revenue: number | null;
};

export type PerformanceDecision =
  | "repeat"
  | "improve"
  | "stop"
  | "keep_learning";

export type ContentPerformanceSnapshot = {
  id: string;
  executionPlanId: string;
  platform: string;
  externalId: string;
  source: string;
  verified: true;
  content: {
    title: string;
    audience: string;
    product: string;
    format: string;
    hook: string;
    callToAction: string;
    offer: string;
    destinationLink: string;
    topicTags: string[];
    hookStyle: string;
    ctaStyle: string;
    videoLengthSeconds: number | null;
    durationBand: string;
    suggestedPostingTime: string;
    postingWindow: string;
    recommendedPlatforms: string[];
    campaignId: string | null;
    campaignStage:
      | "attract"
      | "educate"
      | "prove"
      | "convert"
      | "follow_up"
      | null;
    businessLaunchId: string | null;
  };
  video: {
    version: number;
    videoId: string;
    revisionType: string;
    platform: string;
    pacing: string;
    openingStyle: string;
    captionStyle: string;
    voiceStyle: string;
    voiceRate: number | null;
    musicMood: string;
    musicVolume: number | null;
    visualSequence: string;
    experimentId: string | null;
    experimentArm: "control" | "challenger" | null;
    experimentVariable: string | null;
    experimentValue: string | null;
    experimentKind: string | null;
    experimentSourcePlatform: string | null;
    experimentDestinationPlatform: string | null;
    creativeWinnerId: string | null;
    creativeWinnerVariable: string | null;
    creativeWinnerValue: string | null;
    creativeWinnerDirections: Record<string, string>;
    creativePortfolioPlanId: string | null;
    creativePortfolioRole:
      | "scale"
      | "rotate"
      | "test"
      | "learn"
      | "hold"
      | null;
    creativePortfolioScore: number | null;
  } | null;
  metrics: VerifiedPerformanceMetrics;
  availableMetrics: string[];
  missingMetrics: string[];
  classification:
    | "revenue_winner"
    | "conversion_builder"
    | "attention_only"
    | "learning";
  decision: PerformanceDecision;
  confidence: number;
  evidenceCount: number;
  lesson: string;
  recommendation: string;
  comparedWith: string | null;
  collectedAt: string;
  createdAt: string;
};

export type CapturePerformanceInput = {
  executionPlanId: string;
  platform: string;
  externalId: string;
  source: string;
  metrics: Partial<Record<keyof VerifiedPerformanceMetrics, number | null>>;
  collectedAt?: string;
};

const METRIC_NAMES: Array<keyof VerifiedPerformanceMetrics> = [
  "views",
  "watchTimeMinutes",
  "averageViewDurationSeconds",
  "averageViewPercentage",
  "likes",
  "comments",
  "shares",
  "engagementRate",
  "clicks",
  "leads",
  "sales",
  "revenue",
];

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumEventQuantity(
  events: Awaited<
    ReturnType<typeof revenueAttributionRepository.forExecutionPlan>
  >,
  type: string,
) {
  const matching = events.filter((event) => event.eventType === type);
  return matching.length
    ? matching.reduce((total, event) => total + event.quantity, 0)
    : null;
}

function strategyKey(
  snapshot: Pick<ContentPerformanceSnapshot, "platform" | "content">,
): string {
  return [
    snapshot.platform,
    snapshot.content.product,
    snapshot.content.format,
    snapshot.content.hookStyle || snapshot.content.hook,
    snapshot.content.ctaStyle || snapshot.content.callToAction,
    snapshot.content.offer,
    ...(snapshot.content.topicTags ?? []).slice(0, 3),
  ].join("\u241f");
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function strings(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : fallback;
}
function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}
function hookStyle(hook: string): string {
  const value = hook.toLowerCase();
  if (/\d/.test(value)) return "number-led";
  if (value.includes("?")) return "question-led";
  if (/i |my |when i|here's what happened/.test(value)) return "story-led";
  if (/stuck|struggling|tired|problem|mistake|hard/.test(value))
    return "problem-first";
  if (/stop|truth|wrong|instead|not /.test(value)) return "contrarian";
  if (/how to|start|step|way to/.test(value)) return "benefit-first";
  return "recognition-led";
}
function ctaStyle(cta: string): string {
  const value = cta.toLowerCase();
  if (/link|bio|store|stan/.test(value)) return "destination-link";
  if (/comment|reply|dm|message/.test(value)) return "conversation";
  if (/buy|get|download|guide|planner/.test(value)) return "offer-led";
  if (/save|share|send/.test(value)) return "engagement";
  if (/follow|subscribe/.test(value)) return "audience-growth";
  return "next-step";
}
function durationBand(seconds: number | null): string {
  if (seconds === null) return "unknown";
  if (seconds <= 20) return "15-20 seconds";
  if (seconds <= 35) return "21-35 seconds";
  return "36-60 seconds";
}
function postingWindow(value: string): string {
  const lower = value.toLowerCase();
  const parsed = new Date(value);
  const hour = Number.isNaN(parsed.getTime()) ? null : parsed.getHours();
  if (lower.includes("morning") || (hour !== null && hour >= 5 && hour < 12))
    return "morning";
  if (lower.includes("afternoon") || (hour !== null && hour >= 12 && hour < 17))
    return "afternoon";
  if (lower.includes("evening") || (hour !== null && hour >= 17 && hour < 22))
    return "evening";
  if (lower.includes("night") || hour !== null) return "night";
  return "unspecified";
}

export class ContentPerformanceLearningEngine {
  async capture(input: CapturePerformanceInput) {
    const cycle = await autonomousCycleRepository.forExecutionPlan(
      input.executionPlanId,
    );
    if (!cycle)
      throw new Error(
        "The verified result does not match a known KWEVORA content cycle.",
      );

    const platform = input.platform.trim().toLowerCase();
    const externalId = input.externalId.trim();
    if (!platform || !externalId || !input.source.trim()) {
      throw new Error(
        "A verified platform, external publication ID, and source are required.",
      );
    }

    const suppliedViews = finite(input.metrics.views);
    if (suppliedViews !== null) {
      await revenueAttributionBrain.record({
        executionPlanId: input.executionPlanId,
        eventType: "view",
        quantity: suppliedViews,
        source: platform,
        externalEventId: `${platform}:${externalId}:views`,
        occurredAt: input.collectedAt,
        metadata: { cumulativeSnapshot: true, externalId, verified: true },
      });
    }

    const cumulativeFunnel: Array<{
      name: "clicks" | "leads" | "sales";
      eventType: "click" | "lead" | "sale";
    }> = [
      { name: "clicks", eventType: "click" },
      { name: "leads", eventType: "lead" },
      { name: "sales", eventType: "sale" },
    ];
    for (const metric of cumulativeFunnel) {
      const quantity = finite(input.metrics[metric.name]);
      if (quantity === null) continue;
      await revenueAttributionBrain.record({
        executionPlanId: input.executionPlanId,
        eventType: metric.eventType,
        quantity,
        source: input.source.trim(),
        externalEventId: `${input.source.trim()}:${externalId}:${metric.eventType}`,
        occurredAt: input.collectedAt,
        metadata: { cumulativeSnapshot: true, externalId, verified: true },
      });
    }
    const suppliedRevenue = finite(input.metrics.revenue);
    if (suppliedRevenue !== null) {
      await revenueAttributionBrain.record({
        executionPlanId: input.executionPlanId,
        eventType: "revenue",
        quantity: suppliedRevenue > 0 ? 1 : 0,
        amount: suppliedRevenue,
        source: input.source.trim(),
        externalEventId: `${input.source.trim()}:${externalId}:revenue`,
        occurredAt: input.collectedAt,
        metadata: { cumulativeSnapshot: true, externalId, verified: true },
      });
    }

    const events = await revenueAttributionRepository.forExecutionPlan(
      input.executionPlanId,
    );
    const eventClicks = sumEventQuantity(events, "click");
    const eventLeads = sumEventQuantity(events, "lead");
    const eventSales = sumEventQuantity(events, "sale");
    const moneyEvents = events.filter((event) =>
      ["sale", "revenue", "refund"].includes(event.eventType),
    );
    const eventRevenue = moneyEvents.length
      ? round(
          Math.max(
            0,
            moneyEvents.reduce(
              (total, event) =>
                total +
                (event.eventType === "refund" ? -event.amount : event.amount),
              0,
            ),
          ),
        )
      : null;

    const metrics = Object.fromEntries(
      METRIC_NAMES.map((name) => [name, finite(input.metrics[name])]),
    ) as VerifiedPerformanceMetrics;
    metrics.clicks = finite(input.metrics.clicks) ?? eventClicks;
    metrics.leads = finite(input.metrics.leads) ?? eventLeads;
    metrics.sales = finite(input.metrics.sales) ?? eventSales;
    metrics.revenue = finite(input.metrics.revenue) ?? eventRevenue;

    const content = cycle.originalContent;
    const approved = cycle.approvedContent ?? {};
    const hook = text(approved.hook, content.hook);
    const callToAction = text(approved.callToAction, content.callToAction);
    const format = text(approved.format, content.format);
    const approvedVideoPlan =
      approved.videoPlan && typeof approved.videoPlan === "object"
        ? (approved.videoPlan as Record<string, unknown>)
        : {};
    const videoLengthSeconds =
      number(approvedVideoPlan.estimatedLengthSeconds) ??
      number(content.videoPlan.estimatedLengthSeconds);
    const suggestedPostingTime = text(
      content.growthPlan?.scheduledFor,
      content.suggestedPostingTime,
    );
    const context = {
      title: text(approved.title, cycle.title),
      audience: text(approved.audience, content.audience),
      product: content.attributionContext?.product ?? cycle.product,
      format,
      hook,
      callToAction,
      offer: content.attributionContext?.offer ?? cycle.product,
      destinationLink: text(approved.destinationLink, content.destinationLink),
      topicTags: Array.from(
        new Set([
          ...content.strategyApplication.contextTags.map((tag) =>
            tag.toLowerCase(),
          ),
          ...strings(approved.hashtags, content.hashtags).map((tag) =>
            tag.replace(/^#/, ""),
          ),
        ]),
      ).slice(0, 12),
      hookStyle: hookStyle(hook),
      ctaStyle: ctaStyle(callToAction),
      videoLengthSeconds,
      durationBand: durationBand(videoLengthSeconds),
      suggestedPostingTime,
      postingWindow: postingWindow(suggestedPostingTime),
      recommendedPlatforms: strings(
        approved.recommendedPlatforms,
        content.recommendedPlatforms.map((platform) => platform.toLowerCase()),
      ),
      campaignId: content.campaign?.campaignId ?? null,
      campaignStage: content.campaign?.stage ?? null,
      businessLaunchId: content.businessLaunch?.launchId ?? null,
    };
    const handoff = (
      await autonomousPublishingHandoffRepository.history(2000)
    ).find(
      (item) =>
        item.executionPlanId === input.executionPlanId &&
        item.platform === platform &&
        (!item.externalId || item.externalId === externalId),
    );
    const videoProduction =
      approved.videoProduction && typeof approved.videoProduction === "object"
        ? (approved.videoProduction as Record<string, unknown>)
        : {};
    const versions = Array.isArray(videoProduction.versions)
      ? (videoProduction.versions as Array<Record<string, unknown>>)
      : [];
    const lockedVersion = handoff?.payload.videoVersion ?? 0;
    const version =
      versions.find((item) => item.version === lockedVersion) ??
      versions.find((item) => item.videoId === handoff?.payload.videoId);
    const profile =
      version?.editingProfile && typeof version.editingProfile === "object"
        ? (version.editingProfile as Record<string, unknown>)
        : {};
    const experiment =
      profile.experiment && typeof profile.experiment === "object"
        ? (profile.experiment as Record<string, unknown>)
        : {};
    const creativeWinner =
      profile.creativeWinner && typeof profile.creativeWinner === "object"
        ? (profile.creativeWinner as Record<string, unknown>)
        : {};
    const creativePortfolio =
      profile.creativePortfolio && typeof profile.creativePortfolio === "object"
        ? (profile.creativePortfolio as Record<string, unknown>)
        : {};
    const video =
      handoff?.payload.videoVersion && handoff.payload.videoId
        ? {
            version: handoff.payload.videoVersion,
            videoId: handoff.payload.videoId,
            revisionType: text(
              version?.changeType,
              handoff.payload.videoVersion > 1 ? "revision" : "initial",
            ),
            platform,
            pacing: text(profile.pacing, "unknown"),
            openingStyle: text(profile.openingStyle, "unknown"),
            captionStyle: text(profile.textDensity, "unknown"),
            voiceStyle: text(profile.voiceStyle, "unknown"),
            voiceRate: finite(profile.voiceRate),
            musicMood: text(profile.musicMood, "unknown"),
            musicVolume: finite(profile.musicVolume),
            visualSequence: text(profile.visualSequence, "unknown"),
            experimentId: text(experiment.id) || null,
            experimentArm: (experiment.arm === "control" ||
            experiment.arm === "challenger"
              ? experiment.arm
              : null) as "control" | "challenger" | null,
            experimentVariable: text(experiment.variable) || null,
            experimentValue: text(experiment.value) || null,
            experimentKind: text(experiment.kind) || null,
            experimentSourcePlatform: text(experiment.sourcePlatform) || null,
            experimentDestinationPlatform:
              text(experiment.destinationPlatform) || null,
            creativeWinnerId: text(creativeWinner.id) || null,
            creativeWinnerVariable: text(creativeWinner.variable) || null,
            creativeWinnerValue: text(creativeWinner.value) || null,
            creativeWinnerDirections:
              creativeWinner.directions &&
              typeof creativeWinner.directions === "object"
                ? (creativeWinner.directions as Record<string, string>)
                : {},
            creativePortfolioPlanId: text(creativePortfolio.planId) || null,
            creativePortfolioRole: [
              "scale",
              "rotate",
              "test",
              "learn",
              "hold",
            ].includes(text(creativePortfolio.role))
              ? (text(creativePortfolio.role) as
                  | "scale"
                  | "rotate"
                  | "test"
                  | "learn"
                  | "hold")
              : null,
            creativePortfolioScore: finite(creativePortfolio.winnerScore),
          }
        : null;
    const comparable = (
      await contentPerformanceSnapshotRepository.history(2000)
    )
      .filter((item) => item.executionPlanId !== input.executionPlanId)
      .filter(
        (item) =>
          strategyKey(item) === strategyKey({ platform, content: context }),
      );
    const distinctExecutions = new Set(
      comparable.map((item) => item.executionPlanId),
    );
    const evidenceCount = distinctExecutions.size + 1;
    const revenueWinner =
      (metrics.sales ?? 0) > 0 || (metrics.revenue ?? 0) > 0;
    const conversion = (metrics.clicks ?? 0) > 0 || (metrics.leads ?? 0) > 0;
    const attention = (metrics.views ?? 0) >= 100;
    const classification = revenueWinner
      ? ("revenue_winner" as const)
      : conversion
        ? ("conversion_builder" as const)
        : attention
          ? ("attention_only" as const)
          : ("learning" as const);

    let decision: PerformanceDecision = "keep_learning";
    let lesson =
      "The verified result is saved, but KAI needs more evidence before changing the strategy.";
    let recommendation =
      "Keep the strategy in learning allocation and collect another verified result.";
    if (revenueWinner && evidenceCount >= 3) {
      decision = "repeat";
      lesson = `This exact ${platform} strategy produced verified sales or revenue across enough comparable evidence to treat it as a winner.`;
      recommendation =
        "Repeat the proven hook, offer, format, CTA, and platform while testing only one controlled variable.";
    } else if (
      conversion &&
      (metrics.sales ?? 0) === 0 &&
      metrics.sales !== null
    ) {
      decision = "improve";
      lesson =
        "The content moved people into the funnel, but verified clicks or leads did not become a sale.";
      recommendation =
        "Keep the traffic source and improve the offer or call to action before repeating it.";
    } else if (attention && metrics.clicks === 0 && evidenceCount >= 3) {
      decision = "stop";
      lesson =
        "Repeated verified attention produced no tracked click across enough comparable posts.";
      recommendation =
        "Pause this exact combination and replace the hook or CTA instead of posting it unchanged.";
    } else if (attention) {
      decision = "improve";
      lesson =
        metrics.clicks === null
          ? "The video earned verified attention, but click tracking is unavailable, so KAI cannot claim it converted or failed to convert."
          : "The video earned attention but has not yet produced a verified downstream result.";
      recommendation =
        metrics.clicks === null
          ? "Keep collecting platform performance and connect verified click data before making a conversion decision."
          : "Improve one opening or CTA variable and compare the next verified result.";
    }

    const availableMetrics = METRIC_NAMES.filter(
      (name) => metrics[name] !== null,
    );
    const missingMetrics = METRIC_NAMES.filter(
      (name) => metrics[name] === null,
    );
    const confidence = Math.min(
      95,
      Math.round(
        30 +
          Math.min(30, evidenceCount * 10) +
          Math.min(35, availableMetrics.length * 3),
      ),
    );
    const now = new Date().toISOString();
    return contentPerformanceSnapshotRepository.save({
      id: randomUUID(),
      executionPlanId: input.executionPlanId,
      platform,
      externalId,
      source: input.source.trim(),
      verified: true,
      content: context,
      video,
      metrics,
      availableMetrics,
      missingMetrics,
      classification,
      decision,
      confidence,
      evidenceCount,
      lesson,
      recommendation,
      comparedWith: comparable[0]?.executionPlanId ?? null,
      collectedAt: input.collectedAt ?? now,
      createdAt: now,
    });
  }

  async summary() {
    const snapshots = await contentPerformanceSnapshotRepository.history();
    const latestByExecution = new Map<string, ContentPerformanceSnapshot>();
    for (const snapshot of snapshots) {
      const key = `${snapshot.executionPlanId}:${snapshot.platform}:${snapshot.externalId}`;
      if (!latestByExecution.has(key)) latestByExecution.set(key, snapshot);
    }
    const latest = [...latestByExecution.values()];
    return {
      totalSnapshots: snapshots.length,
      measuredContent: latest.length,
      decisions: {
        repeat: latest.filter((item) => item.decision === "repeat").length,
        improve: latest.filter((item) => item.decision === "improve").length,
        stop: latest.filter((item) => item.decision === "stop").length,
        keepLearning: latest.filter((item) => item.decision === "keep_learning")
          .length,
      },
      latest: latest[0] ?? null,
      winners: latest.filter((item) => item.decision === "repeat"),
      needsImprovement: latest.filter(
        (item) => item.decision === "improve" || item.decision === "stop",
      ),
      snapshots,
      crossPlatform: await crossPlatformLearningBrain.playbook(),
      videoPerformance: await videoPerformanceIntelligence.playbook(),
    };
  }
}

export const contentPerformanceLearningEngine =
  new ContentPerformanceLearningEngine();
