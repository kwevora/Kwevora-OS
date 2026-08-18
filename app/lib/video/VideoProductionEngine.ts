import { createKaiCreativeBrainPlan } from "../kaiCreativeBrain";
import { createKaiDailyMission } from "../kaiDailyMission";
import { directSceneSequence } from "../kaiSceneDirector";

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
import {
  directCinematicScene,
  type CinematicBlueprint,
} from "./CinematicDirector";
import { directAdaptiveVideo } from "./AdaptiveVideoDirector";
import { generateMotionScenes } from "./MotionVideoGenerationService";
import { generateLocalSoundtrack } from "./LocalSoundtrackService";
import { enforcePremiumVideoQuality, repairPremiumVideoPackage } from "./VideoQualityGate";
import { directGenerativeVideo } from "./KaiGenerativeVideoDirector";

import type { KaiCreativeScene } from "../kaiCreativeDirector";
import type { KaiSceneReview } from "../kaiSceneDirector";
import type { VideoProductionPackage, VideoScene } from "../../remotion/types";
import type {
  ProductionError,
  ProductionLogger,
  ProductionRequest,
  ProductionResult,
} from "./productionTypes";

const DEFAULT_OBJECTIVE =
  "Create useful content that builds trust and moves the viewer toward the next step.";

const APPROACH_DIRECTIONS = {
  emotional_story:
    "Build an emotionally honest story: recognizable struggle, human turning point, believable hope, then the product as the practical next step. Avoid hype and generic motivation.",
  problem_solution:
    "Open with a painful specific problem, make its cost concrete, demonstrate the product's mechanism, and end with one direct action.",
  product_demonstration:
    "Show what the buyer receives and how they use it. Make the product tangible, visually specific, and outcome-focused instead of merely inspirational.",
} as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "KAI could not complete video production.";
}

function normalizeText(value: string | undefined, fallback = ""): string {
  const cleaned = value?.trim();
  return cleaned ? cleaned : fallback;
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (hashtag): hashtag is string =>
      typeof hashtag === "string" && hashtag.trim().length > 0,
  );
}

function normalizePlatforms(value: unknown): string[] {
  if (Array.isArray(value)) {
    const platforms = value.filter(
      (platform): platform is string =>
        typeof platform === "string" && platform.trim().length > 0,
    );

    if (platforms.length > 0) {
      return platforms;
    }
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return ["TikTok", "Instagram Reels", "YouTube Shorts"];
}

function compactWords(value: string | undefined, maximum: number) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, maximum)
    .join(" ");
}

function directedHeadline(scene: KaiCreativeScene) {
  if (!['hook', 'solution', 'call-to-action'].includes(scene.purpose)) return "";
  return compactWords(scene.onScreenText, 7);
}

function calculateEstimatedLengthSeconds(scenes: KaiCreativeScene[]): number {
  return Math.max(
    1,
    Math.round(
      scenes.reduce(
        (total, scene) => total + Math.max(0, scene.durationSeconds),
        0,
      ),
    ),
  );
}

