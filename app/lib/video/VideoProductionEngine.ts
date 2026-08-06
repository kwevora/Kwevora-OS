import { createKaiCreativeBrainPlan } from "../kaiCreativeBrain";
import { createKaiDailyMission } from "../kaiDailyMission";
import { directSceneSequence } from "../kaiSceneDirector";

import { generateImagesInQueue } from "./ImageGenerationQueue";
import {
  markProductionCompleted,
  markProductionFailed,
  updateProductionProgress,
} from "./ProgressTracker";
import { renderProductionVideo } from "./RenderManager";
import { directVideoMusic } from "./MusicDirector";
import { directVideoPresenter } from "./PresenterDirector";
import { directVideoVoice } from "./VoiceDirector";
import { generatePlannedVoice } from "./VoiceGenerationService";
import { generatePresenterVideo } from "./PresenterVideoEngine";
import {
  directCinematicScene,
  type CinematicBlueprint,
} from "./CinematicDirector";

import type { KaiCreativeScene } from "../kaiCreativeDirector";
import type { KaiSceneReview } from "../kaiSceneDirector";
import type {
  VideoProductionPackage,
  VideoScene,
} from "../../remotion/types";
import type {
  ProductionError,
  ProductionLogger,
  ProductionRequest,
  ProductionResult,
} from "./productionTypes";

const DEFAULT_OBJECTIVE =
  "Create useful content that builds trust and moves the viewer toward the next step.";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "KAI could not complete video production.";
}

function normalizeText(
  value: string | undefined,
  fallback = "",
): string {
  const cleaned = value?.trim();
  return cleaned ? cleaned : fallback;
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (hashtag): hashtag is string =>
      typeof hashtag === "string" &&
      hashtag.trim().length > 0,
  );
}

