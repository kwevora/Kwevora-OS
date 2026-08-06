import { renderKaiVideo } from "../renderKaiVideo";

import {
  updateProductionProgress,
} from "./ProgressTracker";

import type {
  ProductionLogger,
  ProductionRenderRequest,
  ProductionRenderResult,
} from "./productionTypes";

export type RenderManagerOptions = {
  logger?: ProductionLogger;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "KAI could not render the video.";
}

export async function renderProductionVideo(
  request: ProductionRenderRequest,
  options: RenderManagerOptions = {},
): Promise<ProductionRenderResult> {
  const {
    videoId,
    title,
    scenes,
    brand = "KWEVORA",
    musicMood,
    music,
  } = request;

  const logger =
    options.logger ??
    ((message: string) => {
      console.log(`[${videoId}] ${message}`);
    });

  if (!videoId.trim()) {
    throw new Error(
      "A video ID is required before rendering can begin.",
    );
  }

  if (!title.trim()) {
    throw new Error(
      "A video title is required before rendering can begin.",
    );
  }

  if (scenes.length === 0) {
    throw new Error(
      "At least one scene is required before rendering can begin.",
    );
  }

  updateProductionProgress({
    videoId,
    stage: "rendering",
    message: "KAI is rendering the final video.",
    completed: 0,
    total: 1,
    currentItem: title,
  });

  logger(
    `Starting video render with ${scenes.length} scene${
      scenes.length === 1 ? "" : "s"
    }${music?.url ? " and background music" : ""}.`,
  );

  const startedAt = Date.now();

  try {
    const result = await renderKaiVideo({
      videoId,
      title,
      scenes,
      brand,
      musicMood,
      music,
    });

    const elapsedSeconds = Math.max(
      1,
      Math.round(
        (Date.now() - startedAt) / 1000,
      ),
    );

    updateProductionProgress({
      videoId,
      stage: "rendering",
      message: "Final video render completed.",
      completed: 1,
      total: 1,
      currentItem: result.videoUrl,
    });

    logger(
      `Video render completed in ${elapsedSeconds} second${
        elapsedSeconds === 1 ? "" : "s"
      }.`,
    );

    return result;
  } catch (error) {
    const message = getErrorMessage(error);

    updateProductionProgress({
      videoId,
      stage: "failed",
      message: "KAI could not render the final video.",
      completed: 0,
      total: 1,
      currentItem: title,
      error: message,
    });

    logger(`Video render failed: ${message}`);

    throw new Error(
      `Video rendering failed: ${message}`,
      {
        cause: error,
      },
    );
  }
}