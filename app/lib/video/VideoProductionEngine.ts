import {
  markProductionCompleted,
  markProductionFailed,
  updateProductionProgress,
} from "./ProgressTracker";
import { renderProductionVideo } from "./RenderManager";
import { directVideoVoice } from "./VoiceDirector";
import { generatePlannedVoice } from "./VoiceGenerationService";
import { generateLocalSoundtrack } from "./LocalSoundtrackService";
import {
  buildProvenProductAdTemplate,
  validateProvenProductAdTemplate,
} from "./ProvenProductAdTemplate";

import type {
  ProductionError,
  ProductionLogger,
  ProductionRequest,
  ProductionResult,
} from "./productionTypes";

const KWEVORA_CONTENT_PLANNER_ASSETS = [
  "/product-assets/kwevora-content-planner/hero.png",
  "/product-assets/kwevora-content-planner/dashboard.jpg",
  "/product-assets/kwevora-content-planner/calendar.jpg",
  "/product-assets/kwevora-content-planner/ideas.jpg",
] as const;

function normalizeText(value: string | undefined, fallback = "") {
  const cleaned = value?.trim();
  return cleaned || fallback;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "KAI could not complete deterministic video production.";
}

function resolveProductAssets(productName: string, requested?: string[]) {
  const supplied = (requested ?? []).map((asset) => asset.trim()).filter(Boolean);
  if (supplied.length >= 4) return supplied;
  if (/kwevora\s+content\s+planner/i.test(productName)) return [...KWEVORA_CONTENT_PLANNER_ASSETS];
  return supplied;
}

export type VideoProductionEngineOptions = {
  logger?: ProductionLogger;
};

export async function produceVideo(
  request: ProductionRequest,
  options: VideoProductionEngineOptions = {},
): Promise<ProductionResult | ProductionError> {
  const videoId = request.videoId.trim();
  const productName = normalizeText(request.productName, "KWEVORA Content Planner");
  const offerDescription = normalizeText(
    request.offerDescription,
    "A Notion content planner that organizes goals, ideas, calendars, captions, files, and publishing status.",
  );
  const audience = normalizeText(
    request.audience,
    "creators and digital-product sellers who need a simpler content workflow",
  );
  const destination = normalizeText(request.destination);
  const productAssetUrls = resolveProductAssets(productName, request.productAssetUrls);
  const logger = options.logger ?? ((message: string) => console.log(`[${videoId}] ${message}`));

  if (!videoId) {
    return { success: false, videoId, stage: "planning", message: "A video ID is required." };
  }

  let currentStage: ProductionError["stage"] = "planning";

  try {
    updateProductionProgress({
      videoId,
      stage: "planning",
      message: "KAI is loading the proven product-ad template.",
      completed: 0,
      total: 1,
      currentItem: productName,
    });

    logger("Building the locked 30-second product-proof sequence.");
    let productionPackage = buildProvenProductAdTemplate({
      videoId,
      productName,
      offerDescription,
      audience,
      destination,
      productAssetUrls,
    });
    validateProvenProductAdTemplate(productionPackage);
    updateProductionProgress({
      videoId,
      stage: "planning",
      message: "Template and product proof verified.",
      completed: 1,
      total: 1,
      currentItem: "8 locked scenes · 4 real planner assets · 30 seconds",
    });

    currentStage = "directing";
    const script = productionPackage.scenes.map((scene) => scene.narration).filter(Boolean).join(" ");
    const voiceDirection = directVideoVoice({
      title: productionPackage.title,
      hook: productionPackage.hook,
      script,
      topic: request.topic,
      audience,
      objective: productionPackage.objective,
      emotion: "confident",
      platform: "TikTok",
    });

    logger("Generating one narration master before rendering.");
    const voiceGeneration = await generatePlannedVoice({ videoId, voiceDirection });
    if (!voiceGeneration.success || !voiceGeneration.audioUrl || !voiceGeneration.durationSeconds) {
      throw new Error(`Narration could not be completed. ${voiceGeneration.message}`);
    }

    validateProvenProductAdTemplate(productionPackage, voiceGeneration.durationSeconds);
    const scenesWithVoice = productionPackage.scenes.map((scene) => ({
      ...scene,
      voiceAudioUrl: voiceGeneration.audioUrl,
      metadata: {
        ...scene.metadata,
        narrationMasterDurationSeconds: voiceGeneration.durationSeconds,
        narrationFinishesBeforeEnding: true,
      },
    }));

    logger("Composing the campaign soundtrack locally.");
    const music = await generateLocalSoundtrack({
      videoId,
      productName,
      audience,
      creativeApproach: "proven-product-demonstration-template",
      mood: "confident",
      energy: "medium",
      durationSeconds: 30,
      scenes: scenesWithVoice,
    });

    productionPackage = {
      ...productionPackage,
      voice: voiceGeneration.voice,
      music,
      scenes: scenesWithVoice,
    };
    validateProvenProductAdTemplate(productionPackage, voiceGeneration.durationSeconds);

    currentStage = "rendering";
    updateProductionProgress({
      videoId,
      stage: "rendering",
      message: "Rendering the verified template once.",
      completed: 0,
      total: 1,
      currentItem: productionPackage.title,
    });
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
    logger("Deterministic product ad completed without regeneration attempts.");
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
    return { success: false, videoId, stage: currentStage, message };
  }
}
