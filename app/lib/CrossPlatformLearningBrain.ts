import type {
  ContentPerformanceSnapshot,
  VerifiedPerformanceMetrics,
} from "./ContentPerformanceLearningEngine";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";

export type LearningDimension =
  | "platform"
  | "hook_style"
  | "topic"
  | "format"
  | "cta_style"
  | "duration"
  | "posting_window";
export type PatternDecision = "repeat" | "improve" | "stop" | "learning";

export type CrossPlatformPattern = {
  key: string;
  platform: string;
  dimension: LearningDimension;
  value: string;
  evidenceCount: number;
  averageScore: number;
  averageEngagementRate: number | null;
  verifiedViews: number;
  verifiedClicks: number;
  verifiedSales: number;
  verifiedRevenue: number;
  decision: PatternDecision;
  confidence: number;
  explanation: string;
};

export type PlatformLearning = {
  platform: string;
  evidenceCount: number;
  averageScore: number;
  averageEngagementRate: number | null;
  verifiedViews: number;
  verifiedSales: number;
  verifiedRevenue: number;
  confidence: number;
};

function finite(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
function average(values: number[]): number | null {
  return values.length
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function engagement(metrics: VerifiedPerformanceMetrics): number | null {
  if (metrics.engagementRate !== null) return finite(metrics.engagementRate);
  const views = finite(metrics.views);
  if (!views) return null;
  return round(
    ((finite(metrics.likes) +
      finite(metrics.comments) +
      finite(metrics.shares)) /
      views) *
      100,
  );
}

function score(snapshot: ContentPerformanceSnapshot): number {
  const metrics = snapshot.metrics;
  const views = finite(metrics.views);
  const engagementRate = engagement(metrics) ?? 0;
  const attention = views > 0 ? Math.min(25, Math.log10(views + 1) * 6) : 0;
  const interaction = Math.min(25, engagementRate * 2.5);
  const funnel = Math.min(
    25,
    finite(metrics.clicks) * 2 + finite(metrics.leads) * 5,
  );
  const money = Math.min(
    35,
    finite(metrics.sales) * 12 + finite(metrics.revenue) * 0.5,
  );
  return Math.min(
    100,
    Math.round(10 + attention + interaction + funnel + money),
  );
}

async function latestPublications(): Promise<ContentPerformanceSnapshot[]> {
  const latest = new Map<string, ContentPerformanceSnapshot>();
  for (const snapshot of await contentPerformanceSnapshotRepository.history(
    5000,
  )) {
    const key = `${snapshot.executionPlanId}:${snapshot.platform}:${snapshot.externalId}`;
    if (!latest.has(key)) latest.set(key, snapshot);
  }
  return [...latest.values()];
}

function values(
  snapshot: ContentPerformanceSnapshot,
): Array<{ dimension: LearningDimension; value: string }> {
  const content = snapshot.content;
  const topicTags = Array.isArray(content.topicTags) ? content.topicTags : [];
  const dimensions: Array<{ dimension: LearningDimension; value: string }> = [
    { dimension: "platform", value: snapshot.platform },
    { dimension: "hook_style", value: content.hookStyle || "unknown" },
    ...topicTags.map((value) => ({ dimension: "topic" as const, value })),
    { dimension: "format", value: content.format || "unknown" },
    { dimension: "cta_style", value: content.ctaStyle || "unknown" },
    { dimension: "duration", value: content.durationBand || "unknown" },
    { dimension: "posting_window", value: content.postingWindow || "unknown" },
  ];
  return dimensions.filter((item) => item.value && item.value !== "unknown");
}

function summarizePattern(
  platform: string,
  dimension: LearningDimension,
  value: string,
  evidence: ContentPerformanceSnapshot[],
): CrossPlatformPattern {
  const scores = evidence.map(score);
  const averageScore = Math.round(average(scores) ?? 0);
  const engagements = evidence
    .map((item) => engagement(item.metrics))
    .filter((value): value is number => value !== null);
  const verifiedViews = evidence.reduce(
    (sum, item) => sum + finite(item.metrics.views),
    0,
  );
  const verifiedClicks = evidence.reduce(
    (sum, item) => sum + finite(item.metrics.clicks),
    0,
  );
  const verifiedSales = evidence.reduce(
    (sum, item) => sum + finite(item.metrics.sales),
    0,
  );
  const verifiedRevenue = round(
    evidence.reduce((sum, item) => sum + finite(item.metrics.revenue), 0),
  );
  const evidenceCount = new Set(evidence.map((item) => item.executionPlanId))
    .size;
  const decision: PatternDecision =
    evidenceCount >= 3 &&
    (verifiedSales > 0 || verifiedRevenue > 0 || averageScore >= 70)
      ? "repeat"
      : evidenceCount >= 3 && averageScore < 35 && verifiedClicks === 0
        ? "stop"
        : evidenceCount >= 2 && averageScore >= 40
          ? "improve"
          : "learning";
  const confidence = Math.min(
    95,
    Math.round(25 + evidenceCount * 12 + Math.min(25, evidence.length * 3)),
  );
  const scope = platform === "all" ? "across platforms" : `on ${platform}`;
  const explanation =
    decision === "repeat"
      ? `${value} produced repeatable verified strength ${scope} across ${evidenceCount} content cycles.`
      : decision === "stop"
        ? `${value} stayed weak ${scope} across ${evidenceCount} content cycles without a verified click.`
        : decision === "improve"
          ? `${value} shows useful but incomplete evidence ${scope}; KAI should change only one related variable next.`
          : `${value} is still learning ${scope}; KAI will not make it a default from ${evidenceCount} result${evidenceCount === 1 ? "" : "s"}.`;
  return {
    key: `${platform}:${dimension}:${value}`,
    platform,
    dimension,
    value,
    evidenceCount,
    averageScore,
    averageEngagementRate: average(engagements),
    verifiedViews,
    verifiedClicks,
    verifiedSales,
    verifiedRevenue,
    decision,
    confidence,
    explanation,
  };
}

export class CrossPlatformLearningBrain {
  async playbook() {
    const snapshots = await latestPublications();
    const groups = new Map<
      string,
      {
        platform: string;
        dimension: LearningDimension;
        value: string;
        evidence: ContentPerformanceSnapshot[];
      }
    >();
    for (const snapshot of snapshots) {
      for (const item of values(snapshot)) {
        for (const platform of [
          snapshot.platform,
          ...(item.dimension === "platform" ? [] : ["all"]),
        ]) {
          const key = `${platform}:${item.dimension}:${item.value}`;
          const group = groups.get(key) ?? {
            platform,
            dimension: item.dimension,
            value: item.value,
            evidence: [],
          };
          group.evidence.push(snapshot);
          groups.set(key, group);
        }
      }
    }
    const patterns = [...groups.values()].map((group) =>
      summarizePattern(
        group.platform,
        group.dimension,
        group.value,
        group.evidence,
      ),
    );
    const platformRanking: PlatformLearning[] = patterns
      .filter(
        (item) => item.dimension === "platform" && item.platform === item.value,
      )
      .map((item) => ({
        platform: item.platform,
        evidenceCount: item.evidenceCount,
        averageScore: item.averageScore,
        averageEngagementRate: item.averageEngagementRate,
        verifiedViews: item.verifiedViews,
        verifiedSales: item.verifiedSales,
        verifiedRevenue: item.verifiedRevenue,
        confidence: item.confidence,
      }))
      .sort(
        (left, right) =>
          right.averageScore - left.averageScore ||
          right.evidenceCount - left.evidenceCount,
      );
    const provenPatterns = patterns
      .filter(
        (item) => item.dimension !== "platform" && item.decision === "repeat",
      )
      .sort((left, right) => right.averageScore - left.averageScore);
    const retiredPatterns = patterns
      .filter(
        (item) => item.dimension !== "platform" && item.decision === "stop",
      )
      .sort((left, right) => left.averageScore - right.averageScore);
    const nextActions =
      snapshots.length === 0
        ? [
            "Publish approved content and collect verified results before KAI changes strategy.",
          ]
        : [
            ...(provenPatterns[0]
              ? [
                  `Keep ${provenPatterns[0].value} for ${provenPatterns[0].dimension.replaceAll("_", " ")} and test one other variable.`,
                ]
              : []),
            ...(retiredPatterns[0]
              ? [
                  `Stop repeating ${retiredPatterns[0].value} for ${retiredPatterns[0].dimension.replaceAll("_", " ")} without a new reason.`,
                ]
              : []),
            ...(!provenPatterns.length
              ? [
                  "Continue controlled tests until at least three consistent verified results establish a winner.",
                ]
              : []),
          ];
    return {
      generatedAt: new Date().toISOString(),
      verifiedPublications: snapshots.length,
      measuredContentCycles: new Set(
        snapshots.map((item) => item.executionPlanId),
      ).size,
      platformRanking,
      provenPatterns,
      retiredPatterns,
      learningPatterns: patterns.filter(
        (item) => item.decision === "learning" || item.decision === "improve",
      ),
      nextActions,
      evidenceRule:
        "KAI requires at least three consistent verified content cycles before repeating or stopping a pattern automatically.",
    };
  }

  async promptContext() {
    const playbook = await this.playbook();
    return {
      verifiedPublications: playbook.verifiedPublications,
      platformRanking: playbook.platformRanking,
      repeat: playbook.provenPatterns
        .slice(0, 8)
        .map((item) => ({
          platform: item.platform,
          dimension: item.dimension,
          value: item.value,
          confidence: item.confidence,
          evidenceCount: item.evidenceCount,
        })),
      avoid: playbook.retiredPatterns
        .slice(0, 8)
        .map((item) => ({
          platform: item.platform,
          dimension: item.dimension,
          value: item.value,
          confidence: item.confidence,
          evidenceCount: item.evidenceCount,
        })),
      nextActions: playbook.nextActions,
      evidenceRule: playbook.evidenceRule,
    };
  }
}

export const crossPlatformLearningBrain = new CrossPlatformLearningBrain();