function createProductFirstFallback(
  scenes: VideoScene[],
  productAssetUrls: string[],
): VideoScene[] {
  // Match product coverage to the amount of truthful media available. One
  // still may support a reveal and one detail treatment, but it must never be
  // stretched across the entire commercial.
  const productProofIndexes = productAssetUrls.length <= 1
    ? new Set([3, 5])
    : productAssetUrls.length <= 3
      ? new Set([2, 4, 6])
      : new Set([1, 2, 3, 4, 5]);
  const productMovements: VideoScene["cameraMovement"][] = [
    "slow-push-in",
    "pan-left",
    "pan-right",
  ];
  let productSceneNumber = 0;

  return scenes.map((scene, index) => {
    if (scene.metadata?.presenterGenerated === true && scene.videoUrl) {
      return scene;
    }

    const useProductProof = productProofIndexes.has(index);

    if (!useProductProof) {
      const facelessTreatments = [
        "scattered-content-cards",
        "deadline-pressure",
        "idea-overload",
        "workflow-build",
        "calendar-organization",
        "publishing-momentum",
        "outcome-proof",
        "link-conversion",
      ] as const;
      const visualTreatment =
        facelessTreatments[index % facelessTreatments.length];

      return {
        ...scene,
        imageUrl: undefined,
        videoUrl: undefined,
        cameraMovement: index % 2 === 0 ? "slow-push-in" : "slow-pull-out",
        metadata: {
          ...scene.metadata,
          visualSource: "designed-faceless-motion",
          visualTreatment,
          designedFacelessMotion: true,
          productProof: false,
          motionProvider: "KAI Remotion faceless ad system",
          motionGenerated: true,
          motionSelectedByKai: true,
          footageQuery: `designed faceless motion ${visualTreatment} ${index + 1}`,
        },
      };
    }

    const assetUrl = productAssetUrls[
      productSceneNumber % Math.max(1, productAssetUrls.length)
    ];
    const assetIsVideo = Boolean(assetUrl?.match(/\.(mp4|webm|mov)(?:\?.*)?$/i));
    const cameraMovement = productMovements[productSceneNumber % productMovements.length];
    productSceneNumber += 1;
    return {
      ...scene,
      imageUrl: assetIsVideo ? undefined : assetUrl,
      videoUrl: assetIsVideo ? assetUrl : undefined,
      cameraMovement,
      metadata: {
        ...scene.metadata,
        visualSource: "product",
        productProof: true,
        productAssetUrl: assetUrl,
        productAssetIndex:
          (productSceneNumber - 1) % Math.max(1, productAssetUrls.length),
        motionProvider: "product-first-fallback",
        motionGenerated: false,
        motionSelectedByKai: true,
        footageQuery: `product walkthrough scene ${index + 1}`,
      },
    };
  });
}

