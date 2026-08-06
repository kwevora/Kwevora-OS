import type {
  VideoCameraMovement,
  VideoCameraShot,
  VideoSceneTransition,
} from "../../remotion/types";

export type CinematicBlueprint = {
  emotion: string;
  visualStory: string;

  cameraShot: VideoCameraShot;
  cameraMovement: VideoCameraMovement;
  transition: VideoSceneTransition;

  lighting: string;
  colorMood: string;
  backgroundStyle: string;

  pacing: "slow" | "medium" | "fast";

  imageStyle: string;
  imagePromptPrefix: string;

  reason: string;
};

export type CinematicRequest = {
  topic: string;
  objective: string;
  audience: string;

  narration: string;

  sceneNumber: number;
  totalScenes: number;
};

function normalize(
  value: string,
): string {
  return value.trim().toLowerCase();
}

export function directCinematicScene(
  request: CinematicRequest,
): CinematicBlueprint {
  const text = normalize(
    `${request.topic}
     ${request.objective}
     ${request.narration}`,
  );

  if (
    text.includes("paycheck") ||
    text.includes("freedom") ||
    text.includes("financial")
  ) {
    return {
      emotion: "hope",

      visualStory:
        "Show the contrast between today's struggle and tomorrow's freedom.",

      cameraShot: "wide",

      cameraMovement:
        "slow-push-in",

      transition:
        "cross-dissolve",

      lighting:
        "golden hour",

      colorMood:
        "warm",

      backgroundStyle:
        "cinematic",

      pacing: "medium",

      imageStyle:
        "ultra realistic cinematic photography",

      imagePromptPrefix:
        "Ultra realistic cinematic photograph, dramatic composition, 85mm lens, shallow depth of field, premium commercial quality, natural lighting",

      reason:
        "Financial transformation should feel hopeful instead of salesy.",
    };
  }

  if (
    text.includes("warning") ||
    text.includes("mistake") ||
    text.includes("danger")
  ) {
    return {
      emotion: "tension",

      visualStory:
        "Create urgency before revealing the solution.",

      cameraShot:
        "close-up",

      cameraMovement:
        "slow-push-in",

      transition:
        "fade",

      lighting:
        "moody",

      colorMood:
        "dark",

      backgroundStyle:
        "cinematic",

      pacing: "slow",

      imageStyle:
        "dramatic cinematic realism",

      imagePromptPrefix:
        "Dark cinematic realism, dramatic shadows, volumetric lighting, realistic human emotion, premium movie still",

      reason:
        "Suspense increases viewer retention.",
    };
  }

  return {
    emotion: "confidence",

    visualStory:
      "Show progress and forward momentum.",

    cameraShot:
      "medium",

    cameraMovement:
      "push-in",

    transition:
      "fade",

    lighting:
      "natural",

    colorMood:
      "neutral",

    backgroundStyle:
      "cinematic",

    pacing: "medium",

    imageStyle:
      "photorealistic",

    imagePromptPrefix:
      "Ultra realistic cinematic photography, premium advertising quality",

    reason:
      "Balanced cinematic direction.",
  };
}