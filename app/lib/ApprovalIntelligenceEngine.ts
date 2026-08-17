import type {
  ContentFormat,
  ContentPackage,
} from "./ContentIntelligenceEngine";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";

export type ApprovalProfile = {
  evidenceCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number;
  repeatedEditFields: string[];
  preferredTitleLength?: number;
  preferredHookLength?: number;
  preferredHashtagCount?: number;
  preferredFormat?: ContentFormat;
  preferredPlatform?: string;
  destinationCtaPreferred: boolean;
  rejectionThemes: string[];
  predictionAccuracy: number | null;
};

const MIN_REPEATED_EVIDENCE = 3;

function contextMatches(current: string[], historical: string[]): boolean {
  return current.filter((tag) => historical.includes(tag)).length >= 2;
}

function average(values: number[]): number | undefined {
  if (values.length < MIN_REPEATED_EVIDENCE) return undefined;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function mostCommon(values: string[]): string | undefined {
  if (values.length < MIN_REPEATED_EVIDENCE) return undefined;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const winner = [...counts.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  return winner && winner[1] >= MIN_REPEATED_EVIDENCE ? winner[0] : undefined;
}

function shorten(value: string, target: number): string {
  if (value.length <= target + 10) return value;
  const slice = value.slice(0, target + 1);
  const boundary = slice.lastIndexOf(" ");
  return `${slice.slice(0, boundary > target * 0.6 ? boundary : target).trim()}…`;
}

function rejectionThemes(reasons: string[]): string[] {
  const tokens = reasons.flatMap((reason) =>
    reason
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 5),
  );
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([token]) => token);
}