function fitScenesToNarration(
  scenes: VideoScene[],
  narrationDurationSeconds: number,
): VideoScene[] {
  const currentFrames = scenes.reduce(
    (total, scene) => total + Math.max(1, scene.durationInFrames),
    0,
  );
  const requiredFrames = Math.ceil((narrationDurationSeconds + 1.25) * 30);

  if (currentFrames >= requiredFrames) return scenes;

  const scale = requiredFrames / currentFrames;
  const resized = scenes.map((scene) => ({
    ...scene,
    durationInFrames: Math.max(45, Math.ceil(scene.durationInFrames * scale)),
  }));
  const resizedTotal = resized.reduce((total, scene) => total + scene.durationInFrames, 0);

  if (resizedTotal < requiredFrames) {
    resized[resized.length - 1].durationInFrames += requiredFrames - resizedTotal;
  }

  return resized;
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
  productName: string;
  creativeScenes: KaiCreativeScene[];
  directedScenes: KaiSceneReview[];
  imageUrlsBySceneId: Map<string, string>;
  hashtags: string[];
  thumbnailTitle: string;
  thumbnailPrompt: string;
  audience: string;
  objective: string;
  callToAction: string;
  destination: string;
  musicMood: string;
  confidence: number;
  reasoning: string;
  creativeBrain: Record<string, unknown>;
  cinematicBlueprints: CinematicBlueprint[];
  productAssetUrls: string[];
}): VideoScene[] {
  return input.creativeScenes.map((scene, index) => {
    const directedScene = input.directedScenes[index];
    const cinematicBlueprint = input.cinematicBlueprints[index];
    const sceneId = `${input.videoId}-scene-${index + 1}`;

    const directedImagePrompt = directedScene?.blueprint.prompt.imagePrompt;
    const directedVideoPrompt = directedScene?.blueprint.prompt.videoPrompt;

    const imagePrompt = normalizeText(directedImagePrompt, scene.visualPrompt);

    const visualPrompt = normalizeText(directedVideoPrompt, imagePrompt);
    const isProductProof = scene.visualSource === "product";
    const requestedAssetIndex = Number(scene.productAssetIndex);
    const productAssetIndex = Number.isInteger(requestedAssetIndex)
      ? Math.max(0, Math.min(input.productAssetUrls.length - 1, requestedAssetIndex))
      : index % input.productAssetUrls.length;
    const productAssetUrl = isProductProof
      ? input.productAssetUrls[productAssetIndex]
      : undefined;
    const productAssetIsVideo = Boolean(
      productAssetUrl?.match(/\.(mp4|webm|mov)(?:\?.*)?$/i),
    );

    const isCallToAction = scene.purpose === "call-to-action";

    return {
      id: sceneId,
      text: isCallToAction
        ? "Click the link to get it"
        : directedHeadline(scene),
      supportingText: "",
      narration: scene.narration,
      durationInFrames: Math.max(1, Math.round(scene.durationSeconds * 30)),
      backgroundColor: "#050505",
      visual: scene.visual,
      visualPrompt,
      imagePrompt,
      imageUrl: productAssetUrl && !productAssetIsVideo
        ? productAssetUrl
        : input.imageUrlsBySceneId.get(sceneId),
      videoUrl: productAssetIsVideo ? productAssetUrl : undefined,
      bRollKeywords: scene.bRollKeywords,
      cameraShot: cinematicBlueprint?.cameraShot ?? scene.cameraShot,
      cameraMovement:
        cinematicBlueprint?.cameraMovement ?? scene.cameraMovement,
      transition: cinematicBlueprint?.transition ?? scene.transition,
      emotion: cinematicBlueprint?.emotion ?? scene.emotion,
      lighting: cinematicBlueprint?.lighting ?? scene.lighting,
      colorMood: cinematicBlueprint?.colorMood ?? scene.colorMood,
      backgroundStyle:
        cinematicBlueprint?.backgroundStyle ?? scene.backgroundStyle,
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
        scenePurpose: scene.purpose,
        sceneDirector: createDirectorMetadata(directedScene, index + 1),
        creativeBrain: input.creativeBrain,
        cinematicDirector: cinematicBlueprint,
        visualSource: isProductProof ? "product" : "stock",
        productProof: isProductProof,
        productAssetUrl,
        productAssetIndex: isProductProof ? productAssetIndex : undefined,
        productClipStartFrame: isProductProof && productAssetIsVideo ? index * 30 : undefined,
        destination: input.destination,
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
  const productName = normalizeText(request.productName, "KWEVORA Content Planner");
  const offerDescription = normalizeText(
    request.offerDescription,
    "A customizable Notion content planning system that turns scattered ideas into an organized, repeatable publishing workflow.",
  );
  const audience = normalizeText(
    request.audience,
    "creators and digital-product sellers who need a simpler way to plan and publish consistent content",
  );
  const productAssetUrls = (request.productAssetUrls ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const approachDirection = request.creativeApproach
    ? APPROACH_DIRECTIONS[request.creativeApproach]
    : APPROACH_DIRECTIONS.emotional_story;

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

  if (productAssetUrls.length === 0) {
    return {
      success: false,
      videoId,
      stage: "planning",
      message: "Upload product screenshots or a screen recording first. KAI will not create a product ad that does not show the real product.",
    };
  }

  let currentStage: ProductionError["stage"] = "planning";

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
      throw new Error("KAI could not generate a content package.");
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
      platform: normalizePlatforms(content.recommendedPlatform)[0],
      candidateLimit: 5,
      productName,
      offerDescription,
      destination: request.destination,
      previousPerformanceInsights: [
        approachDirection,
        `Every scene must clearly support selling ${productName} without unsupported income promises.`,
        "Use premium commercial composition, natural human detail, consistent characters and locations, and no text inside generated images.",
      ],
    });

    const creativePlan = creativeBrain.selectedPlan;
    const selectedConcept = await directGenerativeVideo({
      topic,
      productName,
      offerDescription,
      audience,
      destination: request.destination,
      productAssetCount: productAssetUrls.length,
      creativeApproach: request.creativeApproach ?? "product_demonstration",
      platform: normalizePlatforms(content.recommendedPlatform)[0],
      fallbackConcept: creativeBrain.selectedConcept,
    });
    const selectedCandidate = creativeBrain.candidates.find(
      (candidate) => candidate.id === creativeBrain.selectedCandidateId,
    );
    const minimumQualityScore = Math.max(
      0,
      Math.min(100, request.minimumQualityScore ?? 76),
    );

    if (!selectedCandidate || selectedCandidate.score.total < minimumQualityScore) {
      const score = selectedCandidate?.score.total ?? 0;
      const concerns = selectedCandidate?.concerns.join(" ") || "The concept was incomplete.";
      throw new Error(
        `KAI stopped this video before spending money on assets: creative quality ${score}/100 is below the ${minimumQualityScore}/100 premium gate. ${concerns}`,
      );
    }

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

    const cinematicBlueprints = selectedConcept.plan.scenes.map(
      (scene, index) =>
        directCinematicScene({
          topic,
          objective: mission.mission.objective ?? DEFAULT_OBJECTIVE,
          audience: selectedConcept.plan.audience,
          narration: scene.narration || scene.onScreenText || scene.visual,
          sceneNumber: index + 1,
          totalScenes: selectedConcept.plan.scenes.length,
        }),
    );

    const imageUrlsBySceneId = new Map<string, string>();

    currentStage = "packaging";

    updateProductionProgress({
      videoId,
      stage: "packaging",
      message: "KAI is assembling the production package.",
      completed: 0,
      total: 1,
    });

    const hashtags = normalizeHashtags(content.hashtags);
    const recommendedPlatforms = normalizePlatforms(
      content.recommendedPlatform,
    );
    const objective = normalizeText(
      mission.mission.objective,
      DEFAULT_OBJECTIVE,
    );
    const reasoning = normalizeText(
      selectedConcept.reason,
      mission.mission.reason,
    );

    const scenes = createProductionScenes({
      videoId,
      productName,
      creativeScenes: selectedConcept.plan.scenes,
      directedScenes,
      imageUrlsBySceneId,
      hashtags,
      thumbnailTitle: creativePlan.title,
      thumbnailPrompt: selectedConcept.plan.thumbnailIdea,
      audience: selectedConcept.plan.audience,
      objective,
      callToAction: selectedConcept.plan.callToAction,
      destination: request.destination ?? "",
      musicMood: selectedConcept.plan.musicStyle,
      confidence: selectedConcept.confidence,
      reasoning,
      cinematicBlueprints,
      productAssetUrls,
      creativeBrain: {
        productName,
        offerDescription,
        audience,
        destination: request.destination ?? "",
        creativeApproach: request.creativeApproach ?? "emotional_story",
        minimumQualityScore,
        selectedCandidateId: creativeBrain.selectedCandidateId,
        recommendation: creativeBrain.recommendation,
        selectedScore: selectedCandidate.score,
        candidateScores: creativeBrain.candidates.map((candidate) => ({
          id: candidate.id,
          objective: candidate.objective,
          conceptName: candidate.concept.name,
          score: candidate.score,
          strengths: candidate.strengths,
          concerns: candidate.concerns,
        })),
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

    logger(`Presenter selected: ${presenterDirection.presenter.name}.`);

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

    logger(`Voice selected: ${voiceDirection.voice.name}.`);

    logger("Generating narration audio.");

    const voiceGeneration = await generatePlannedVoice({
      videoId,
      voiceDirection,
    });

    if (!voiceGeneration.success || !voiceGeneration.audioUrl) {
      throw new Error(
        `Chatterbox narration is required before KAI may render this video. ${voiceGeneration.message}`,
      );
    }
    logger(`Chatterbox narration generated: ${voiceGeneration.audioUrl}.`);

    logger("Faceless production mode selected; KAI will not generate a presenter.");

    const finalPresenter = {
      ...presenterDirection,
      presenterAudioUrl: voiceGeneration.audioUrl,
      status: "planned" as const,
    };

    const scenesForMotion = scenes;

    logger("KAI is selecting fresh, commercially usable vertical motion footage.");
    let motion;
    try {
      motion = await generateMotionScenes({
        videoId,
        productName,
        audience,
        creativeApproach: request.creativeApproach ?? "product_demonstration",
        productAssetUrls,
        openArtAccessToken: request.openArtAccessToken,
        scenes: scenesForMotion,
        logger,
      });
    } catch (error) {
      const motionFailure = getErrorMessage(error);
      logger(
        "Free context footage is unavailable. KAI switched automatically to a product-first demonstration.",
      );
      const fallbackScenes = createProductFirstFallback(scenesForMotion, productAssetUrls);
      motion = {
        scenes: fallbackScenes,
        generated: fallbackScenes.filter(
          (scene) => scene.metadata?.motionGenerated === true,
        ).length,
        failures: [motionFailure],
      };
    }
    const contextScenes = motion.scenes.filter(
      (scene) => scene.metadata?.productProof !== true,
    );
    const incompleteContextScenes = contextScenes.filter(
      (scene) =>
        !scene.videoUrl &&
        scene.metadata?.designedFacelessMotion !== true,
    );
    if (incompleteContextScenes.length > 0) {
      throw new Error(
        `KAI could not create verified motion for ${incompleteContextScenes.length} context scene(s).`,
      );
    }
    const designedMotionCount = contextScenes.filter(
      (scene) => scene.metadata?.designedFacelessMotion === true,
    ).length;
    const realMotionCount = contextScenes.length - designedMotionCount;
    logger(
      `Verified context motion: ${realMotionCount} real-footage/presenter scene(s) and ${designedMotionCount} KAI-designed Remotion scene(s); ${motion.scenes.length - contextScenes.length} real product-proof scene(s).`,
    );

    const scenesWithVoice = motion.scenes.map((scene) => ({
      ...scene,
      voiceAudioUrl: voiceGeneration.audioUrl,
      metadata: {
        ...scene.metadata,
        premiumMotionCoverage: `${motion.generated}/${scenes.length}`,
        motionFailures: motion.failures,
        motionAudioEnabled: false,
      },
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

    logger("KAI is composing a new local campaign soundtrack.");
    const originalMusic = await generateLocalSoundtrack({
      videoId,
      productName,
      audience,
      creativeApproach: request.creativeApproach ?? "product_demonstration",
      mood: musicDirection.mood,
      energy: musicDirection.energy,
      durationSeconds: calculateEstimatedLengthSeconds(selectedConcept.plan.scenes),
      scenes: scenesWithVoice,
    });

    let productionPackage: VideoProductionPackage = {
      title: creativePlan.title,
      hook: selectedConcept.plan.hook,
      thumbnailTitle: creativePlan.title,
      thumbnailPrompt: selectedConcept.plan.thumbnailIdea,
      caption: content.caption,
      hashtags,
      cta: selectedConcept.plan.callToAction,
      audience: selectedConcept.plan.audience,
      objective,
      reasoning,
      confidence: selectedConcept.confidence,
      estimatedLengthSeconds: calculateEstimatedLengthSeconds(
        selectedConcept.plan.scenes,
      ),
      recommendedPlatforms,
      musicMood: musicDirection.mood,
      music: originalMusic,
      presenter: finalPresenter,
      voice: voiceGeneration.voice,
      scenes: scenesWithVoice,
    };

    productionPackage = await directAdaptiveVideo({
      productionPackage,
      adaptiveCreation: request.adaptiveCreation,
      videoExperiment: request.videoExperiment,
      creativeWinner: request.creativeWinner,
      creativePortfolio: request.creativePortfolio,
    });

    if (!voiceGeneration.durationSeconds) {
      throw new Error("KAI could not verify the complete narration duration.");
    }

    productionPackage = {
      ...productionPackage,
      estimatedLengthSeconds: Math.ceil(voiceGeneration.durationSeconds + 1.25),
      scenes: repairPremiumVideoPackage({
        scenes: fitScenesToNarration(
          productionPackage.scenes,
          voiceGeneration.durationSeconds,
        ),
      }),
    };

    enforcePremiumVideoQuality({
      scenes: productionPackage.scenes,
      music: productionPackage.music,
      narrationDurationSeconds: voiceGeneration.durationSeconds,
    });

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