function normalizePlatforms(value: unknown): string[] {
  if (Array.isArray(value)) {
    const platforms = value.filter(
      (platform): platform is string =>
        typeof platform === "string" &&
        platform.trim().length > 0,
    );

    if (platforms.length > 0) {
      return platforms;
    }
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [
    "TikTok",
    "Instagram Reels",
    "YouTube Shorts",
  ];
}

function calculateEstimatedLengthSeconds(
  scenes: KaiCreativeScene[],
): number {
  return Math.max(
    1,
    Math.round(
      scenes.reduce(
        (total, scene) =>
          total + Math.max(0, scene.durationSeconds),
        0,
      ),
    ),
  );
}

function createDirectorMetadata(
  review: KaiSceneReview | undefined,
  sceneNumber: number,
): Record<string, unknown> {
  if (!review) {
    return {
      sceneNumber,
      status: "not_available",
    };
  }

  return {
    sceneNumber,
    status: "directed",
    blueprint: review.blueprint,
    quality: review.blueprint.quality,
    continuity: review.continuityState,
    directorNotes: review.notes,
  };
}

function createProductionScenes(input: {
  videoId: string;
  creativeScenes: KaiCreativeScene[];
  directedScenes: KaiSceneReview[];
  imageUrlsBySceneId: Map<string, string>;
  hashtags: string[];
  thumbnailTitle: string;
  thumbnailPrompt: string;
  audience: string;
  objective: string;
  callToAction: string;
  musicMood: string;
  confidence: number;
  reasoning: string;
  creativeBrain: Record<string, unknown>;
  cinematicBlueprints: CinematicBlueprint[];
}): VideoScene[] {
  return input.creativeScenes.map((scene, index) => {
    const directedScene = input.directedScenes[index];
    const cinematicBlueprint = input.cinematicBlueprints[index];
    const sceneId = `${input.videoId}-scene-${index + 1}`;

    const directedImagePrompt =
      directedScene?.blueprint.prompt.imagePrompt;
    const directedVideoPrompt =
      directedScene?.blueprint.prompt.videoPrompt;

    const imagePrompt = normalizeText(
      directedImagePrompt,
      scene.visualPrompt,
    );

    const visualPrompt = normalizeText(
      directedVideoPrompt,
      imagePrompt,
    );

    return {
      id: sceneId,
      text: scene.onScreenText,
      supportingText: scene.supportingText,
      narration: scene.narration,
      durationInFrames: Math.max(
        1,
        Math.round(scene.durationSeconds * 30),
      ),
      backgroundColor: "#050505",
      visual: scene.visual,
      visualPrompt,
      imagePrompt,
      imageUrl: input.imageUrlsBySceneId.get(sceneId),
      bRollKeywords: scene.bRollKeywords,
      cameraShot:
        cinematicBlueprint?.cameraShot ??
        scene.cameraShot,
      cameraMovement:
        cinematicBlueprint?.cameraMovement ??
        scene.cameraMovement,
      transition:
        cinematicBlueprint?.transition ??
        scene.transition,
      emotion:
        cinematicBlueprint?.emotion ??
        scene.emotion,
      lighting:
        cinematicBlueprint?.lighting ??
        scene.lighting,
      colorMood:
        cinematicBlueprint?.colorMood ??
        scene.colorMood,
      backgroundStyle:
        cinematicBlueprint?.backgroundStyle ??
        scene.backgroundStyle,
      textPosition: scene.textPosition,
      thumbnailPrompt: input.thumbnailPrompt,
      thumbnailTitle: input.thumbnailTitle,
      musicMood: input.musicMood,
      soundEffects: scene.soundDesign ?? [],
      cta: input.callToAction,
      hashtags: input.hashtags,
      confidence: input.confidence,
      audience: input.audience,
      objective: input.objective,
      reasoning: input.reasoning,
      metadata: {
        sceneDirector: createDirectorMetadata(
          directedScene,
          index + 1,
        ),
        creativeBrain: input.creativeBrain,
        cinematicDirector: cinematicBlueprint,
      },
    };
  });
}

export type VideoProductionEngineOptions = {
  logger?: ProductionLogger;
};

export async function produceVideo(
  request: ProductionRequest,
  options: VideoProductionEngineOptions = {},
): Promise<ProductionResult | ProductionError> {
  const videoId = request.videoId.trim();
  const topic = request.topic.trim();

  const logger =
    options.logger ??
    ((message: string) => {
      console.log(`[${videoId}] ${message}`);
    });

  if (!videoId) {
    return {
      success: false,
      videoId,
      stage: "planning",
      message: "A video ID is required.",
    };
  }

  if (!topic) {
    return {
      success: false,
      videoId,
      stage: "planning",
      message: "A video topic is required.",
    };
  }

  let currentStage: ProductionError["stage"] =
    "planning";

  try {
    updateProductionProgress({
      videoId,
      stage: "planning",
      message: "KAI is preparing the video mission.",
      completed: 0,
      total: 2,
      currentItem: topic,
    });

    logger("Creating the daily mission.");

    const mission = await createKaiDailyMission({
      primaryGoal: "Content",
      currentGoals: [topic],
    });

    const content = mission.mission.contentPackage;

    if (!content) {
      throw new Error(
        "KAI could not generate a content package.",
      );
    }

    updateProductionProgress({
      videoId,
      stage: "planning",
      message: "KAI is creating the creative plan.",
      completed: 1,
      total: 2,
      currentItem: topic,
    });

    logger("Comparing multiple creative directions.");

    const creativeBrain = await createKaiCreativeBrainPlan({
      topic,
      platform: normalizePlatforms(
        content.recommendedPlatform,
      )[0],
      candidateLimit: 5,
    });

    const creativePlan = creativeBrain.selectedPlan;
    const selectedConcept = creativeBrain.selectedConcept;

    updateProductionProgress({
      videoId,
      stage: "planning",
      message: "Creative plan completed.",
      completed: 2,
      total: 2,
      currentItem: `${selectedConcept.name} (${creativeBrain.candidates[0]?.score.total ?? selectedConcept.confidence}/100)`,
    });

    currentStage = "directing";

    updateProductionProgress({
      videoId,
      stage: "directing",
      message: "KAI is directing each scene.",
      completed: 0,
      total: selectedConcept.plan.scenes.length,
    });

    const directedScenes = directSceneSequence(
      selectedConcept.plan.scenes,
      creativePlan.decision,
    );

    updateProductionProgress({
      videoId,
      stage: "directing",
      message: "Scene direction completed.",
      completed: directedScenes.length,
      total: selectedConcept.plan.scenes.length,
    });

    logger("Creating cinematic direction for every scene.");

    const cinematicBlueprints =
      selectedConcept.plan.scenes.map(
        (scene, index) =>
          directCinematicScene({
            topic,
            objective:
              mission.mission.objective ??
              DEFAULT_OBJECTIVE,
            audience:
              selectedConcept.plan.audience,
            narration:
              scene.narration ||
              scene.onScreenText ||
              scene.visual,
            sceneNumber: index + 1,
            totalScenes:
              selectedConcept.plan.scenes.length,
          }),
      );

    const imageTasks = selectedConcept.plan.scenes.map(
      (scene, index) => {
        const sceneId = `${videoId}-scene-${index + 1}`;
        const directedPrompt =
          directedScenes[index]?.blueprint.prompt.imagePrompt;

        return {
          videoId,
          sceneId,
          prompt: [
            cinematicBlueprints[index]
              ?.imagePromptPrefix,
            normalizeText(
              directedPrompt,
              scene.visualPrompt,
            ),
            cinematicBlueprints[index]
              ?.visualStory,
            cinematicBlueprints[index]
              ? `Lighting: ${cinematicBlueprints[index].lighting}.`
              : "",
            cinematicBlueprints[index]
              ? `Color mood: ${cinematicBlueprints[index].colorMood}.`
              : "",
            cinematicBlueprints[index]
              ? `Image style: ${cinematicBlueprints[index].imageStyle}.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        };
      },
    );

    currentStage = "generating_images";

    const generatedImages = await generateImagesInQueue(
      imageTasks,
      {
        onProgress: (progress) => {
          updateProductionProgress({
            videoId,
            stage: "generating_images",
            message:
              progress.status === "retrying"
                ? "KAI is retrying a scene image."
                : progress.status === "completed"
                  ? "Scene image completed."
                  : "KAI is generating scene images.",
            completed: progress.completed,
            total: progress.total,
            currentItem: progress.currentSceneId,
          });
        },
      },
    );

    const imageUrlsBySceneId = new Map(
      generatedImages.map((image) => [
        image.sceneId,
        image.imageUrl,
      ]),
    );

    currentStage = "packaging";

    updateProductionProgress({
      videoId,
      stage: "packaging",
      message: "KAI is assembling the production package.",
      completed: 0,
      total: 1,
    });

    const hashtags = normalizeHashtags(
      content.hashtags,
    );
    const recommendedPlatforms =
      normalizePlatforms(
        content.recommendedPlatform,
      );
    const objective =
      normalizeText(
        mission.mission.objective,
        DEFAULT_OBJECTIVE,
      );
    const reasoning = normalizeText(
      selectedConcept.reason,
      mission.mission.reason,
    );

    const scenes = createProductionScenes({
      videoId,
      creativeScenes: selectedConcept.plan.scenes,
      directedScenes,
      imageUrlsBySceneId,
      hashtags,
      thumbnailTitle: creativePlan.title,
      thumbnailPrompt:
        selectedConcept.plan.thumbnailIdea,
      audience: selectedConcept.plan.audience,
      objective,
      callToAction:
        selectedConcept.plan.callToAction,
      musicMood: selectedConcept.plan.musicStyle,
      confidence: selectedConcept.confidence,
      reasoning,
      cinematicBlueprints,
      creativeBrain: {
        selectedCandidateId:
          creativeBrain.selectedCandidateId,
        recommendation:
          creativeBrain.recommendation,
        selectedScore:
          creativeBrain.candidates.find(
            (candidate) =>
              candidate.id ===
              creativeBrain.selectedCandidateId,
          )?.score,
        candidateScores:
          creativeBrain.candidates.map(
            (candidate) => ({
              id: candidate.id,
              objective: candidate.objective,
              conceptName:
                candidate.concept.name,
              score: candidate.score,
              strengths: candidate.strengths,
              concerns: candidate.concerns,
            }),
          ),
      },
    });

    const presenterDirection = directVideoPresenter({
      topic,
      title: creativePlan.title,
      hook: selectedConcept.plan.hook,
      script: scenes
        .map((scene) => scene.narration || scene.text)
        .filter(Boolean)
        .join(" "),
      audience: selectedConcept.plan.audience,
      objective,
      platform: recommendedPlatforms[0],
      emotion: selectedConcept.plan.emotion,
    });

    logger(
      `Presenter selected: ${presenterDirection.presenter.name}.`,
    );

    const voiceDirection = directVideoVoice({
      title: creativePlan.title,
      hook: selectedConcept.plan.hook,
      script: scenes
        .map((scene) => scene.narration || scene.text)
        .filter(Boolean)
        .join(" "),
      topic,
      audience: selectedConcept.plan.audience,
      objective,
      emotion: selectedConcept.plan.emotion,
      platform: recommendedPlatforms[0],
      presenter: presenterDirection,
    });

    logger(
      `Voice selected: ${voiceDirection.voice.name}.`,
    );

    logger("Generating narration audio.");

    const voiceGeneration = await generatePlannedVoice({
      videoId,
      voiceDirection,
    });

    if (voiceGeneration.success) {
      logger(
        `Narration generated: ${voiceGeneration.audioUrl}.`,
      );
    } else {
      logger(
        `Narration generation failed: ${voiceGeneration.message}`,
      );
    }

    const presenterGeneration =
      await generatePresenterVideo({
        videoId,
        presenter: {
          ...presenterDirection,
          presenterAudioUrl:
            voiceGeneration.audioUrl,
          status: "planned",
        },
      });

    if (presenterGeneration.success) {
      logger(
        `Presenter generated: ${presenterGeneration.videoUrl}.`,
      );
    } else {
      logger(
        `Presenter waiting: ${presenterGeneration.message}`,
      );
    }

    const finalPresenter =
      presenterGeneration.success
        ? presenterGeneration.presenter
        : {
            ...presenterDirection,
            presenterAudioUrl:
              voiceGeneration.audioUrl,
            status: "planned" as const,
          };

    const scenesWithVoice = scenes.map((scene) => ({
      ...scene,
      voiceAudioUrl: voiceGeneration.audioUrl,
    }));

    const musicDirection = directVideoMusic({
      title: creativePlan.title,
      hook: selectedConcept.plan.hook,
      topic,
      audience: selectedConcept.plan.audience,
      objective,
      preferredMood: selectedConcept.plan.musicStyle,
      scenes: scenesWithVoice,
    });

    logger(
      `Music selected: ${musicDirection.mood} (${musicDirection.energy} energy).`,
    );

    const productionPackage: VideoProductionPackage = {
      title: creativePlan.title,
      hook: selectedConcept.plan.hook,
      thumbnailTitle: creativePlan.title,
      thumbnailPrompt:
        selectedConcept.plan.thumbnailIdea,
      caption: content.caption,
      hashtags,
      cta: selectedConcept.plan.callToAction,
      audience: selectedConcept.plan.audience,
      objective,
      reasoning,
      confidence: selectedConcept.confidence,
      estimatedLengthSeconds:
        calculateEstimatedLengthSeconds(
          selectedConcept.plan.scenes,
        ),
      recommendedPlatforms,
      musicMood: musicDirection.mood,
      music: musicDirection.track,
      presenter: finalPresenter,
      voice: voiceGeneration.voice,
      scenes: scenesWithVoice,
    };

    updateProductionProgress({
      videoId,
      stage: "packaging",
      message: "Production package completed.",
      completed: 1,
      total: 1,
      currentItem: productionPackage.title,
    });

    currentStage = "rendering";

    const render = await renderProductionVideo(
      {
        videoId,
        title: productionPackage.title,
        brand: "KWEVORA",
        scenes: productionPackage.scenes,
        musicMood: productionPackage.musicMood,
        music: productionPackage.music,
      },
      { logger },
    );

    markProductionCompleted(videoId);

    logger("Video production completed.");

    return {
      success: true,
      videoId,
      title: productionPackage.title,
      scenes: productionPackage.scenes,
      productionPackage,
      render,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    markProductionFailed(videoId, error);
    logger(`Video production failed: ${message}`);

    return {
      success: false,
      videoId,
      stage: currentStage,
      message,
    };
  }
}

export const VideoProductionEngine = {
  produce: produceVideo,
};