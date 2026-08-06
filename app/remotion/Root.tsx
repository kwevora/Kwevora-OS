import React from "react";
import {
  Composition,
  type CalculateMetadataFunction,
} from "remotion";

import KwevoraVideo from "./KwevoraVideo";

import type {
  KwevoraVideoProps,
  VideoScene,
} from "./types";

const demoScenes: VideoScene[] = [
  {
    id: "1",
    text: "You're closer than you think.",
    supportingText:
      "Every successful journey begins with one decision.",
    durationInFrames: 150,
    backgroundColor: "#050505",
    visual:
      "Construction worker watching the sunrise",
    visualPrompt:
      "A cinematic construction worker standing beside a work truck at sunrise, golden hour lighting, realistic, dramatic, shallow depth of field",
    bRollKeywords: [
      "sunrise",
      "construction",
      "truck",
      "coffee",
    ],
    cameraShot: "wide",
    cameraMovement: "slow-push-in",
    transition: "fade",
    emotion: "hope",
    lighting: "golden",
    colorMood: "warm",
    backgroundStyle: "cinematic",
    textPosition: "center",
  },
  {
    id: "2",
    text: "Most people quit too early.",
    supportingText:
      "Consistency beats intensity.",
    durationInFrames: 150,
    backgroundColor: "#111827",
    visual:
      "Worker tying boots before work",
    visualPrompt:
      "Close-up of worn work boots being tied before sunrise, cinematic realism",
    bRollKeywords: [
      "boots",
      "work",
      "morning",
    ],
    cameraShot: "close-up",
    cameraMovement: "pan-right",
    transition: "cross-dissolve",
    emotion: "determined",
    lighting: "dramatic",
    colorMood: "orange",
    backgroundStyle: "cinematic",
    textPosition: "lower-third",
  },
  {
    id: "3",
    text: "Keep moving forward.",
    supportingText:
      "One step every day compounds into success.",
    durationInFrames: 150,
    backgroundColor: "#1E293B",
    visual:
      "Walking toward sunrise",
    visualPrompt:
      "Silhouette walking toward sunrise through light fog, cinematic realism",
    bRollKeywords: [
      "walking",
      "sunrise",
      "hope",
    ],
    cameraShot: "medium",
    cameraMovement: "tracking",
    transition: "flash",
    emotion: "confident",
    lighting: "golden",
    colorMood: "warm",
    backgroundStyle: "cinematic",
    textPosition: "center",
  },
  {
    id: "4",
    text: "One Step Closer.",
    supportingText:
      "Powered by KAI.",
    durationInFrames: 150,
    backgroundColor: "#000000",
    visual:
      "Minimal cinematic logo reveal",
    visualPrompt:
      "Dark premium cinematic background with subtle particles and dramatic lighting",
    bRollKeywords: [
      "logo",
      "technology",
      "future",
    ],
    cameraShot: "medium",
    cameraMovement: "slow-push-in",
    transition: "fade",
    emotion: "confident",
    lighting: "cinematic",
    colorMood: "dark",
    backgroundStyle: "premium",
    textPosition: "center",
  },
];

const calculateMetadata: CalculateMetadataFunction<
  KwevoraVideoProps
> = ({ props }) => {
  const scenes =
    Array.isArray(props.scenes) &&
    props.scenes.length > 0
      ? props.scenes
      : demoScenes;

  const sceneDuration = scenes.reduce(
    (total, scene) =>
      total +
      Math.max(
        1,
        scene.durationInFrames,
      ),
    0,
  );

  return {
    durationInFrames:
      Math.max(
        30,
        sceneDuration,
      ),
  };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="KwevoraVideo"
      component={KwevoraVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={
        calculateMetadata
      }
      defaultProps={{
        title: "KWEVORA",
        scenes: demoScenes,
        brand: "KWEVORA",
      }}
    />
  );
};