export class ApprovalIntelligenceEngine {
  async analyze(contextTags: string[]): Promise<ApprovalProfile> {
    const cycles = (await autonomousCycleRepository.history(500)).filter(
      (cycle) =>
        contextMatches(
          contextTags,
          cycle.originalContent.strategyApplication.contextTags,
        ) &&
        (cycle.status === "approved" ||
          cycle.status === "publishing_blocked" ||
          cycle.status === "monitoring" ||
          cycle.status === "learned" ||
          cycle.status === "stopped"),
    );
    const approved = cycles.filter((cycle) => cycle.status !== "stopped");
    const stopped = cycles.filter((cycle) => cycle.status === "stopped");
    const fieldCounts = new Map<string, number>();
    for (const cycle of approved) {
      for (const field of cycle.ownerEdits)
        fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
    }
    const afterValues = (field: string): unknown[] =>
      approved.flatMap((cycle) =>
        (cycle.editDetails ?? [])
          .filter((detail) => detail.field === field)
          .map((detail) => detail.after),
      );
    const titleLengths = afterValues("title")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.length);
    const hookLengths = afterValues("hook")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.length);
    const hashtagCounts = afterValues("hashtags")
      .filter((value): value is unknown[] => Array.isArray(value))
      .map((value) => value.length);
    const formats = afterValues("format").filter(
      (value): value is ContentFormat =>
        value === "faceless_video" ||
        value === "record_yourself" ||
        value === "upload_video",
    );
    const platforms = afterValues("recommendedPlatforms").flatMap((value) =>
      Array.isArray(value) && typeof value[0] === "string" ? [value[0]] : [],
    );
    const destinationCtaCount = approved.filter((cycle) => {
      const cta = cycle.approvedContent?.callToAction;
      const destination = cycle.approvedContent?.destinationLink;
      return (
        typeof cta === "string" &&
        typeof destination === "string" &&
        Boolean(destination) &&
        cta.includes(destination)
      );
    }).length;
    const predictionErrors = cycles
      .map((cycle) => cycle.approvalPredictionError)
      .filter((value): value is number => typeof value === "number");

    return {
      evidenceCount: cycles.length,
      approvedCount: approved.length,
      rejectedCount: stopped.length,
      approvalRate: cycles.length
        ? Math.round((approved.length / cycles.length) * 100)
        : 50,
      repeatedEditFields: [...fieldCounts.entries()]
        .filter(([, count]) => count >= MIN_REPEATED_EVIDENCE)
        .map(([field]) => field),
      preferredTitleLength: average(titleLengths),
      preferredHookLength: average(hookLengths),
      preferredHashtagCount: average(hashtagCounts),
      preferredFormat: mostCommon(formats) as ContentFormat | undefined,
      preferredPlatform: mostCommon(platforms),
      destinationCtaPreferred: destinationCtaCount >= MIN_REPEATED_EVIDENCE,
      rejectionThemes: rejectionThemes(
        stopped.map(
          (cycle) => cycle.stopReason ?? cycle.events.at(-1)?.message ?? "",
        ),
      ),
      predictionAccuracy: predictionErrors.length
        ? Math.max(
            0,
            Math.round(
              100 -
                predictionErrors.reduce((sum, value) => sum + value, 0) /
                  predictionErrors.length,
            ),
          )
        : null,
    };
  }

  async prepare(content: ContentPackage): Promise<ContentPackage> {
    const profile = await this.analyze(content.strategyApplication.contextTags);
    const corrections: string[] = [];
    let prepared = { ...content };

    if (profile.preferredTitleLength) {
      const title = shorten(prepared.title, profile.preferredTitleLength);
      if (title !== prepared.title)
        corrections.push("Shortened the title to match repeated approvals.");
      prepared = { ...prepared, title };
    }
    if (profile.preferredHookLength) {
      const hook = shorten(prepared.hook, profile.preferredHookLength);
      if (hook !== prepared.hook)
        corrections.push(
          "Tightened the hook to the repeatedly approved length.",
        );
      prepared = { ...prepared, hook };
    }
    if (
      profile.preferredHashtagCount &&
      prepared.hashtags.length !== profile.preferredHashtagCount
    ) {
      prepared = {
        ...prepared,
        hashtags: prepared.hashtags.slice(0, profile.preferredHashtagCount),
      };
      corrections.push(
        "Adjusted the hashtag count to the repeated approval pattern.",
      );
    }
    if (
      profile.preferredFormat &&
      prepared.format !== profile.preferredFormat
    ) {
      prepared = { ...prepared, format: profile.preferredFormat };
      corrections.push(
        `Used the repeatedly approved ${profile.preferredFormat.replaceAll("_", " ")} format.`,
      );
    }
    if (
      profile.preferredPlatform &&
      prepared.recommendedPlatforms.includes(profile.preferredPlatform)
    ) {
      prepared = {
        ...prepared,
        recommendedPlatforms: [
          profile.preferredPlatform,
          ...prepared.recommendedPlatforms.filter(
            (item) => item !== profile.preferredPlatform,
          ),
        ],
      };
      corrections.push(
        `Prioritized ${profile.preferredPlatform} from repeated approvals.`,
      );
    }
    if (
      profile.destinationCtaPreferred &&
      prepared.destinationLink &&
      !prepared.callToAction.includes(prepared.destinationLink)
    ) {
      prepared = {
        ...prepared,
        callToAction:
          `${prepared.callToAction} ${prepared.destinationLink}`.trim(),
      };
      corrections.push(
        "Added the destination directly to the CTA based on repeated approvals.",
      );
    }

    const familiarIssues = profile.repeatedEditFields.filter(
      (field) =>
        !corrections.some((correction) =>
          correction.toLowerCase().includes(field.toLowerCase()),
        ),
    );
    const predictedApproval = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          profile.approvalRate +
            corrections.length * 4 -
            familiarIssues.length * 7,
        ),
      ),
    );
    const businessImpactScore = Math.max(0, Math.min(100, prepared.confidence));
    const reviewPriority = Math.round(
      businessImpactScore * 0.6 + (100 - predictedApproval) * 0.4,
    );

    return {
      ...prepared,
      approvalIntelligence: {
        predictedApproval,
        businessImpactScore,
        reviewPriority,
        evidenceCount: profile.evidenceCount,
        predictionAccuracy: profile.predictionAccuracy,
        correctionsApplied: corrections,
        familiarIssues,
        explanation:
          profile.evidenceCount < MIN_REPEATED_EVIDENCE
            ? `KAI has ${profile.evidenceCount} matching approval decision${profile.evidenceCount === 1 ? "" : "s"}; at least three are required before automatic preference corrections.`
            : corrections.length
              ? `KAI corrected ${corrections.length} familiar issue${corrections.length === 1 ? "" : "s"} before review using ${profile.evidenceCount} matching decisions.`
              : `KAI found no familiar correction needed from ${profile.evidenceCount} matching decisions.`,
      },
    };
  }
}

export const approvalIntelligenceEngine = new ApprovalIntelligenceEngine();
