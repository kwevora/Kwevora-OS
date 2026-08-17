import type {
  ContentGenerationInput,
  ContentPackage,
} from "./ContentIntelligenceEngine";
import {
  crossPlatformLearningBrain,
  type CrossPlatformPattern,
  type LearningDimension,
} from "./CrossPlatformLearningBrain";
import { memoryBrain } from "./MemoryBrain";

export type AdaptiveDecision = {
  dimension: LearningDimension | "owner_preference";
  value: string;
  action: "applied" | "tested" | "avoided" | "protected";
  evidenceCount: number;
  confidence: number;
  explanation: string;
};

export type AdaptiveCreationPlan = {
  mode: "proven_winner" | "controlled_challenger" | "learning";
  primaryPlatform: string;
  decisions: AdaptiveDecision[];
  changedVariable: LearningDimension | null;
  winnerProtected: boolean;
  ownerPreferencesUsed: string[];
  platformVariants: Array<{
    platform: string;
    hook: string;
    caption: string;
    callToAction: string;
    estimatedLengthSeconds: number;
  }>;
  whyKaiCreatedThis: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function applies(pattern: CrossPlatformPattern, platform: string): boolean {
  return (
    pattern.platform === "all" ||
    normalize(pattern.platform) === normalize(platform)
  );
}

function best(
  patterns: CrossPlatformPattern[],
  dimension: LearningDimension,
  platform: string,
) {
  return patterns
    .filter((item) => item.dimension === dimension && applies(item, platform))
    .sort(
      (left, right) =>
        right.averageScore - left.averageScore ||
        right.evidenceCount - left.evidenceCount,
    )[0];
}

function hookFrom(style: string, hook: string, audience: string): string {
  const clean = hook
    .replace(/^(here'?s|if|why|stop|you)\b[\s,:-]*/i, "")
    .trim();
  const value = normalize(style);
  if (value.includes("problem") || value.includes("pain"))
    return `${audience}, this is the problem keeping you stuck: ${clean}`;
  if (value.includes("result") || value.includes("outcome"))
    return `Here is the result ${audience} can start working toward today: ${clean}`;
  if (value.includes("contrarian"))
    return `Most advice about this is backwards. ${clean}`;
  if (value.includes("question"))
    return `What would change if ${audience} finally solved this? ${clean}`;
  return hook;
}

function ctaFrom(style: string, content: ContentPackage): string {
  const value = normalize(style);
  if (value.includes("comment"))
    return `Comment “START” and take the next step with ${content.attributionContext?.offer ?? "KWEVORA"}.`;
  if (value.includes("direct") || value.includes("link"))
    return content.destinationLink
      ? `Start here: ${content.destinationLink}`
      : `Take the next step with ${content.attributionContext?.offer ?? "KWEVORA"} today.`;
  if (value.includes("save"))
    return "Save this, then take one step before today ends.";
  return content.callToAction;
}

async function ownerPreferences(tags: string[]): Promise<string[]> {
  return (
    await memoryBrain.recall(["content", "owner-edit", "rejected", ...tags])
  ).memories
    .filter(
      (item) =>
        item.tags.includes("owner-edit") || item.tags.includes("rejected"),
    )
    .slice(0, 5)
    .map((item) => item.description);
}

export class AdaptiveContentCreationBrain {
  async adapt(
    input: ContentGenerationInput,
    original: ContentPackage,
  ): Promise<ContentPackage> {
    const playbook = await crossPlatformLearningBrain.playbook();
    const primaryPlatform =
      original.recommendedPlatforms[0] ??
      input.connectedPlatforms?.[0] ??
      "the strongest connected platform";
    const proven = playbook.provenPatterns.filter((item) =>
      applies(item, primaryPlatform),
    );
    const retired = playbook.retiredPatterns.filter((item) =>
      applies(item, primaryPlatform),
    );
    const preferences = await ownerPreferences(
      original.strategyApplication.contextTags,
    );
    const isChallenger = original.growthPlan?.bucket === "challenger";
    const decisions: AdaptiveDecision[] = [];
    let content = { ...original, videoPlan: { ...original.videoPlan } };

    const hook = best(proven, "hook_style", primaryPlatform);
    const cta = best(proven, "cta_style", primaryPlatform);
    const duration = best(proven, "duration", primaryPlatform);
    const topic = best(proven, "topic", primaryPlatform);
    const changeable: CrossPlatformPattern[] = [
      hook,
      cta,
      duration,
      topic,
    ].filter((item): item is CrossPlatformPattern => Boolean(item));
    const challengerPattern = isChallenger
      ? changeable[
          original.growthPlan?.position
            ? original.growthPlan.position % Math.max(1, changeable.length)
            : 0
        ]
      : undefined;

    for (const pattern of changeable) {
      const canApply = !isChallenger || pattern.key === challengerPattern?.key;
      decisions.push({
        dimension: pattern.dimension,
        value: pattern.value,
        action: canApply ? (isChallenger ? "tested" : "applied") : "protected",
        evidenceCount: pattern.evidenceCount,
        confidence: pattern.confidence,
        explanation: canApply
          ? `${pattern.explanation} ${isChallenger ? "KAI changed only this variable for a clean comparison." : "KAI used it as a proven default."}`
          : "KAI protected this winning variable while testing one different variable.",
      });
      if (!canApply) continue;
      if (pattern.dimension === "hook_style") {
        content.hook = hookFrom(pattern.value, content.hook, content.audience);
        content.videoPlan.openingText = content.hook;
      }
      if (pattern.dimension === "cta_style") {
        content.callToAction = ctaFrom(pattern.value, content);
        content.pinnedComment = content.destinationLink
          ? `${content.callToAction} ${content.destinationLink}`
          : content.callToAction;
      }
      if (pattern.dimension === "duration") {
        const seconds = Number(pattern.value.match(/\d+/)?.[0]);
        if (Number.isFinite(seconds) && seconds >= 10 && seconds <= 180)
          content.videoPlan.estimatedLengthSeconds = seconds;
      }
      if (
        pattern.dimension === "topic" &&
        !normalize(content.idea).includes(normalize(pattern.value))
      ) {
        content.idea = `${content.idea} — ${pattern.value}`;
      }
    }

    for (const pattern of retired.slice(0, 8)) {
      decisions.push({
        dimension: pattern.dimension,
        value: pattern.value,
        action: "avoided",
        evidenceCount: pattern.evidenceCount,
        confidence: pattern.confidence,
        explanation: pattern.explanation,
      });
    }
    if (input.preferredFormat) {
      decisions.push({
        dimension: "owner_preference",
        value: input.preferredFormat,
        action: "protected",
        evidenceCount: 1,
        confidence: 100,
        explanation:
          "The owner selected this format, so performance automation did not replace it.",
      });
    }
    for (const preference of preferences) {
      decisions.push({
        dimension: "owner_preference",
        value: preference,
        action: "protected",
        evidenceCount: 1,
        confidence: 100,
        explanation:
          "KAI recalled this approved edit or rejection before preparing the package.",
      });
    }

    const mode: AdaptiveCreationPlan["mode"] =
      isChallenger && challengerPattern
        ? "controlled_challenger"
        : proven.length > 0
          ? "proven_winner"
          : "learning";
    const applied = decisions.filter(
      (item) => item.action === "applied" || item.action === "tested",
    );
    const why =
      mode === "learning"
        ? "KAI created this as a controlled learning package because verified results have not established a creative winner yet."
        : mode === "controlled_challenger"
          ? `KAI protected the current winner and changed only ${challengerPattern?.dimension.replaceAll("_", " ")} to test ${challengerPattern?.value}.`
          : `KAI used ${applied.length} verified creative decision${applied.length === 1 ? "" : "s"} for ${primaryPlatform}, each supported by at least three consistent results.`;

    return {
      ...content,
      reason: `${content.reason} ${why}`,
      adaptiveCreation: {
        mode,
        primaryPlatform,
        decisions,
        changedVariable:
          mode === "controlled_challenger"
            ? (challengerPattern?.dimension ?? null)
            : null,
        winnerProtected: mode !== "learning",
        ownerPreferencesUsed: preferences,
        platformVariants: content.recommendedPlatforms.map((platform) => {
          const platformHook = best(proven, "hook_style", platform);
          const platformCta = best(proven, "cta_style", platform);
          const platformDuration = best(proven, "duration", platform);
          const seconds = Number(platformDuration?.value.match(/\d+/)?.[0]);
          return {
            platform,
            hook: platformHook
              ? hookFrom(platformHook.value, content.hook, content.audience)
              : content.hook,
            caption: `${content.caption}\n\n${platform === "YouTube" ? content.title : content.callToAction}`,
            callToAction: platformCta
              ? ctaFrom(platformCta.value, content)
              : content.callToAction,
            estimatedLengthSeconds: Number.isFinite(seconds)
              ? Math.max(10, Math.min(180, seconds))
              : content.videoPlan.estimatedLengthSeconds,
          };
        }),
        whyKaiCreatedThis: why,
      },
    };
  }
}

export const adaptiveContentCreationBrain = new AdaptiveContentCreationBrain();
