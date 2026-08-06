import { generateSceneImage } from "../imageGenerator";
import { runWithRetry } from "./RetryManager";

export type ImageGenerationTask = {
  videoId: string;
  sceneId: string;
  prompt: string;
};

export type GeneratedSceneImage = {
  sceneId: string;
  imageUrl: string;
  filePath: string;
  model: string;
};

export type ImageQueueProgress = {
  completed: number;
  total: number;
  currentSceneId: string;
  status:
    | "generating"
    | "completed"
    | "retrying";
};

export type ImageGenerationQueueOptions = {
  delayBetweenImagesMs?: number;
  onProgress?: (
    progress: ImageQueueProgress,
  ) => void;
};

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function generateImagesInQueue(
  tasks: ImageGenerationTask[],
  options: ImageGenerationQueueOptions = {},
): Promise<GeneratedSceneImage[]> {
  const {
    delayBetweenImagesMs = 1_000,
    onProgress,
  } = options;

  const results: GeneratedSceneImage[] = [];

  for (
    let index = 0;
    index < tasks.length;
    index++
  ) {
    const task = tasks[index];

    onProgress?.({
      completed: index,
      total: tasks.length,
      currentSceneId: task.sceneId,
      status: "generating",
    });

    console.log(
      `Generating image ${index + 1} of ${tasks.length}: ${task.sceneId}`,
    );

    const generatedImage = await runWithRetry(
      () =>
        generateSceneImage({
          videoId: task.videoId,
          sceneId: task.sceneId,
          prompt: task.prompt,
        }),
      {
        maxAttempts: 5,
        baseDelayMs: 15_000,
        maxDelayMs: 60_000,
        operationName: `Image generation for ${task.sceneId}`,

        onRetry: () => {
          onProgress?.({
            completed: index,
            total: tasks.length,
            currentSceneId: task.sceneId,
            status: "retrying",
          });
        },
      },
    );

    results.push({
      sceneId: task.sceneId,
      imageUrl: generatedImage.imageUrl,
      filePath: generatedImage.filePath,
      model: generatedImage.model,
    });

    onProgress?.({
      completed: index + 1,
      total: tasks.length,
      currentSceneId: task.sceneId,
      status: "completed",
    });

    console.log(
      `Completed image ${index + 1} of ${tasks.length}: ${task.sceneId}`,
    );

    const hasAnotherImage =
      index < tasks.length - 1;

    if (
      hasAnotherImage &&
      delayBetweenImagesMs > 0
    ) {
      await wait(delayBetweenImagesMs);
    }
  }

  return results;
}