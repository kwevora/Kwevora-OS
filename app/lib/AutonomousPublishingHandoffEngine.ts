import { randomUUID } from "node:crypto";
import { autonomousPublishingHandoffRepository } from "./database/AutonomousPublishingHandoffRepository";
import { growthPlanAuthorizationEngine } from "./GrowthPlanAuthorizationEngine";

export type PublishingHandoffStatus =
  | "scheduled"
  | "ready"
  | "publishing"
  | "platform_processing"
  | "published"
  | "blocked"
  | "waiting_connection"
  | "waiting_executor"
  | "retry_waiting"
  | "stopped";

export type PublishingHandoffPayload = {
  title: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  destinationLink: string;
  mediaFilePath: string;
  mediaMimeType: string;
  platformCaption: string;
  characterLimit: number;
  hashtagLimit: number;
  videoVersion: number | null;
  videoId: string;
};

export type AutonomousPublishingHandoff = {
  id: string;
  publishingItemId: string;
  executionPlanId: string;
  platform: string;
  status: PublishingHandoffStatus;
  scheduledFor: string | null;
  attempts: number;
  maxAttempts: number;
  payload: PublishingHandoffPayload;
  missingRequirements: string[];
  error: string | null;
  externalId: string | null;
  publicationUrl: string | null;
  publishedAt: string | null;
  events: Array<{
    at: string;
    status: PublishingHandoffStatus;
    message: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PublishingHandoffInput = {
  publishingItemId: string;
  executionPlanId: string;
  recommendedPlatforms: string[];
  scheduledFor?: string;
  title: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  destinationLink: string;
  media?: { filePath?: string; mimeType?: string };
  platformMedia?: Record<
    string,
    { filePath?: string; mimeType?: string; version?: number; videoId?: string }
  >;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function supported(platform: string): boolean {
  return ["youtube", "tiktok", "instagram", "facebook"].includes(platform);
}

function normalizePlatform(value: string): string {
  const normalized = clean(value).toLowerCase().replaceAll("_", " ");
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("facebook")) return "facebook";
  return normalized.replaceAll(" ", "_");
}

function limits(platform: string): { characters: number; hashtags: number } {
  if (platform === "instagram") return { characters: 2200, hashtags: 30 };
  if (platform === "tiktok") return { characters: 2200, hashtags: 30 };
  if (platform === "facebook") return { characters: 63206, hashtags: 30 };
  return { characters: 5000, hashtags: 30 };
}

function mediaFor(input: PublishingHandoffInput, platform: string) {
  if (input.platformMedia) return input.platformMedia[platform];
  return input.media;
}

function platformCaption(input: PublishingHandoffInput): string {
  return [
    clean(input.caption),
    clean(input.callToAction),
    clean(input.destinationLink),
    input.hashtags.map(clean).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function missing(input: PublishingHandoffInput, platform: string): string[] {
  const platformLimits = limits(platform);
  const preparedCaption = platformCaption(input);
  const requirements: Array<[string, boolean]> = [
    ["title", Boolean(clean(input.title))],
    ["caption", Boolean(clean(input.caption))],
    ["call to action", Boolean(clean(input.callToAction))],
    ["destination link", Boolean(clean(input.destinationLink))],
    [
      "finished approved video",
      Boolean(clean(mediaFor(input, platform)?.filePath)),
    ],
    [
      "valid approved video format",
      clean(mediaFor(input, platform)?.mimeType)
        .toLowerCase()
        .startsWith("video/"),
    ],
    [
      `${platform} caption within ${platformLimits.characters} characters`,
      preparedCaption.length <= platformLimits.characters,
    ],
    [
      `${platform} hashtag count within ${platformLimits.hashtags}`,
      input.hashtags.length <= platformLimits.hashtags,
    ],
  ];
  return requirements
    .filter(([, satisfied]) => !satisfied)
    .map(([label]) => label);
}

async function addEvent(
  handoff: AutonomousPublishingHandoff,
  status: PublishingHandoffStatus,
  message: string,
  changes: Partial<AutonomousPublishingHandoff> = {},
) {
  const at = new Date().toISOString();
  return autonomousPublishingHandoffRepository.save({
    ...handoff,
    ...changes,
    status,
    events: [...handoff.events, { at, status, message }],
    updatedAt: at,
  });
}

export class AutonomousPublishingHandoffEngine {
  async enqueue(input: PublishingHandoffInput, now = new Date()) {
    const platforms = Array.from(
      new Set(
        input.recommendedPlatforms.map(normalizePlatform).filter(Boolean),
      ),
    );
    const destinations = platforms.length > 0 ? platforms : ["youtube"];

    return await Promise.all(
      destinations.map(async (platform) => {
        const existing =
          await autonomousPublishingHandoffRepository.forItemPlatform(
            input.publishingItemId,
            platform,
          );
        if (existing) return existing;

        const authorization = await growthPlanAuthorizationEngine.decision(
          input.executionPlanId,
          "publish",
        );
        const missingRequirements = missing(input, platform);
        const scheduledFor = clean(input.scheduledFor) || null;
        const future = scheduledFor
          ? new Date(scheduledFor).getTime() > now.getTime()
          : false;
        const status: PublishingHandoffStatus =
          !authorization.allowed || missingRequirements.length > 0
            ? "blocked"
            : !supported(platform)
              ? "waiting_executor"
              : future
                ? "scheduled"
                : "ready";
        const message = !authorization.allowed
          ? authorization.reason
          : missingRequirements.length > 0
            ? `KAI blocked this handoff because ${missingRequirements.join(", ")} ${missingRequirements.length === 1 ? "is" : "are"} missing.`
            : !supported(platform)
              ? `The approved ${platform} package is preserved independently and waits for its real publishing executor.`
              : future
                ? `Approved package will become publishable at ${scheduledFor}.`
                : "Approved package is ready for its real platform publisher.";
        const at = now.toISOString();

        return autonomousPublishingHandoffRepository.save({
          id: randomUUID(),
          publishingItemId: input.publishingItemId,
          executionPlanId: input.executionPlanId,
          platform,
          status,
          scheduledFor,
          attempts: 0,
          maxAttempts: 2,
          payload: {
            title: clean(input.title),
            caption: clean(input.caption),
            hashtags: Array.isArray(input.hashtags)
              ? input.hashtags.map(clean).filter(Boolean)
              : [],
            callToAction: clean(input.callToAction),
            destinationLink: clean(input.destinationLink),
            mediaFilePath: clean(mediaFor(input, platform)?.filePath),
            mediaMimeType: clean(mediaFor(input, platform)?.mimeType),
            platformCaption: platformCaption(input),
            characterLimit: limits(platform).characters,
            hashtagLimit: limits(platform).hashtags,
            videoVersion: input.platformMedia?.[platform]?.version ?? null,
            videoId: clean(input.platformMedia?.[platform]?.videoId),
          },
          missingRequirements,
          error: !authorization.allowed ? authorization.reason : null,
          externalId: null,
          publicationUrl: null,
          publishedAt: null,
          events: [{ at, status, message }],
          createdAt: at,
          updatedAt: at,
        });
      }),
    );
  }

  async releaseDue(now = new Date()) {
    let released = 0;
    for (const handoff of await autonomousPublishingHandoffRepository.history(
      2000,
    )) {
      if (handoff.status !== "scheduled" || !handoff.scheduledFor) continue;
      if (new Date(handoff.scheduledFor).getTime() > now.getTime()) continue;
      const authorization = await growthPlanAuthorizationEngine.decision(
        handoff.executionPlanId,
        "publish",
      );
      if (!authorization.allowed) {
        await addEvent(handoff, "blocked", authorization.reason, {
          error: authorization.reason,
        });
        continue;
      }
      await addEvent(
        handoff,
        "ready",
        "The approved publishing time arrived. KAI released this handoff.",
      );
      released += 1;
    }
    return released;
  }

  async releaseExecutor(platform: string) {
    const normalized = normalizePlatform(platform);
    if (!supported(normalized)) return 0;
    let released = 0;
    for (const handoff of await autonomousPublishingHandoffRepository.history(
      2000,
    )) {
      if (
        handoff.platform !== normalized ||
        handoff.status !== "waiting_executor"
      )
        continue;
      await addEvent(
        handoff,
        "ready",
        `The real ${normalized} executor is installed. KAI released this approved handoff.`,
      );
      released += 1;
    }
    return released;
  }

  async rescheduleItem(
    publishingItemId: string,
    scheduledFor: string,
    now = new Date(),
  ) {
    const scheduled = clean(scheduledFor);
    return await Promise.all(
      (
        await autonomousPublishingHandoffRepository.forItem(publishingItemId)
      ).map(async (handoff) => {
        if (["published", "publishing", "stopped"].includes(handoff.status))
          return handoff;
        const future =
          scheduled && new Date(scheduled).getTime() > now.getTime();
        return await addEvent(
          handoff,
          future ? "scheduled" : "ready",
          future
            ? `Owner-approved publishing time updated to ${scheduled}.`
            : "The updated publishing time is due now.",
          { scheduledFor: scheduled || null, error: null },
        );
      }),
    );
  }

  async markItemPublished(
    publishingItemId: string,
    platform: string,
    result: { externalId: string; url: string; publishedAt?: string },
  ) {
    const handoff = await autonomousPublishingHandoffRepository.forItemPlatform(
      publishingItemId,
      clean(platform).toLowerCase(),
    );
    return handoff ? await this.succeeded(handoff.id, result) : null;
  }

  async claimNext(now = new Date()) {
    await this.releaseDue(now);
    if (
      (await autonomousPublishingHandoffRepository.history()).some(
        (item) => item.status === "publishing",
      )
    ) {
      return null;
    }
    const handoff = await autonomousPublishingHandoffRepository.nextDue(
      now.toISOString(),
    );
    if (!handoff) return null;
    const authorization = await growthPlanAuthorizationEngine.decision(
      handoff.executionPlanId,
      "publish",
    );
    if (!authorization.allowed) {
      return await addEvent(handoff, "blocked", authorization.reason, {
        error: authorization.reason,
      });
    }
    return await addEvent(
      handoff,
      "publishing",
      `KAI handed the approved package to the real ${handoff.platform} publisher.`,
      {
        attempts: handoff.attempts + 1,
        error: null,
      },
    );
  }

  async succeeded(
    id: string,
    result: { externalId: string; url: string; publishedAt?: string },
  ) {
    const handoff = await autonomousPublishingHandoffRepository.byId(id);
    if (!handoff) return null;
    if (
      handoff.status === "published" &&
      handoff.externalId === clean(result.externalId)
    )
      return handoff;
    const publishedAt = clean(result.publishedAt) || new Date().toISOString();
    return addEvent(
      handoff,
      "published",
      `KAI confirmed the real ${handoff.platform} publication and saved its result.`,
      {
        externalId: clean(result.externalId),
        publicationUrl: clean(result.url),
        publishedAt,
        error: null,
      },
    );
  }

  async processing(id: string, publishId: string, message: string) {
    const handoff = await autonomousPublishingHandoffRepository.byId(id);
    return handoff
      ? await addEvent(handoff, "platform_processing", message, {
          externalId: clean(publishId),
          error: null,
        })
      : null;
  }

  async failed(id: string, reason: string, retryable = true) {
    const handoff = await autonomousPublishingHandoffRepository.byId(id);
    if (!handoff) return null;
    const message =
      clean(reason) || "The platform publisher failed without a usable error.";
    if (retryable && handoff.attempts < handoff.maxAttempts) {
      return addEvent(
        handoff,
        "retry_waiting",
        "The first platform failure was saved for one safe retry.",
        { error: message },
      );
    }
    return addEvent(
      handoff,
      "stopped",
      "KAI stopped repeated publishing failures and surfaced the exact error.",
      { error: message },
    );
  }

  async block(id: string, reason: string) {
    const handoff = await autonomousPublishingHandoffRepository.byId(id);
    return handoff
      ? await addEvent(handoff, "blocked", reason, { error: reason })
      : null;
  }

  async summary(now = new Date()) {
    await this.releaseDue(now);
    const handoffs = await autonomousPublishingHandoffRepository.history();
    const statuses: PublishingHandoffStatus[] = [
      "scheduled",
      "ready",
      "publishing",
      "platform_processing",
      "published",
      "blocked",
      "waiting_connection",
      "waiting_executor",
      "retry_waiting",
      "stopped",
    ];
    const counts = Object.fromEntries(
      statuses.map((status) => [
        status,
        handoffs.filter((item) => item.status === status).length,
      ]),
    );
    const platforms = ["youtube", "tiktok", "instagram", "facebook"].map(
      (platform) => {
        const jobs = handoffs.filter((item) => item.platform === platform);
        return {
          platform,
          total: jobs.length,
          counts: Object.fromEntries(
            statuses.map((status) => [
              status,
              jobs.filter((item) => item.status === status).length,
            ]),
          ),
          latest: jobs[0] ?? null,
        };
      },
    );
    return {
      total: handoffs.length,
      counts,
      active: handoffs.find((item) => item.status === "publishing") ?? null,
      nextScheduled:
        handoffs
          .filter((item) => item.status === "scheduled" && item.scheduledFor)
          .sort((a, b) =>
            String(a.scheduledFor).localeCompare(String(b.scheduledFor)),
          )[0] ?? null,
      handoffs,
      platforms,
    };
  }
}

export const autonomousPublishingHandoffEngine =
  new AutonomousPublishingHandoffEngine();
