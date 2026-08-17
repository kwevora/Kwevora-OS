import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { autonomousVideoJobRepository } from "./database/AutonomousVideoJobRepository";
import { growthPlanAuthorizationEngine } from "./GrowthPlanAuthorizationEngine";
import { produceVideo } from "./video/VideoProductionEngine";
import type {
  ProductionError,
  ProductionResult,
} from "./video/productionTypes";
import type { AdaptiveCreationPlan } from "./AdaptiveContentCreationBrain";
import type { VideoExperimentDirective } from "./VideoExperimentPlanner";
import type { CreativeWinnerDirective } from "./CreativeWinnerSystem";
import type { CreativePortfolioDirective } from "./CreativePortfolioManager";

export type AutonomousVideoJobStatus =
  | "waiting_approval"
  | "queued"
  | "scenes"
  | "voice_music"
  | "rendering"
  | "ready_for_review"
  | "retry_waiting"
  | "stopped";

export type AutonomousVideoJob = {
  id: string;
  executionPlanId: string;
  growthPlanId: string | null;
  slotId: string | null;
  reviewItemId: string;
  topic: string;
  status: AutonomousVideoJobStatus;
  attempts: number;
  adaptiveCreation?: AdaptiveCreationPlan;
  videoExperiment?: VideoExperimentDirective;
  creativeWinner?: CreativeWinnerDirective;
  creativePortfolio?: CreativePortfolioDirective;
  maxAttempts: number;
  videoId: string | null;
  videoUrl: string | null;
  outputLocation: string | null;
  error: string | null;
  events: Array<{
    at: string;
    status: AutonomousVideoJobStatus;
    message: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type Producer = (request: {
  videoId: string;
  topic: string;
  adaptiveCreation?: AdaptiveCreationPlan;
  videoExperiment?: VideoExperimentDirective;
  creativeWinner?: CreativeWinnerDirective;
  creativePortfolio?: CreativePortfolioDirective;
}) => Promise<ProductionResult | ProductionError>;

async function event(
  job: AutonomousVideoJob,
  status: AutonomousVideoJobStatus,
  message: string,
) {
  const at = new Date().toISOString();
  return autonomousVideoJobRepository.save({
    ...job,
    status,
    events: [...job.events, { at, status, message }],
    updatedAt: at,
  });
}

export class AutonomousVideoQueueEngine {
  async enqueue(input: {
    executionPlanId: string;
    growthPlanId?: string;
    slotId?: string;
    reviewItemId: string;
    topic: string;
    adaptiveCreation?: AdaptiveCreationPlan;
    videoExperiment?: VideoExperimentDirective | null;
    creativeWinner?: CreativeWinnerDirective | null;
    creativePortfolio?: CreativePortfolioDirective | null;
  }) {
    const existing = await autonomousVideoJobRepository.forExecutionPlan(
      input.executionPlanId,
    );
    if (existing) return existing;
    const permission = await growthPlanAuthorizationEngine.decision(
      input.executionPlanId,
      "produce_video",
    );
    const now = new Date().toISOString();
    const status: AutonomousVideoJobStatus = permission.allowed
      ? "queued"
      : "waiting_approval";
    return autonomousVideoJobRepository.save({
      id: randomUUID(),
      executionPlanId: input.executionPlanId,
      growthPlanId: input.growthPlanId ?? null,
      slotId: input.slotId ?? null,
      reviewItemId: input.reviewItemId,
      topic: input.topic,
      status,
      attempts: 0,
      maxAttempts: 2,
      adaptiveCreation: input.adaptiveCreation,
      videoExperiment: input.videoExperiment ?? undefined,
      creativeWinner: input.creativeWinner ?? undefined,
      creativePortfolio: input.creativePortfolio ?? undefined,
      videoId: null,
      videoUrl: null,
      outputLocation: null,
      error: null,
      events: [
        {
          at: now,
          status,
          message: permission.allowed
            ? "Approved faceless video queued."
            : "Video plan prepared; rendering waits for weekly approval.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }

  async releasePlan(planId: string) {
    let released = 0;
    for (const job of await autonomousVideoJobRepository.history(1000)) {
      if (job.growthPlanId !== planId || job.status !== "waiting_approval")
        continue;
      const permission = await growthPlanAuthorizationEngine.decision(
        job.executionPlanId,
        "produce_video",
      );
      if (permission.allowed) {
        await event(
          job,
          "queued",
          "Weekly approval released this video into production.",
        );
        released += 1;
      }
    }
    return released;
  }

  async processNext(
    producer: Producer = produceVideo,
  ): Promise<AutonomousVideoJob | null> {
    const processing = (await autonomousVideoJobRepository.history()).some(
      (job) => ["scenes", "voice_music", "rendering"].includes(job.status),
    );
    if (processing) return null;
    let job = await autonomousVideoJobRepository.nextReady();
    if (!job) return null;
    const permission = await growthPlanAuthorizationEngine.decision(
      job.executionPlanId,
      "produce_video",
    );
    if (!permission.allowed)
      return await event(job, "waiting_approval", permission.reason);
    job = await event(
      {
        ...job,
        attempts: job.attempts + 1,
        videoId: job.videoId ?? randomUUID(),
        error: null,
      },
      "scenes",
      "KAI is directing and generating the video scenes.",
    );
    job = await event(
      job,
      "voice_music",
      "KAI is preparing voice, captions, and music direction.",
    );
    job = await event(
      job,
      "rendering",
      "KAI is rendering one video without overloading the production queue.",
    );
    try {
      const result = await producer({
        videoId: job.videoId!,
        topic: job.topic,
        adaptiveCreation: job.adaptiveCreation,
        videoExperiment: job.videoExperiment,
        creativeWinner: job.creativeWinner,
        creativePortfolio: job.creativePortfolio,
      });
      if (!result.success)
        throw new Error(`${result.stage}: ${result.message}`);
      await this.attachToReview(job.reviewItemId, result);
      return await event(
        {
          ...job,
          videoUrl: result.render.videoUrl,
          outputLocation: result.render.outputLocation,
        },
        "ready_for_review",
        "Finished video attached to its Review Queue item. Publishing still requires review of the actual file.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Video production failed.";
      if (job.attempts < job.maxAttempts)
        return await event(
          { ...job, error: message },
          "retry_waiting",
          "Temporary production failure saved for one safe retry.",
        );
      return await event(
        { ...job, error: message },
        "stopped",
        "KAI stopped repeated rendering failures and surfaced the error for attention.",
      );
    }
  }

  async summary() {
    const jobs = await autonomousVideoJobRepository.history();
    const counts = Object.fromEntries(
      [
        "waiting_approval",
        "queued",
        "scenes",
        "voice_music",
        "rendering",
        "ready_for_review",
        "retry_waiting",
        "stopped",
      ].map((status) => [
        status,
        jobs.filter((job) => job.status === status).length,
      ]),
    );
    return {
      total: jobs.length,
      counts,
      active:
        jobs.find((job) =>
          ["scenes", "voice_music", "rendering"].includes(job.status),
        ) ?? null,
      jobs,
    };
  }

  private async attachToReview(
    reviewItemId: string,
    result: ProductionResult,
  ): Promise<void> {
    const file = path.join(process.cwd(), "data", "review-queue.json");
    let items: Array<Record<string, unknown>> = [];
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      /* queue will be created */
    }
    const index = items.findIndex((item) => item.id === reviewItemId);
    if (index < 0)
      throw new Error("The matching Review Queue item no longer exists.");
    let size = 0;
    try {
      size = (await fs.stat(result.render.outputLocation)).size;
    } catch {
      /* URL-backed render */
    }
    items[index] = {
      ...items[index],
      media: {
        source: "generated",
        fileName: path.basename(result.render.outputLocation),
        storedFileName: path.basename(result.render.outputLocation),
        mimeType: "video/mp4",
        size,
        filePath: result.render.outputLocation,
        videoUrl: result.render.videoUrl,
      },
      videoProduction: {
        videoId: result.videoId,
        status: "ready_for_review",
        videoUrl: result.render.videoUrl,
        direction: result.productionPackage.videoDirection,
        whyKaiDirectedItThisWay:
          result.productionPackage.videoDirection?.whyKaiDirectedItThisWay,
        reviewRequired: true,
        currentVersion: 1,
        productionPackage: result.productionPackage,
        versions: [
          {
            version: 1,
            videoId: result.videoId,
            videoUrl: result.render.videoUrl,
            outputLocation: result.render.outputLocation,
            createdAt: new Date().toISOString(),
            changeType: "initial",
            request: "Initial adaptive video production.",
            changes: [
              "Created the first finished video from KAI's approved adaptive direction.",
            ],
            platform:
              result.productionPackage.videoDirection?.platform ??
              result.productionPackage.recommendedPlatforms[0] ??
              "Primary platform",
            videoDirection: result.productionPackage.videoDirection,
            editingProfile: {
              pacing:
                result.productionPackage.videoDirection?.pace ?? "unknown",
              textDensity:
                result.productionPackage.videoDirection?.textDensity ??
                "unknown",
              voiceRate:
                result.productionPackage.voice?.voice.speakingRate ?? null,
              voiceStyle:
                result.productionPackage.voice?.voice.style ?? "unknown",
              musicMood: result.productionPackage.musicMood ?? "unknown",
              musicVolume: result.productionPackage.music?.volume ?? null,
              openingStyle:
                result.productionPackage.scenes[0]?.cameraShot ?? "unknown",
              visualSequence: result.productionPackage.scenes
                .map((scene) => scene.cameraShot ?? "unknown")
                .join(" → "),
              experiment: result.productionPackage.videoDirection?.experiment,
              creativeWinner:
                result.productionPackage.videoDirection?.creativeWinner,
              creativePortfolio:
                result.productionPackage.videoDirection?.creativePortfolio,
            },
          },
        ],
      },
    };
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(items, null, 2), "utf8");
  }
}

export const autonomousVideoQueueEngine = new AutonomousVideoQueueEngine();
