export type ProductionStage =
  | "planning"
  | "directing"
  | "generating_images"
  | "rendering"
  | "packaging"
  | "completed"
  | "failed";

export type ProductionProgress = {
  videoId: string;
  stage: ProductionStage;
  message: string;
  completed: number;
  total: number;
  percentage: number;
  currentItem?: string;
  updatedAt: string;
  error?: string;
};

const progressStore = new Map<
  string,
  ProductionProgress
>();

function calculatePercentage(
  completed: number,
  total: number,
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round((completed / total) * 100),
    ),
  );
}

export function updateProductionProgress(input: {
  videoId: string;
  stage: ProductionStage;
  message: string;
  completed?: number;
  total?: number;
  currentItem?: string;
  error?: string;
}): ProductionProgress {
  const completed = input.completed ?? 0;
  const total = input.total ?? 0;

  const progress: ProductionProgress = {
    videoId: input.videoId,
    stage: input.stage,
    message: input.message,
    completed,
    total,
    percentage:
      input.stage === "completed"
        ? 100
        : calculatePercentage(
            completed,
            total,
          ),
    currentItem: input.currentItem,
    updatedAt: new Date().toISOString(),
    error: input.error,
  };

  progressStore.set(
    input.videoId,
    progress,
  );

  console.log(
    `[${input.videoId}] ${input.stage}: ${input.message}`,
  );

  return progress;
}

export function getProductionProgress(
  videoId: string,
): ProductionProgress | null {
  return progressStore.get(videoId) ?? null;
}

export function clearProductionProgress(
  videoId: string,
): void {
  progressStore.delete(videoId);
}

export function markProductionFailed(
  videoId: string,
  error: unknown,
): ProductionProgress {
  const message =
    error instanceof Error
      ? error.message
      : "Video production failed.";

  return updateProductionProgress({
    videoId,
    stage: "failed",
    message: "Video production failed.",
    error: message,
  });
}

export function markProductionCompleted(
  videoId: string,
): ProductionProgress {
  return updateProductionProgress({
    videoId,
    stage: "completed",
    message: "Video is ready for review.",
    completed: 1,
    total: 1,
  });
}