import { NextRequest, NextResponse } from "next/server";

import { produceVideo } from "../../../lib/video/VideoProductionEngine";
import { growthPlanAuthorizationEngine } from "../../../lib/GrowthPlanAuthorizationEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_TOPIC = "Help people escape the paycheck-to-paycheck lifestyle";

function getTopic(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return DEFAULT_TOPIC;
}

function getOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getCreativeApproach(value: unknown) {
  return value === "emotional_story" ||
    value === "problem_solution" ||
    value === "product_demonstration"
    ? value
    : undefined;
}

function getProductAssetUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "KAI Video Production Engine is ready.",
    release: "9.10.1",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const topic = getTopic(body.topic);

    const executionPlanId =
      typeof body.executionPlanId === "string"
        ? body.executionPlanId.trim()
        : "";
    const authorization = executionPlanId
      ? await growthPlanAuthorizationEngine.decision(
          executionPlanId,
          "produce_video",
        )
      : {
          allowed: true,
          reason: "The owner directly requested this Video Studio production.",
          ownerApprovalRequired: false,
        };
    if (!authorization.allowed) {
      return NextResponse.json(
        {
          success: false,
          authorization,
          error: authorization.reason,
          release: "9.10.1",
          generatedAt: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    const videoId = crypto.randomUUID();

    const result = await produceVideo({
      videoId,
      topic,
      productName: getOptionalText(body.productName),
      offerDescription: getOptionalText(body.offerDescription),
      audience: getOptionalText(body.audience),
      destination: getOptionalText(body.destination),
      productAssetUrls: getProductAssetUrls(body.productAssetUrls),
      creativeApproach: getCreativeApproach(body.creativeApproach),
      minimumQualityScore:
        typeof body.minimumQualityScore === "number"
          ? body.minimumQualityScore
          : 76,
      adaptiveCreation:
        body.adaptiveCreation && typeof body.adaptiveCreation === "object"
          ? body.adaptiveCreation
          : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          videoId: result.videoId,
          stage: result.stage,
          error: result.message,
          release: "9.10.1",
          generatedAt: new Date().toISOString(),
        },
        {
          status: 500,
        },
      );
    }

    const productionPackage = result.productionPackage;

    const firstScene = productionPackage.scenes[0];

    const directedSceneCount = productionPackage.scenes.filter(
      (scene) =>
        scene.metadata?.sceneDirector &&
        typeof scene.metadata.sceneDirector === "object" &&
        scene.metadata.sceneDirector !== null &&
        "status" in scene.metadata.sceneDirector &&
        scene.metadata.sceneDirector.status === "directed",
    ).length;

    return NextResponse.json({
      success: true,

      video: {
        id: result.videoId,

        status: "ready_for_review",

        title: productionPackage.title,

        idea: topic,

        hook: productionPackage.hook,

        script: productionPackage.scenes
          .map((scene) => scene.narration || scene.text)
          .filter(Boolean)
          .join("\n\n"),

        caption: productionPackage.caption,

        hashtags: productionPackage.hashtags,

        thumbnailIdea: productionPackage.thumbnailPrompt,

        thumbnailTitle: productionPackage.thumbnailTitle,

        thumbnailPrompt: productionPackage.thumbnailPrompt,

        callToAction: productionPackage.cta,

        destination: getOptionalText(body.destination) ?? "",

        recommendedPlatform:
          productionPackage.recommendedPlatforms[0] ?? "TikTok",

        recommendedPlatforms: productionPackage.recommendedPlatforms,

        publishingRecommendation: `Review and approve this video for ${
          productionPackage.recommendedPlatforms[0] ?? "your selected platform"
        }.`,

        selectedConcept: {
          id: result.videoId,
          name: productionPackage.title,
          confidence: productionPackage.confidence,
          reason: productionPackage.reasoning,
        },

        alternateConcepts: productionPackage.scenes[0]?.metadata?.creativeBrain &&
          typeof productionPackage.scenes[0].metadata.creativeBrain === "object" &&
          productionPackage.scenes[0].metadata.creativeBrain !== null &&
          "candidateScores" in productionPackage.scenes[0].metadata.creativeBrain &&
          Array.isArray(productionPackage.scenes[0].metadata.creativeBrain.candidateScores)
            ? productionPackage.scenes[0].metadata.creativeBrain.candidateScores.slice(1)
            : [],

        qualityScore:
          productionPackage.scenes[0]?.metadata?.creativeBrain &&
          typeof productionPackage.scenes[0].metadata.creativeBrain === "object" &&
          productionPackage.scenes[0].metadata.creativeBrain !== null &&
          "selectedScore" in productionPackage.scenes[0].metadata.creativeBrain
            ? productionPackage.scenes[0].metadata.creativeBrain.selectedScore
            : undefined,

        audience: productionPackage.audience,

        objective: productionPackage.objective,

        emotion: firstScene?.emotion ?? "",

        confidence: productionPackage.confidence,

        reason: productionPackage.reasoning,

        reasoning: productionPackage.reasoning,

        visualStyle: firstScene?.backgroundStyle ?? "",

        musicStyle: productionPackage.musicMood ?? firstScene?.musicMood ?? "",

        captionStyle:
          "Large, readable captions with one clear message per scene.",

        scenes: productionPackage.scenes,

        productionPackage,

        videoDirection: productionPackage.videoDirection,

        sceneDirector: {
          status: directedSceneCount > 0 ? "completed" : "fallback_used",

          directedSceneCount,

          totalSceneCount: productionPackage.scenes.length,
        },

        videoUrl: result.render.videoUrl,

        thumbnailUrl: "",

        renderStatus: "ready",

        durationInSeconds: productionPackage.estimatedLengthSeconds,
      },

      release: "9.10.1",
      authorization,

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Video generation failed:", error);

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Video generation failed.",

        release: "9.10.1",

        generatedAt: new Date().toISOString(),
      },
      {
        status: 500,
      },
    );
  }
}
