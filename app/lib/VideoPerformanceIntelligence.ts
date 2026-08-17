import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";

export type VideoEditingDimension =
  | "pacing"
  | "opening_style"
  | "caption_style"
  | "voice_style"
  | "voice_rate"
  | "music_mood"
  | "music_volume"
  | "visual_sequence"
  | "revision_type";
export type VideoPatternDecision = "keep" | "revise" | "stop" | "learning";
export type VideoEditingPattern = {
  key: string;
  platform: string;
  dimension: VideoEditingDimension;
  value: string;
  evidenceCount: number;
  averageScore: number;
  averageRetention: number | null;
  verifiedClicks: number;
  verifiedSales: number;
  verifiedRevenue: number;
  decision: VideoPatternDecision;
  confidence: number;
  explanation: string;
};

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}
function score(
  snapshot: Awaited<
    ReturnType<typeof contentPerformanceSnapshotRepository.history>
  >[number],
) {
  const retention = finite(snapshot.metrics.averageViewPercentage);
  const engagement = finite(snapshot.metrics.engagementRate);
  const clicks = finite(snapshot.metrics.clicks);
  const sales = finite(snapshot.metrics.sales);
  const revenue = finite(snapshot.metrics.revenue);
  return Math.min(
    100,
    Math.round(
      10 +
        Math.min(35, retention * 0.35) +
        Math.min(20, engagement * 2) +
        Math.min(15, clicks * 2) +
        Math.min(15, sales * 8) +
        Math.min(15, revenue * 0.25),
    ),
  );
}

function dimensions(
  video: NonNullable<
    Awaited<
      ReturnType<typeof contentPerformanceSnapshotRepository.history>
    >[number]["video"]
  >,
) {
  return [
    ["pacing", video.pacing],
    ["opening_style", video.openingStyle],
    ["caption_style", video.captionStyle],
    ["voice_style", video.voiceStyle],
    [
      "voice_rate",
      video.voiceRate === null ? "unknown" : String(video.voiceRate),
    ],
    ["music_mood", video.musicMood],
    [
      "music_volume",
      video.musicVolume === null ? "unknown" : String(video.musicVolume),
    ],
    ["visual_sequence", video.visualSequence],
    ["revision_type", video.revisionType],
  ].filter(
    (item): item is [VideoEditingDimension, string] =>
      Boolean(item[1]) && item[1] !== "unknown",
  );
}

export class VideoPerformanceIntelligence {
  async playbook() {
    const latest = new Map<
      string,
      Awaited<
        ReturnType<typeof contentPerformanceSnapshotRepository.history>
      >[number]
    >();
    for (const snapshot of await contentPerformanceSnapshotRepository.history(
      5000,
    )) {
      if (!snapshot.video) continue;
      const key = `${snapshot.executionPlanId}:${snapshot.platform}:${snapshot.externalId}:${snapshot.video.version}`;
      if (!latest.has(key)) latest.set(key, snapshot);
    }
    const snapshots = [...latest.values()];
    const groups = new Map<
      string,
      {
        platform: string;
        dimension: VideoEditingDimension;
        value: string;
        snapshots: typeof snapshots;
      }
    >();
    for (const snapshot of snapshots) {
      if (!snapshot.video) continue;
      for (const [dimension, value] of dimensions(snapshot.video)) {
        for (const platform of [snapshot.platform, "all"]) {
          const key = `${platform}:${dimension}:${value}`;
          const group = groups.get(key) ?? {
            platform,
            dimension,
            value,
            snapshots: [],
          };
          group.snapshots.push(snapshot);
          groups.set(key, group);
        }
      }
    }
    const patterns: VideoEditingPattern[] = [...groups.entries()].map(
      ([key, group]) => {
        const evidenceCount = new Set(
          group.snapshots.map(
            (item) =>
              `${item.executionPlanId}:${item.platform}:${item.externalId}`,
          ),
        ).size;
        const averageScore = average(group.snapshots.map(score)) ?? 0;
        const retentionValues = group.snapshots
          .map((item) => item.metrics.averageViewPercentage)
          .filter((value): value is number => value !== null);
        const verifiedClicks = group.snapshots.reduce(
          (sum, item) => sum + finite(item.metrics.clicks),
          0,
        );
        const verifiedSales = group.snapshots.reduce(
          (sum, item) => sum + finite(item.metrics.sales),
          0,
        );
        const verifiedRevenue =
          Math.round(
            group.snapshots.reduce(
              (sum, item) => sum + finite(item.metrics.revenue),
              0,
            ) * 100,
          ) / 100;
        const decision: VideoPatternDecision =
          evidenceCount >= 3 &&
          (averageScore >= 70 || verifiedSales > 0 || verifiedRevenue > 0)
            ? "keep"
            : evidenceCount >= 3 && averageScore < 32 && verifiedClicks === 0
              ? "stop"
              : evidenceCount >= 2 && averageScore >= 40
                ? "revise"
                : "learning";
        const confidence = Math.min(
          95,
          25 + evidenceCount * 15 + Math.min(20, group.snapshots.length * 2),
        );
        const scope =
          group.platform === "all"
            ? "across platforms"
            : `on ${group.platform}`;
        const explanation =
          decision === "keep"
            ? `${group.value} earned repeatable verified video strength ${scope} across ${evidenceCount} publications.`
            : decision === "stop"
              ? `${group.value} stayed weak ${scope} across ${evidenceCount} publications without a verified click.`
              : decision === "revise"
                ? `${group.value} has mixed useful evidence ${scope}; change one adjacent editing variable.`
                : `${group.value} remains in learning ${scope}; one result cannot become an editing rule.`;
        return {
          key,
          platform: group.platform,
          dimension: group.dimension,
          value: group.value,
          evidenceCount,
          averageScore,
          averageRetention: average(retentionValues),
          verifiedClicks,
          verifiedSales,
          verifiedRevenue,
          decision,
          confidence,
          explanation,
        };
      },
    );
    const proven = patterns
      .filter((item) => item.decision === "keep")
      .sort((a, b) => b.averageScore - a.averageScore);
    const retired = patterns
      .filter((item) => item.decision === "stop")
      .sort((a, b) => a.averageScore - b.averageScore);
    const revisionResults = snapshots.filter(
      (item) => (item.video?.version ?? 1) > 1,
    );
    const originalResults = snapshots.filter(
      (item) => (item.video?.version ?? 1) === 1,
    );
    return {
      measuredVersions: snapshots.length,
      revisedVersions: revisionResults.length,
      originalVersions: originalResults.length,
      provenPatterns: proven,
      retiredPatterns: retired,
      learningPatterns: patterns.filter(
        (item) => item.decision === "learning" || item.decision === "revise",
      ),
      revisionImpact: {
        revisedAverageScore: average(revisionResults.map(score)),
        originalAverageScore: average(originalResults.map(score)),
        conclusion:
          revisionResults.length < 3
            ? "KAI needs at least three published revised versions before judging whether owner revisions improve results."
            : (average(revisionResults.map(score)) ?? 0) >
                (average(originalResults.map(score)) ?? 0)
              ? "Verified revised versions are outperforming original cuts."
              : "Verified revisions have not yet outperformed original cuts.",
      },
      nextRecommendation:
        proven[0]?.explanation ??
        "Keep collecting exact-version results before KAI changes video direction automatically.",
      evidenceRule:
        "At least three distinct verified publications are required before an editing decision becomes automatic.",
    };
  }
}

export const videoPerformanceIntelligence = new VideoPerformanceIntelligence();
