import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import SceneRenderer from "./SceneRenderer";
import {
  KwevoraVideoProps,
  VideoScene,
} from "./types";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

function publicFileUrl(
  url: string,
): string {
  return staticFile(
    url.replace(/^\/+/, ""),
  );
}

export default function KwevoraVideo({
  title,
  scenes,
  brand = "KWEVORA",
  music,
  voice,
}: KwevoraVideoProps) {
  const frame = useCurrentFrame();

  const {
    fps,
    width,
    height,
  } = useVideoConfig();

  const fallbackScene: VideoScene = {
    id: "fallback",

    text:
      title ||
      "One Step Closer.",

    supportingText:
      "KAI is preparing your next move.",

    durationInFrames: 150,

    backgroundColor: "#050505",

    cameraShot: "medium",

    cameraMovement:
      "slow-push-in",

    transition: "fade",

    emotion: "confident",

    lighting: "cinematic",

    colorMood: "dark",

    backgroundStyle:
      "cinematic-gradient",

    textPosition: "center",

    visual:
      "Dark cinematic background",

    visualPrompt:
      "Dark cinematic background with subtle lighting",

    imageUrl: undefined,

    videoUrl: undefined,

    bRollKeywords: [
      "cinematic",
      "motivation",
    ],

    cta: "One Step Closer",

    hashtags: ["KWEVORA"],
  };

  const safeScenes =
    Array.isArray(scenes) &&
    scenes.length > 0
      ? scenes
      : [fallbackScene];

  const totalDurationInFrames =
    safeScenes.reduce(
      (total, scene) =>
        total +
        Math.max(
          1,
          scene.durationInFrames,
        ),
      0,
    );

  let activeSceneIndex = 0;
  let activeSceneStart = 0;
  let accumulatedFrames = 0;

  for (
    let index = 0;
    index < safeScenes.length;
    index += 1
  ) {
    const sceneDuration =
      Math.max(
        1,
        safeScenes[index]
          .durationInFrames,
      );

    if (
      frame >= accumulatedFrames &&
      frame <
        accumulatedFrames +
          sceneDuration
    ) {
      activeSceneIndex = index;

      activeSceneStart =
        accumulatedFrames;

      break;
    }

    accumulatedFrames +=
      sceneDuration;

    if (
      index ===
      safeScenes.length - 1
    ) {
      activeSceneIndex = index;

      activeSceneStart =
        accumulatedFrames -
        sceneDuration;
    }
  }

  const currentScene =
    safeScenes[
      activeSceneIndex
    ];

  const narrationUrl =
    voice?.audioUrl ??
    safeScenes.find(
      (scene) =>
        typeof scene.voiceAudioUrl ===
          "string" &&
        scene.voiceAudioUrl.trim(),
    )?.voiceAudioUrl;

  const hasNarration =
    typeof narrationUrl === "string" &&
    narrationUrl.trim().length > 0;

  const requestedMusicVolume =
    typeof music?.volume === "number"
      ? Math.min(
          1,
          Math.max(
            0,
            music.volume,
          ),
        )
      : 0.22;

  const baseMusicVolume =
    hasNarration
      ? Math.min(
          requestedMusicVolume,
          0.12,
        )
      : requestedMusicVolume;

  const fadeInFrames = Math.max(
    1,
    Math.round(
      (music?.fadeInSeconds ??
        1.5) * fps,
    ),
  );

  const fadeOutFrames = Math.max(
    1,
    Math.round(
      (music?.fadeOutSeconds ??
        2) * fps,
    ),
  );

  const musicVolume = (
    currentFrame: number,
  ): number => {
    const fadeInVolume =
      interpolate(
        currentFrame,
        [0, fadeInFrames],
        [0, baseMusicVolume],
        clamp,
      );

    const fadeOutStart =
      Math.max(
        0,
        totalDurationInFrames -
          fadeOutFrames,
      );

    const fadeOutVolume =
      interpolate(
        currentFrame,
        [
          fadeOutStart,
          totalDurationInFrames,
        ],
        [
          baseMusicVolume,
          0,
        ],
        clamp,
      );

    return Math.min(
      fadeInVolume,
      fadeOutVolume,
    );
  };

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",

        backgroundColor:
          currentScene
            .backgroundColor ??
          "#050505",
      }}
    >
      {music?.url ? (
        <Audio
          src={publicFileUrl(
            music.url,
          )}
          volume={musicVolume}
          startFrom={Math.max(
            0,
            Math.round(
              (music.startFromSeconds ??
                0) * fps,
            ),
          )}
          loop={
            music.loop ?? true
          }
        />
      ) : null}

      {hasNarration ? (
        <Audio
          src={publicFileUrl(
            narrationUrl,
          )}
          volume={1}
        />
      ) : null}

      <SceneRenderer
        scene={currentScene}
        title={title}
        brand={brand}
        localFrame={
          frame -
          activeSceneStart
        }
        sceneDuration={
          currentScene
            .durationInFrames
        }
        sceneIndex={
          activeSceneIndex
        }
        totalScenes={
          safeScenes.length
        }
        fps={fps}
        width={width}
        height={height}
      />
    </AbsoluteFill>
  );
}